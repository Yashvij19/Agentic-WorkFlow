import 'dotenv/config';
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { idempotencyPulgins } from "./plugins/idempotency";
import webSocket from "@fastify/webSocket"
import fastifyRateLimit from '@fastify/rate-limit';
import { redisConnection } from './utils/redis';
import { authRoutes } from './routes/authRoutes';
import { workflowRoutes } from './routes/workflowRoutes';
import { credentialRoutes } from './routes/credentialRoutes';
import { adminRoutes } from './routes/adminRoutes';

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
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

const start=async ()=>{
    try{
        // Bind to port 3000 and listen on all network interfaces (0.0.0.0)
        await server.listen({
            port:4000 , 
            host:'0.0.0.0'
        });

        server.log.info('server is ready to accept connections.');
    }catch(err){
        server.log.error(err);
        process.exit(1);  // kill the process immediately if startup fails
    }
}



start();