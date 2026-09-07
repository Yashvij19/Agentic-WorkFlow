import crypto, { randomBytes } from 'crypto';
import { prisma } from '../utils/db';
import { validatePassword } from '../utils/validation';
import { encryptCredential, decryptCredential } from '../utils/crypto';
import { 
    generateTotpSecret, 
    generateTotpUri, 
    verifyTotpCode, 
    generateBackupCodes, 
    hashBackupCode, 
    verifyAndBurnBackupCode 
} from '../utils/totp';

const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEYLEN = 64; // 64 bytes = 512 bits
const PBKDF2_DIGEST = 'sha512';

export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    return `v2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || typeof storedHash !== 'string') return false;
    const parts = storedHash.split(':');

    // Modern format: "v2:<iterations>:<salt>:<hash>"
    if (parts.length === 4 && parts[0] === 'v2') {
        const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
        const salt = parts[2];
        const hash = parts[3];
        const checkHash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
        } catch {
            return false;
        }
    }

    // Legacy format: "<salt>:<hash>" (1,000 iterations, 6 bytes)
    if (parts.length === 2) {
        const [salt, hash] = parts;
        const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 6, 'sha512').toString('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
        } catch {
            return hash === checkHash;
        }
    }

    return false;
}

export class AuthService{
    static async register(params: {
        email: string,
        passwordPlain: string,
        orgRole?: 'ADMIN' | 'MEMBER';
        registrationType: 'SINGLE' | 'ORGANIZATION';
        orgName?: string,
        address?: string,
        inviteToken?: string
    }
    ) {

        const { email, passwordPlain, orgRole, registrationType, orgName, address, inviteToken } = params;
        const cleanEmail = (email || '').trim().toLowerCase();

        // 1. Check if email is already registered in User table (case-insensitive)
        const existing = await prisma.user.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: 'insensitive'
                }
            }
        });

        if (existing) {
            throw new Error("User with this email already exists.");
        }

        const passValidation = validatePassword(passwordPlain);
        if (!passValidation.isValid) {
            throw new Error(passValidation.error);
        }

        const passwordHash = hashPassword(passwordPlain);

        // 2. Check if a pending registration request already exists for this email
        const existingRequest = await prisma.registrationRequest.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: 'insensitive'
                }
            }
        });
        if (existingRequest) {
            if (new Date(existingRequest.expiresAt) > new Date()) {
                throw new Error(`A registration request for this email is already pending admin approval. (Request ID: ${existingRequest.id})`);
            }

            // Request is expired, delete it and allow re-registration
            await prisma.registrationRequest.deleteMany({
                where: {
                    email: {
                        equals: cleanEmail,
                        mode: 'insensitive'
                    }
                }
            });
        }

        // Case 1: Single User Registration
        if (registrationType === 'SINGLE') {
            return await prisma.$transaction(async (tx) => {
                const org = await tx.organization.create({
                    data: {
                        name: `${cleanEmail.split('@')[0]}'s Workspace`,
                        address: "NA"
                    }
                });
                const user = await tx.user.create({
                    data: {
                        email: cleanEmail,
                        passwordHash,
                        role: "SINGLE",
                        organizationId: org.id,
                        permissions: {
                            canCreateWorkflow: true,
                            canViewTeamWorkflows: true,
                            canEditTeamWorkflows: true,
                            canRenameTeamWorkflows: true,
                            canExecuteTeamWorkflows: true,
                            canDeleteTeamWorkflows: true,
                            canViewTeamExecutions: true,
                            canViewTeamFailedExecutions: true,
                            canViewDLQ: true,
                            canCreatePersonalKnowledgeBase: true,
                            canChangeOrgKnowledgeBase: true,
                            allowedWorkflowIds: []
                        }
                    }
                });
                return { user, status: "APPROVED" as const };
            });
        }

        // Case 2: Organization Registration
        if (registrationType === 'ORGANIZATION') {
            if (!orgRole) {
                throw new Error("Role (ADMIN or MEMBER) is required for organization registration.");
            }
            // Subcase A: Team Admin
            if (orgRole === 'ADMIN') {
                if (!orgName) {
                    throw new Error("Organization name is required to register as Team Admin.");
                }
                return await prisma.$transaction(async (tx) => {
                    const org = await tx.organization.create({
                        data: {
                            name: orgName,
                            address: address || null
                        }
                    });
                    const user = await tx.user.create({
                        data: {
                            email: cleanEmail,
                            passwordHash,
                            role: 'ADMIN',
                            organizationId: org.id,
                            permissions: {
                                canCreateWorkflow: true,
                                canViewTeamWorkflows: true,
                                canEditTeamWorkflows: true,
                                canRenameTeamWorkflows: true,
                                canExecuteTeamWorkflows: true,
                                canDeleteTeamWorkflows: true,
                                canViewTeamExecutions: true,
                                canViewTeamFailedExecutions: true,
                                canViewDLQ: true,
                                canCreatePersonalKnowledgeBase: true,
                                canChangeOrgKnowledgeBase: true,
                                allowedWorkflowIds: []
                            }
                        }
                    });

                    return { user, status: "APPROVED" as const };
                });
            }
            if (orgRole === "MEMBER") {
                if (!inviteToken) {
                    throw new Error("Invite token is required to register as Team Member.");
                }
                const validToken = await prisma.orgInviteToken.findUnique({
                    where: {
                        token: inviteToken.trim()
                    }
                });
                if (!validToken) {
                    throw new Error("Invalid invite token. Please request a new token from your administrator.");
                }
                if (new Date(validToken.expiresAt) < new Date()) {
                    throw new Error("Invite token has expired. Please request a new token from your administrator.");
                }

                // Create a pending registration request valid for 2 days

                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 2);

                const request = await prisma.registrationRequest.create({
                    data: {
                        email,
                        passwordHash,
                        organizationId: validToken.organizationId,  // orgId in not insert in the token validToken is an databse object of the model orgInviteToken that contian organizationId as column
                        expiresAt
                    }
                });
                return {
                    status: "PENDING" as const,
                    requestId: request.id,
                    expiresAt: request.expiresAt,
                    message: "Invite token verified. Your registration is pending Team Admin approval",
                };

            }
        }
        throw new Error("Invalid registration configuration.");
    }

    static async login(email:string , passwordPlain:string){
        const cleanEmail = (email || '').trim();
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: 'insensitive'
                }
            }
        });
        if(!user){
              // Check if there is a pending registration request for this email
            const pendingRequest = await prisma.registrationRequest.findFirst({
                where: {
                    email: {
                        equals: cleanEmail,
                        mode: 'insensitive'
                    }
                }
            });

            if(pendingRequest){
                if(new Date(pendingRequest.expiresAt)<new Date()){
                    // await prisma.registrationRequest.delete({ where: { email } });
                    throw new Error("Your registration request has expired.");
                }
                throw new Error(`Your registration is pending Team Admin approval. (Request ID: ${pendingRequest.id})`);
            }
            throw new Error("Invalid email or password.");
        }


        const isValid=verifyPassword(passwordPlain , user.passwordHash);

        if (!isValid) {
            throw new Error('Invalid email or password.');
        }
        return user;
    }

    static async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            }
        });

        if (!user) {
            throw new Error("User not found.");
        }

        const rawPermissions = (user.permissions ?? {}) as any;
        let enrichedAllowedWorkflows: any[] = [];

        if (Array.isArray(rawPermissions.allowedWorkflowIds) && rawPermissions.allowedWorkflowIds.length > 0) {
            const ids = rawPermissions.allowedWorkflowIds.map((item: any) => typeof item === 'string' ? item : item.workflowId).filter(Boolean);
            const workflows = await prisma.workflow.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true, status: true }
            });
            const wfMap = new Map(workflows.map(w => [w.id, w]));

            enrichedAllowedWorkflows = rawPermissions.allowedWorkflowIds.map((item: any) => {
                const wfId = typeof item === 'string' ? item : item.workflowId;
                const wf = wfMap.get(wfId);
                if (typeof item === 'string') {
                    return {
                        workflowId: wfId,
                        workflowName: wf?.name || 'Untitled Workflow',
                        canView: true,
                        canExecute: false,
                        canEdit: false,
                        canRename: false,
                        canDelete: false,
                        canViewExecutionLogs: false,
                    };
                }
                return {
                    workflowId: item.workflowId,
                    workflowName: wf?.name || 'Untitled Workflow',
                    canView: item.canView !== false,
                    canExecute: item.canExecute === true,
                    canEdit: item.canEdit === true,
                    canRename: item.canRename === true,
                    canDelete: item.canDelete === true,
                    canViewExecutionLogs: item.canViewExecutionLogs === true,
                };
            });
        }

        // Full explicit permission resolution for ADMIN, SINGLE, and MEMBER
        const isElevated = user.role === 'ADMIN' || user.role === 'SINGLE';
        const resolvedPermissions = isElevated
            ? {
                canCreateWorkflow: true,
                canViewTeamWorkflows: true,
                canEditTeamWorkflows: true,
                canRenameTeamWorkflows: true,
                canExecuteTeamWorkflows: true,
                canDeleteTeamWorkflows: true,
                canViewTeamExecutions: true,
                canViewTeamFailedExecutions: true,
                canViewDLQ: true,
                canCreatePersonalKnowledgeBase: true,
                canChangeOrgKnowledgeBase: true,
                allowedWorkflowIds: [],
                scopedWorkflows: enrichedAllowedWorkflows,
              }
            : {
                canCreateWorkflow: rawPermissions.canCreateWorkflow !== false,
                canViewTeamWorkflows: !!rawPermissions.canViewTeamWorkflows,
                canEditTeamWorkflows: !!rawPermissions.canEditTeamWorkflows,
                canRenameTeamWorkflows: !!rawPermissions.canRenameTeamWorkflows,
                canExecuteTeamWorkflows: !!rawPermissions.canExecuteTeamWorkflows,
                canDeleteTeamWorkflows: !!rawPermissions.canDeleteTeamWorkflows,
                canViewTeamExecutions: !!rawPermissions.canViewTeamExecutions,
                canViewTeamFailedExecutions: !!rawPermissions.canViewTeamFailedExecutions,
                canViewDLQ: !!(rawPermissions.canViewDLQ ?? rawPermissions.canViewTeamFailedExecutions),
                canCreatePersonalKnowledgeBase: !!rawPermissions.canCreatePersonalKnowledgeBase,
                canChangeOrgKnowledgeBase: !!rawPermissions.canChangeOrgKnowledgeBase,
                allowedWorkflowIds: Array.isArray(rawPermissions.allowedWorkflowIds) ? rawPermissions.allowedWorkflowIds : [],
                scopedWorkflows: enrichedAllowedWorkflows,
              };

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || "Workspace",
            permissions: resolvedPermissions,
            isTwoFactorEnabled: !!user.isTwoFactorEnabled,
            remainingBackupCodesCount: Array.isArray(user.backupCodes) ? user.backupCodes.length : 0,
            createdAt: user.createdAt
        };
    }

    static async resetPassword(userId: string, oldPasswordPlain: string, newPasswordPlain: string) {
        const passValidation = validatePassword(newPasswordPlain);
        if (!passValidation.isValid) {
            throw new Error(passValidation.error);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found.");
        }

        const isValid = verifyPassword(oldPasswordPlain, user.passwordHash);
        if (!isValid) {
            throw new Error("Incorrect current password.");
        }

        const newHash = hashPassword(newPasswordPlain);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash }
        });

        return { message: "Password updated successfully." };
    }

    /**
     * Checks if an account exists and whether Two-Factor Authentication is active (case-insensitive).
     */
    static async check2FAStatus(email: string) {
        const cleanEmail = (email || '').trim();
        if (!cleanEmail) {
            return { isTwoFactorEnabled: false };
        }

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: 'insensitive'
                }
            },
            select: { id: true, isTwoFactorEnabled: true }
        });

        if (!user) {
            return { isTwoFactorEnabled: false };
        }

        return { isTwoFactorEnabled: !!user.isTwoFactorEnabled };
    }

    /**
     * Generates a new TOTP secret seed and 5 emergency backup codes for pairing.
     * Encrypts the seed at rest before sending the URI and plaintext codes to the user.
     */
    static async setup2FA(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true }
        });

        if (!user) {
            throw new Error("User not found.");
        }

        const secret = generateTotpSecret();
        const uri = generateTotpUri(user.email, secret);
        const { plainCodes, hashedCodes } = generateBackupCodes(5);

        // Encrypt secret with AES-256-GCM and temporarily store seed with staged backup codes
        const encryptedSecret = encryptCredential(secret);

        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: encryptedSecret,
                backupCodes: hashedCodes,
                // Notice: isTwoFactorEnabled stays false until the user successfully verifies code
            }
        });

        return {
            secret,
            uri,
            backupCodes: plainCodes
        };
    }

    /**
     * Verifies the 6-digit rolling code from Microsoft Authenticator to confirm successful pairing.
     * Once confirmed, activates 2FA on the user's account.
     */
    static async enable2FA(userId: string, code: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, twoFactorSecret: true, isTwoFactorEnabled: true }
        });

        if (!user || !user.twoFactorSecret) {
            throw new Error("2FA setup has not been initiated. Please click 'Enable 2FA' first.");
        }

        const secret = decryptCredential(user.twoFactorSecret);
        const isValid = verifyTotpCode(secret, code);

        if (!isValid) {
            throw new Error("Invalid 6-digit code. Please check Microsoft Authenticator and try again.");
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isTwoFactorEnabled: true }
        });

        return {
            success: true,
            message: "Two-Factor Authentication is now active and protecting your account!"
        };
    }

    /**
     * Disables 2FA on the account. Requires confirming the current password and a valid 2FA code.
     */
    static async disable2FA(userId: string, passwordPlain: string, code: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found.");
        }

        if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
            throw new Error("2FA is not currently enabled on this account.");
        }

        // 1. Verify user's current password
        const isPasswordValid = verifyPassword(passwordPlain, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Incorrect current password.");
        }

        // 2. Verify 2FA code or backup code
        const secret = decryptCredential(user.twoFactorSecret);
        const isTotpValid = verifyTotpCode(secret, code);
        const burnResult = !isTotpValid ? verifyAndBurnBackupCode(code, user.backupCodes) : { isValid: false };

        if (!isTotpValid && !burnResult.isValid) {
            throw new Error("Invalid 6-digit authenticator code or backup recovery code.");
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                isTwoFactorEnabled: false,
                twoFactorSecret: null,
                backupCodes: []
            }
        });

        return {
            success: true,
            message: "Two-Factor Authentication has been successfully disabled."
        };
    }

    /**
     * Regenerates 5 fresh emergency backup recovery codes for a user with active 2FA.
     */
    static async regenerateBackupCodes(userId: string, passwordPlain: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found.");
        }

        if (!user.isTwoFactorEnabled) {
            throw new Error("2FA must be active to regenerate emergency recovery codes.");
        }

        const isPasswordValid = verifyPassword(passwordPlain, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Incorrect current password.");
        }

        const { plainCodes, hashedCodes } = generateBackupCodes(5);

        await prisma.user.update({
            where: { id: userId },
            data: { backupCodes: hashedCodes }
        });

        return {
            backupCodes: plainCodes,
            message: "Fresh emergency backup codes generated. Store them in a safe place!"
        };
    }

    /**
     * Secure self-service password reset protected by Microsoft Authenticator (TOTP)
     * or a one-time emergency Backup Recovery Code.
     */
    static async forgotPasswordWith2FA(email: string, codeOrBackup: string, newPasswordPlain: string) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanCode = (codeOrBackup || '').trim();

        if (!cleanEmail || !cleanCode || !newPasswordPlain) {
            throw new Error("Email, verification code, and new password are required.");
        }

        const passValidation = validatePassword(newPasswordPlain);
        if (!passValidation.isValid) {
            throw new Error(passValidation.error);
        }

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: 'insensitive'
                }
            }
        });

        // If user does not exist or has not enabled 2FA, reject with professional instructions
        if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
            throw new Error(
                "Two-Factor Authentication (2FA) is not enabled on this account. " +
                "Because no secondary verification method is configured, self-service password reset is disabled to protect against unauthorized account takeover. " +
                "Please contact your organization administrator or workspace owner to restore access."
            );
        }

        const secret = decryptCredential(user.twoFactorSecret);

        // 1. Try 6-digit rolling TOTP code
        const isTotpValid = verifyTotpCode(secret, cleanCode);

        // 2. Try emergency backup recovery code
        const burnResult = !isTotpValid ? verifyAndBurnBackupCode(cleanCode, user.backupCodes) : { isValid: false, remainingHashedCodes: user.backupCodes };

        if (!isTotpValid && !burnResult.isValid) {
            throw new Error("Invalid 6-digit authenticator code or emergency recovery code. Please check your Microsoft Authenticator app and try again.");
        }

        const newHash = hashPassword(newPasswordPlain);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newHash,
                // If a backup code was used, burn (delete) that code so it can never be reused
                backupCodes: burnResult.isValid ? burnResult.remainingHashedCodes : user.backupCodes
            }
        });

        return {
            success: true,
            usedBackupCode: burnResult.isValid,
            message: burnResult.isValid
                ? "Password successfully reset using an emergency recovery code! That code has been retired."
                : "Password successfully reset with Microsoft Authenticator! You can now sign in."
        };
    }
}