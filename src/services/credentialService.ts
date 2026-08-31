import {prisma} from '../utils/db';
import { encryptCredential } from '../utils/crypto';

export class CredentialService{
    static async saveApiKey(orgId: string, name: string, apiKey: string) {
        // Check if a credential for this name already exists in the organization
        const existing = await prisma.credential.findFirst({
            where: {
                organizationId: orgId,
                name,
            },
        });

        if (existing) {
            throw new Error(`A credential for '${name}' already exists. Please delete the existing credential first before saving a new one.`);
        }

        const cleanApiKey = apiKey.trim();
        const encryptedData = encryptCredential(cleanApiKey);

        return await prisma.credential.create({
            data: {
                name,
                encryptedData,
                organizationId: orgId,
            },
        });
    }

    static async deleteCredential(orgId: string, id: string) {
        const credential = await prisma.credential.findFirst({
            where: {
                id,
                organizationId: orgId,
            },
        });

        if (!credential) {
            throw new Error('Credential not found or access denied.');
        }

        return await prisma.credential.delete({
            where: { id },
        });
    }

    static async listCredentials(orgId: string) {
        return await prisma.credential.findMany({
            where: {
                organizationId: orgId,
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}