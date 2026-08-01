import 'dotenv/config';
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { idempotencyPulgins } from "./plugins/idempotency";
import { enqueWorkflowJob } from './queues/workflowQueue';
import { prisma } from './utils/db';
import { workflowQueue } from './queues/workflowQueue';
import { fail } from 'node:assert';
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

server.post("/api/workflow/:workflowId/execute"
    ,{preValidation:[server.authenticate]},
    async (request , reply)=>{
        const {workflowId}=request.params as {workflowId:any};
        const organizationId=request.user.organizationId;

        // 1. Verify the workflow exists and belongs to this organization
        const workflow= await prisma.workflow.findFirst({
            where:{id:workflowId , organizationId}
        });

        if(!workflow){
            return reply.code(404).send({ error: 'Workflow not found.' });
        }

        // 2. Create a PENDING execution record in the database
        // Note: We'd typically have an Execution model, but for now we generate a mock ID
        const executionId=`exec_${Date.now()}`;

        // 3. Drop the job onto the Redis queue
        await enqueWorkflowJob(executionId ,workflowId , organizationId);

        server.log.info(`Enqueued execution ${executionId} for workflow ${workflowId}`);

        // 4. Return an immediate 202 Accepted response. 
        // We do NOT wait for the job to finish.
        return reply.code(202).send({
            message: 'Workflow execution triggered successfully.',
            executionId,
            status: 'PENDING'
        });
    }
);

server.get('/api/workflows/failed-jobs' ,{preValidation:[server.authenticate]},async(request , reply)=>{


    // BullMQ has a built-in method to grab jobs parked in the failed state (our DLQ)
    const failedJobs=await workflowQueue.getFailed();

    const formattedJobs = failedJobs.map(job=>({
        executionId:job.data.executionId,
        workflowId:job.data.workflowId,
        failedReasons:job.failedReason, // BullMQ automatically saves the exact error message!
        failedAt:new Date(job.finishedOn || 0).toString(),
    }));

    return reply.send({
        message:`Found ${failedJobs.length} jobs in the Dead Letter Queue.`,
        deadLetters:formattedJobs
    });
})

start();