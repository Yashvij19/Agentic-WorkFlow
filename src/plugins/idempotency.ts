import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/db';

export const idempotencyPulgins: FastifyPluginAsync = fp(async (server, options) => {

    // HOOK 1: Before the route executes
    server.addHook("preHandler", async (request, reply) => {
        // 1. We only care about POST requests (where data is being created/executed)
        if (request.method !== 'POST') {
            return;
        }

        const idempotencyKey = request.headers['idempotency-key'] as string;
        if (!idempotencyKey) return;

        // Ensure user is authenticated with a valid organization before applying tenant-scoped idempotency
        const orgId = (request as any).user?.organizationId;
        if (!orgId) return;

        // 2. Scope the idempotency key by organization to guarantee strict multi-tenant isolation
        const scopedKey = `${orgId}:${idempotencyKey}`;

        const existingRecord = await prisma.idempotencyKey.findUnique({
            where: { id: scopedKey }
        });

        if (existingRecord) {
            if (existingRecord.responseBody) {
                // We already finished this job previously! Return the cached result instantly.
                server.log.info(`Idempotency cache hit for key: ${idempotencyKey} (org: ${orgId})`);
                reply.code(200).send(existingRecord.responseBody);
                return reply;
            } else {
                // The key exists but has no response yet. This means another worker is currently processing it!
                reply.code(409).send({ error: 'Conflict: This request is currently being processed.' });
                return reply;
            }
        }

        // 3. If the key is totally new, create a blank placeholder in the database
        try {
            await prisma.idempotencyKey.create({
                data: {
                    id: scopedKey,
                    organizationId: orgId,
                }
            });
        } catch (err: any) {
            // In case of high concurrency where two requests with same key arrive at the same millisecond
            server.log.warn(`Concurrent idempotency key creation for ${scopedKey}: ${err.message}`);
        }
    });

    // HOOK 2: After the route finishes, right before sending the response to the user
    server.addHook('onSend', async (request, reply, payload) => {
        if (request.method !== 'POST') return payload;

        const idempotencyKey = request.headers['idempotency-key'] as string;
        const orgId = (request as any).user?.organizationId;
        if (!idempotencyKey || !orgId || reply.statusCode >= 400) return payload; // Don't cache errors or non-org requests

        const scopedKey = `${orgId}:${idempotencyKey}`;

        try {
            let parsedBody: any;
            try {
                parsedBody = typeof payload === 'string' ? JSON.parse(payload) : payload;
            } catch {
                parsedBody = { raw: payload };
            }

            await prisma.idempotencyKey.update({
                where: { id: scopedKey },
                data: { responseBody: parsedBody }
            });
        } catch (err: any) {
            server.log.warn(`Failed to update idempotency key ${scopedKey}: ${err.message}`);
        }

        return payload;
    });

});