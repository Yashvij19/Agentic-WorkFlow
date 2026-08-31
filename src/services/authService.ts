import crypto, { randomBytes } from 'crypto';
import {prisma} from '../utils/db';
import { emit } from 'cluster';


export function hashPassword(password:string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash=crypto.pbkdf2Sync(password , salt , 1000 , 6,  'sha512').toString('hex');

    return `${salt}:${hash}`

}


export function verifyPassword(password:string , storedHash:string) :boolean{

    const parts=storedHash.split(':');
    if(parts.length!==2) return false;
    const [salt , hash]=parts;
    const checkHash=crypto.pbkdf2Sync(password , salt , 1000 , 6 , 'sha512').toString('hex');
    return hash===checkHash;

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

        // 1. Check if email is already registered in User table
        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) {
            throw new Error("User with this email already exists.")
        }

        const passwordHash = hashPassword(passwordPlain);

        // 2. Check if a pending registration request already exists for this email

        const existingRequest = await prisma.registrationRequest.findUnique({
            where: {
                email
            }
        })
        if (existingRequest) {
            if (new Date(existingRequest.expiresAt) > new Date()) {
                throw new Error(`A registration request for this email is already pending admin approval. (Request ID: ${existingRequest.id})`);
            }

            // Request is expired, delete it and allow re-registration
            await prisma.registrationRequest.delete({
                where: {
                    email
                }
            });
        }

        // Case 1: Single User Registration

        if (registrationType === 'SINGLE') {
            return await prisma.$transaction(async (tx) => {
                const org = await tx.organization.create({
                    data: {
                        name: `${email.split('@')[0]}'s Workspace`,
                        address: "NA"
                    }
                });
                const user = await tx.user.create({
                    data: {
                        email,
                        passwordHash,
                        role: "SINGLE",
                        organizationId: org.id,
                        permissions: {
                            canCreateWorkflow: true,
                            canViewTeamExecutions: false,
                            canViewTeamWorkflows: false,
                            allowedWorkflowIds: []
                        }
                    }
                });
                return { user, status: "APPROVED" as const };
            })
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
                            email,
                            passwordHash,
                            role: 'ADMIN',
                            organizationId: org.id,
                            permissions: {
                                canCreateWorkflow: true,
                                canViewTeamExecutions: true,
                                canViewTeamWorkflows: true,
                                allowedWorkflowIds: []
                            }
                        }

                    });

                    return { user, status: "APPROVED" as const };
                })

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
        const user=await prisma.user.findUnique({
            where:{email}
        });
        if(!user){
              // Check if there is a pending registration request for this email
            const pendingRequest=await prisma.registrationRequest.findUnique({
                where:{
                    email
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

        if(!isValid){
            throw new Error('Invalid password.');
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

        const permissions = (user.permissions ?? {}) as any;
        let enrichedAllowedWorkflows: any[] = [];

        if (Array.isArray(permissions.allowedWorkflowIds) && permissions.allowedWorkflowIds.length > 0) {
            const ids = permissions.allowedWorkflowIds.map((item: any) => typeof item === 'string' ? item : item.workflowId).filter(Boolean);
            const workflows = await prisma.workflow.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true, status: true }
            });
            const wfMap = new Map(workflows.map(w => [w.id, w]));

            enrichedAllowedWorkflows = permissions.allowedWorkflowIds.map((item: any) => {
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

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || "Workspace",
            permissions: {
                ...permissions,
                scopedWorkflows: enrichedAllowedWorkflows,
            },
            createdAt: user.createdAt
        };
    }

    static async resetPassword(userId: string, oldPasswordPlain: string, newPasswordPlain: string) {
        if (!newPasswordPlain || newPasswordPlain.length < 6) {
            throw new Error("New password must be at least 6 characters.");
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

    static async forgotPassword(email: string, newPasswordPlain: string) {
        if (!email || !newPasswordPlain || newPasswordPlain.length < 6) {
            throw new Error("Valid email and a new password with at least 6 characters are required.");
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            throw new Error("No account found with this email address.");
        }

        const newHash = hashPassword(newPasswordPlain);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
        });

        return { message: "Password has been reset successfully. You can now log in with your new password." };
    }
}