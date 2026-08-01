import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/db';
import { request } from 'node:http';

export const idempotencyPulgins:FastifyPluginAsync=fp(async(server , options)=>{

    // HOOK 1: Before the route executes

    server.addHook("preHandler", async(request , reply)=>{

        // 1. We only care about POST requests (where data is being created/executed)

        if(request.method!=='POST'){
            return;
        }

        const idempotencyKey = request.headers['idempotency-key'] as string;

        if(!idempotencyKey)return;

        // 2. Check if we have seen this exact request before
        const existingRecord=await prisma.idempotencyKey.findUnique({
            where:{id:idempotencyKey}
        });

        if(existingRecord){
            if(existingRecord.responseBody){
                // We already finished this job previously! Return the cached result instantly.
                server.log.info(`Idempotency cache hit for key: ${idempotencyKey}`);
                reply.code(200).send(existingRecord.responseBody);
                return reply;
            }else{
                // The key exists but has no response yet. This means another worker is currently processing it!
                reply.code(409).send({ error: 'Conflict: This request is currently being processed.' });
                reply.code(409).send({ error: 'Conflict: This request is currently being processed.' });
                return reply;
            }
        }

        // 3. If the key is totally new, create a blank placeholder in the database
        // Note: request.user comes from the JWT

        await prisma.idempotencyKey.create({
            data:{
                id:idempotencyKey,
                organizationId:request.user.organizationId,
            }
        });

    });

    // HOOK 2: After the route finishes, right before sending the response to the user

    server.addHook('onSend',async(request , reply , payload)=>{

        if (request.method !== 'POST') return payload;

        const idempotencyKey = request.headers['idempotency-key'] as string;
        if (!idempotencyKey || reply.statusCode >= 400) return payload; // Don't cache errors

        await prisma.idempotencyKey.update({
            where: { id: idempotencyKey },
            data: { responseBody: JSON.parse(payload as string) }
            });
        
            return payload;
    });

});