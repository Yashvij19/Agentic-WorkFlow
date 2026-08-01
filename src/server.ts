import 'dotenv/config';
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { idempotencyPulgins } from "./plugins/idempotency";

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

declare module '@fastify/jwt'{
    interface FastifyJWT{
        payload:{
            id:string , 
            organizationId:string,
            email:string
        };
        user:{
            id:string,
            organizationId:string,
            email:string
        };
    }
}

declare module 'fastify'{
    interface FastifyInstance {
        authenticate(request: any, reply: any): Promise<void>;
    }
}

server.register(fastifyJwt, {
  secret: jwtSecret,
});

server.register(idempotencyPulgins);



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

server.get('/protected-health',
    {preValidation:[server.authenticate]},
    async (request , reply)=>{
        return {
            status: 'ok', 
            user: request.user,
            message: 'You have successfully passed the jwt.'
        }
    }
)


const start=async ()=>{
    try{
        // Bind to port 3000 and listen on all network interfaces (0.0.0.0)
        await server.listen({
            port:3000 , 
            host:'0.0.0.0'
        });

        server.log.info('Control Tower is ready to accept connections.');
    }catch(err){
        server.log.error(err);
        process.exit(1);  // kill the process immediately if startup fails
    }
}

start();