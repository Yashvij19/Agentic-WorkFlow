import 'dotenv/config';
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { idempotencyPulgins } from "./plugins/idempotency";
import webSocket from "@fastify/websocket";
import fastifyRateLimit from '@fastify/rate-limit';
import { redisConnection } from './utils/redis';
import { authRoutes } from './routes/authRoutes';
import { workflowRoutes } from './routes/workflowRoutes';
import { credentialRoutes } from './routes/credentialRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { ragRoutes } from './routes/ragRoutes';
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
}



const server:FastifyInstance=Fastify({
    logger:{
        transport:{
            target:'pino-pretty',
            options:{
                translateTime:'HH:MM:ss Z',
                ignore:'pid,hostname'
            },
        },
    },
})

server.addHook('onRequest', async(request , reply)=>{
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH,  OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, idempotency-key');
    // Instantly resolve browser preflight requests
    if (request.method === 'OPTIONS') {
        reply.code(204).send();
        return reply;
    }
})

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
});

server.register(webSocket);
server.register(idempotencyPulgins);

// Register the Rate Limiting Shield
server.register(fastifyRateLimit,{
    global:false, // We don't want to limit every single route globally (like /health)
    redis:redisConnection,
    keyGenerator:(request:any)=>{
        return request.user?request.user.organizationId:request.ip;
    },

    errorResponseBuilder:(request,context)=>{
        return {
            statusCode:429,
            error:'Too Many Requests',
            message:`Rate limit exceeded. You are allowed ${context.max} requests per ${context.after}. Please try again later.`,
        };
    },
});


// A simple health check route to verify the server is breathing
server.get('/health', async(request , reply)=>{
    return {
        status:'ok',
        message:"API Gateway is online"
    };
})


// Create a reusable authentication middleware hook
server.decorate('authenticate' , async function (request:any, reply:any){
    try{
        await request.jwtVerify();
    }catch(err){
        reply.code(401).send({
            error: 'Unauthorized: Invalid credentials'
        })
    }
})


server.register(authRoutes);
server.register(workflowRoutes);
server.register(credentialRoutes);
server.register(adminRoutes);
server.register(ragRoutes);

const start = async () => {
    try {
        const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
        await server.listen({
            port: PORT, 
            host: '0.0.0.0'
        });

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