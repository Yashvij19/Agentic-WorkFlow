import 'dotenv/config';
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { idempotencyPulgins } from "./plugins/idempotency";
import { enqueWorkflowJob } from './queues/workflowQueue';
import { prisma } from './utils/db';
import { workflowQueue } from './queues/workflowQueue';
import { fail } from 'node:assert';
import { validateDag } from './utils/dag';
import { error } from 'node:console';
import { redisSubscriber } from './utils/redis';
import webSocket from "@fastify/webSocket"
import { channel } from 'node:diagnostics_channel';
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

server.register(webSocket);
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

server.post('/api/workflows',{preValidation:[server.authenticate]},async(request , reply)=>{
    const {name, nodes , edges}=request.body as any;

    if(!nodes || !edges){
        return reply.code(400).send({
            error:'Missing nodes or edges in payload. '
        })
    }
    // 1. Mathematically prove the graph won't crash our workers
    const dagCheck = validateDag(nodes, edges);
    if(!dagCheck.isValid){
        return reply.code(400).send({
            error:dagCheck.error
        })
    }

    // 2. Save the validated blueprint to the database, locked to this specific user's organization

    const workflow=await prisma.workflow.create({
        data:{
            name:name|| "Untitled Agentic Workflow",
            nodesJson:nodes,
            dagJson:edges,
            organizationId:request.user.organizationId,
            status:'ACTIVE'
        }
    });

    server.log.info(`Workflow ${workflow.id} successfully validated and saved.`);

    return reply.send({
        message: 'Workflow securely deployed!', 
        workflowId: workflow.id
    });

});


server.register(async function (fastify) {
    fastify.get("/api/workflow/live",{websocket:true},(connection,req)=>{
        server.log.info("Frontend Canvas connected to Live Telemetry.");

        redisSubscriber.subscribe('telementry',(err,count)=>{
            if(err) server.log.error('Failed to subscribe to Redis telemetry: %s', err.message);
        })

        redisSubscriber.on('message', (channel , message)=>{
            if(channel==='telementry'){
                connection.socket.send(message);
            }
        });

        connection.socket.on('close', () => {
            server.log.info('🔌 Frontend Canvas disconnected.');
            });
    })
})

start();