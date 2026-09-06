import 'dotenv/config';
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { idempotencyPulgins } from "./plugins/idempotency";
import webSocket from "@fastify/websocket";
import fastifyRateLimit from '@fastify/rate-limit';
import { redisConnection, redisSubscriber, redisPublisher } from './utils/redis';
import { authRoutes } from './routes/authRoutes';
import { workflowRoutes } from './routes/workflowRoutes';
import { credentialRoutes } from './routes/credentialRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { ragRoutes } from './routes/ragRoutes';
import { prisma, pgPool } from './utils/db';
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
}



const isProduction = process.env.NODE_ENV === 'production';

const server: FastifyInstance = Fastify({
    trustProxy: true,
    logger: isProduction
        ? true
        : {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                },
            },
        },
});

// Gracefully accept empty JSON request bodies (e.g. POST requests without payload)
server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    try {
        if (!body || body.trim() === '') {
            done(null, {});
            return;
        }
        const json = JSON.parse(body);
        done(null, json);
    } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
    }
});

server.addHook('onRequest', async (request, reply) => {
    const origin = process.env.FRONTEND_URL || '*';
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, idempotency-key');
    // Standard Security Headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Instantly resolve browser preflight requests
    if (request.method === 'OPTIONS') {
        reply.code(204).send();
        return reply;
    }
});

declare module '@fastify/jwt'{
    interface FastifyJWT{
        payload:{
            id:string , 
            organizationId:string,
            email:string,
            role:string
        };
        user:{
            id:string,
            organizationId:string,
            email:string,
            role:string

        };
    }
}

declare module 'fastify'{
    interface FastifyInstance {
        authenticate(request: any, reply: any): Promise<void>;
    }
}

// Register plugins

server.register(fastifyJwt, {
  secret: jwtSecret,
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '4h'
  }
});

server.register(webSocket);
server.register(idempotencyPulgins);

// 🛡️ Global Rate Limiting Shield: 120 req/min baseline with multi-tenant grouping and proxy support
server.register(fastifyRateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    redis: redisConnection,
    skipOnError: true,
    allowList: (request: any) => {
        return request.url === '/health' || request.url.startsWith('/api/workflow/live');
    },
    keyGenerator: (request: any) => {
        return request.user?.organizationId || request.ip;
    },
    errorResponseBuilder: (request, context) => {
        return {
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. You are allowed ${context.max} requests per ${context.after}. Please try again later.`,
        };
    },
});


// A simple health check route to verify the server is breathing (exempt from rate limits)
server.get('/health', { config: { rateLimit: false } }, async(request , reply)=>{
    return {
        status:'ok',
        message:"API Gateway is online"
    };
})


// Create a reusable authentication middleware hook
server.decorate('authenticate' , async function (request:any, reply:any){
    try{
        await request.jwtVerify();
        if (!request.user || !request.user.id) {
            return reply.code(401).send({
                error: 'Unauthorized: Invalid token payload.'
            });
        }
        // Verify user still exists in database and synchronizes current role
        const dbUser = await prisma.user.findUnique({
            where: { id: request.user.id },
            select: { id: true, role: true, organizationId: true }
        });
        if (!dbUser) {
            return reply.code(401).send({
                error: 'Unauthorized: User account does not exist or has been deleted.'
            });
        }
        // Synchronize fresh DB role in case user was demoted or promoted
        request.user.role = dbUser.role;
        request.user.organizationId = dbUser.organizationId;
    }catch(err){
        return reply.code(401).send({
            error: 'Unauthorized: Invalid or expired credentials'
        });
    }
})


server.register(authRoutes);
server.register(workflowRoutes);
server.register(credentialRoutes);
server.register(adminRoutes);
server.register(ragRoutes);

// 🛡️ Global Error Handler: Prevents leaking stack traces or internal DB info in production
server.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;

    if (isProduction && statusCode >= 500) {
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected internal error occurred. Please check server logs or contact support.'
        });
    }

    return reply.code(statusCode).send({
        statusCode,
        error: error.name || 'Error',
        message: error.message || 'An error occurred during request processing.'
    });
});

let isShuttingDown = false;
const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    server.log.info(`🛑 Received ${signal}. Initiating graceful shutdown...`);

    // Safety watchdog: Force exit after 10s if connections fail to close
    const forceExitTimer = setTimeout(() => {
        server.log.error('⚠️ Graceful shutdown timed out after 10 seconds. Forcing process termination.');
        process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    try {
        await server.close();
        server.log.info('Closed Fastify HTTP server.');

        if (process.env.RUN_WORKER !== 'false') {
            try {
                const { worker } = require('./workers/workflowWorker');
                await worker.close();
                server.log.info('Closed BullMQ worker.');
            } catch (e) {
                // worker may not have been started
            }
        }

        await redisConnection.quit();
        await redisSubscriber.quit();
        await redisPublisher.quit();
        server.log.info('Closed Redis connections.');

        await prisma.$disconnect();
        await pgPool.end();
        server.log.info('Closed PostgreSQL connection pool.');

        clearTimeout(forceExitTimer);
        server.log.info('✅ Graceful shutdown completed cleanly.');
        process.exit(0);
    } catch (err: any) {
        server.log.error(err, '❌ Error during graceful shutdown:');
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const start = async () => {
    try {
        const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
        const host = process.env.HOST || '::';
        try {
            await server.listen({
                port: PORT, 
                host: host
            });
        } catch (bindErr) {
            server.log.warn(`Could not bind to host '${host}', falling back to '0.0.0.0'`);
            await server.listen({
                port: PORT,
                host: '0.0.0.0'
            });
        }

        server.log.info(`Server is ready to accept connections on port ${PORT}.`);

        // In unified/cloud deployments, spin up the BullMQ worker in the same process
        if (process.env.RUN_WORKER !== 'false') {
            require('./workers/workflowWorker');
            server.log.info('⚙️ [Worker] BullMQ Workflow Worker initialized in unified server process.');
        }
    } catch (err) {
        server.log.error(err);
        process.exit(1); // kill the process immediately if startup fails
    }
};

start();