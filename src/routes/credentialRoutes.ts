import { FastifyInstance } from "fastify";
import { CredentialService } from "../services/credentialService";

const ALLOWED_CREDENTIALS = ['GEMINI_API_KEY'];

export async function credentialRoutes(server: FastifyInstance) {

    server.addHook('preValidation', server.authenticate);
    
    server.post('/api/credentials', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { name, apiKey } = request.body as any;
        const orgId = request.user.organizationId;
        const role = request.user.role;

        if (role !== 'ADMIN' && role !== 'SINGLE') {
            return reply.code(403).send({ error: 'Access Denied: Only organization administrators can configure credentials.' });
        }

        if (!name || !apiKey) {
            return reply.code(400).send({ error: 'Name and apiKey are required.' });
        }

        const trimmedName = typeof name === 'string' ? name.trim() : '';
        if (!ALLOWED_CREDENTIALS.includes(trimmedName)) {
            return reply.code(400).send({ 
                error: `Unsupported credential '${name}'. Currently, only 'GEMINI_API_KEY' is supported by the AI engine.` 
            });
        }

        if (typeof apiKey !== 'string' || apiKey.trim().length < 8 || apiKey.trim().length > 1024) {
            return reply.code(400).send({ 
                error: 'Invalid apiKey format. API secret key must be between 8 and 1024 characters.' 
            });
        }

        try {
            await CredentialService.saveApiKey(orgId, trimmedName, apiKey.trim());
            return reply.code(201).send({ message: `Credential '${trimmedName}' successfully configured.` });
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    server.get('/api/credentials', async (request, reply) => {
        const orgId = request.user.organizationId;
        try {
            const list = await CredentialService.listCredentials(orgId);
            return reply.code(200).send({
                credentials: list 
            });
        } catch (err: any) {
            return reply.code(500).send({ error: err.message });
        }
    });

    server.delete('/api/credentials/:id', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const orgId = request.user.organizationId;
        const role = request.user.role;

        if (role !== 'ADMIN' && role !== 'SINGLE') {
            return reply.code(403).send({ error: 'Access Denied: Only organization administrators can delete credentials.' });
        }

        try {
            await CredentialService.deleteCredential(orgId, id);
            return reply.code(200).send({ message: 'Credential deleted successfully.' });
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });
}