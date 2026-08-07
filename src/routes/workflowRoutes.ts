import fastify, { FastifyInstance } from "fastify";
import { workflowService } from "../services/workflowService";
import { request } from "node:http";
import { asyncWrapProviders } from "node:async_hooks";
import { workflowQueue } from "../queues/workflowQueue";
import { redisSubscriber } from "../utils/redis";



export async function workflowRoutes(server: FastifyInstance) {

    // Secure these routes using our authenticating helper
    server.addHook('preValidation', async (request, reply) => {

        // Skip websocket auth at this point, handled inside websocket handler
        if (request.url.includes('/api/workflow/live')) return;
        await server.authenticate(request, reply);
    });


    // 1. Get all workflows

    server.get('/api/workflows', async (request, reply) => {
        const orgId = request.user.organizationId;
        const list = await workflowService.getWorkflows(orgId);
        return reply.send(list);
    });

    // 2. Get single workflow

    server.get('/api/workflow/:id', async(request , reply)=>{
        const orgId=request.user.organizationId;
        const {id}=request.params as any;

        const workflow=await workflowService.getWorkflowById(orgId , id);

        if (!workflow) return reply.code(404).send({ error: 'Workflow not found.' });
        return reply.send(workflow);
    });

     // 3. Create workflow

    server.post("/api/workflow" , async(request , reply)=>{
        const orgId=request.user.organizationId;
        const{name , nodes , edges}=request.body as any;

        if(!nodes || !edges){
             return reply.code(400).send({ error: 'Nodes and edges are required.' });
        }

        try{
            const workflow=await workflowService.createWorkflow(orgId , name , nodes , edges);
            return reply.code(201).send({
                message: 'Workflow successfully deployed!',
                workflowId: workflow.id,
            });
        }catch(err:any){
            return reply.code(400).send({ error: err.message });
        }
    });

      // 5. Get execution history for a workflow
    server.get('/api/workflow/:id/executions', async(request , reply)=>{
        const orgId=request.user.organizationId;
        const {id}=request.params as any;
        try{
            const history=await workflowService.getExecutionHistory(orgId, id);
            return reply.send(history);
        }catch(err:any){
            return reply.code(500).send({ error: err.message });
        }
    });

    server.get('/api/workflows/failed-jobs', async(request , reply)=>{
        const failedJobs= await workflowQueue.getFailed();
        const formatted=failedJobs.map((job)=>({
            executionId: job.data.executionId,
            workflowId: job.data.workflowId,
            failedReasons: job.failedReason,
             failedAt: new Date(job.finishedOn || 0).toString(),
        }));

        return reply.send({
             message: `Found ${failedJobs.length} jobs in the Dead Letter Queue.`,
            deadLetters: formatted,
        });
    });


     // 7. Live Telemetry WebSocket route

     server.register(async(fastify)=>{
        fastify.get('/api/workflow/live',{websocket:true}, (connection , req)=>{
            server.log.info('📡 Frontend Canvas connected to Live Telemetry.');

            const url=new URL(req.url||"" , 'http://localhost');
            const token=url.searchParams.get('token');

            if(!token){
                server.log.warn("Connection rejected: Missing token.");
                connection.socket.close(4001, 'Unauthorized: Token required');
                return;
            }

            let user:any;
            try{
                user=server.jwt.verify(token);
                  server.log.info(`🔌 Authenticated socket user for organization: ${user.organizationId}`);
            }catch(err){
                 server.log.warn('🔌 Connection rejected: Invalid token.');
                connection.socket.close(4002, 'Unauthorized: Invalid token');
                return;
            }

            const onMessage = (channel:string , message:string)=>{
                if(channel==='telemetry'){
                    try{
                        const telemetryData=JSON.parse(message);
                         // Strict isolation check: Only send to client if the organization IDs match
                         if (telemetryData.organizationId === user.organizationId) {
                            connection.socket.send(message);
                        }
                    }catch(parseError:any){
                        server.log.error('Failed to parse telemetry message payload', parseError);
                    }
                }
            };

            redisSubscriber.subscribe('telemetry', (err:any)=>{
                 if (err) server.log.error('Failed to subscribe to telemetry:', err.message);
            });
            redisSubscriber.on('message',onMessage);
            connection.socket.on('close', ()=>{
                server.log.info('🔌 Frontend Canvas disconnected.');
                redisSubscriber.off('message', onMessage);
            });

        });
     });
}