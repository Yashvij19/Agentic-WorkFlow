import  { FastifyInstance } from "fastify";
import { workflowService } from "../services/workflowService";
import { workflowQueue } from "../queues/workflowQueue";
import { redisSubscriber } from "../utils/redis";
import { prisma } from "../utils/db";


export async function workflowRoutes(server: FastifyInstance) {

    // Secure these routes using our authenticating helper
    server.addHook('preValidation', async (request, reply) => {

        // Skip websocket auth at this point, handled inside websocket handler
        if (request.url.includes('/api/workflow/live')) return;
        await server.authenticate(request, reply);
    });


     // Helper to map backend error messages to correct HTTP status codes
    const handleRouteError = (err: any, reply: any) => {
        if (err.message.includes("Access Denied")) {
            return reply.code(403).send({ error: err.message });
        }
        if (err.message.includes("not found")) {
            return reply.code(404).send({ error: err.message });
        }
        return reply.code(400).send({ error: err.message });
    };
    // 1. Get all workflows

    server.get('/api/workflows', async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId=request.user.id;
        const {scope}=request.query as {scope?:'me' | 'organization'}

        try{
            
              const list = await workflowService.getWorkflows({
                orgId,
                userId,
                scope: scope || 'organization'
            });
             return reply.send(list);
        }catch (err: any) {
             return handleRouteError(err, reply);
        }
    });

    // 2. Get single workflow

    server.get('/api/workflow/:id', async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId=request.user.id;
        const { id } = request.params as any;
        try{
            
              const workflow = await workflowService.getWorkflowById(orgId, userId, id);
            return reply.send(workflow);
        }
        catch (err: any) {
              return handleRouteError(err, reply);
        }
    });

    // 3. Create workflow (Blocked if MEMBER has canCreateWorkflow = false)

    server.post("/api/workflow", async (request, reply) => {
        const orgId = request.user.organizationId;
         const userId = request.user.id;
        const { name, nodes, edges } = request.body as any;

        try{
               
             if (!nodes || !edges) {
                return reply.code(400).send({ error: 'Nodes and edges are required.' });
            }
             const workflow = await workflowService.createWorkflow(orgId, userId, name, nodes, edges);
               return reply.code(201).send({
                message: 'Workflow successfully deployed!',
                workflowId: workflow.id,
            });
        }catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    // 3.1 Update workflow
    server.put("/api/workflow/:id", async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as any;
        const { name, nodes, edges } = request.body as any;

        try {
            const workflow = await workflowService.updateWorkflow(orgId, userId, id, name, nodes, edges);
            return reply.code(200).send({
                success: true, // ✅ Standard success flag
                message: 'Workflow blueprint saved successfully!',
                workflow,
            });
        } catch (err: any) {
            return handleRouteError(err, reply);
        }
    });


    // 4. Delete workflow (Blocked if MEMBER has canCreateWorkflow = false)

    server.delete("/api/workflow/:id" ,async (request , reply)=>{
         const orgId = request.user.organizationId;
       const userId=request.user.id;
        const { id } = request.params as any;

        try{
             
            await workflowService.deleteWorkflow(orgId, userId, id);
            return reply.send({ message: "Workflow successfully deleted." });

        }catch(err:any){
            return handleRouteError(err, reply);
        }
    } );

    // 5. Get execution history for a workflow
    server.get('/api/workflow/:id/executions', async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as any;
        try {
             const history = await workflowService.getExecutionHistory(id, orgId, userId);
            return reply.send(history);
        } catch (err: any) {
            return handleRouteError(err, reply);
        }
    });

     // 6. Get failed jobs from queue

    server.get('/api/workflows/failed-jobs', async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;

      try{
            const { role, permissions } =  await workflowService.getUserAccess(userId);
            const failedJobs = await workflowQueue.getFailed();
            
            // Filter to only this organization's jobs
            const orgJobs = failedJobs.filter(job => job.data.organizationId === orgId);
            let allowedJobs = orgJobs;
            if(role!=='ADMIN'){
                const canViewTeamFailed=role==='MEMBER' && permissions.canViewTeamFailedExecutions===true;

                if(!canViewTeamFailed){
                    const executionIds=orgJobs.map(j=>j.data.executionId).filter(Boolean);
                    const userExecutions=await prisma.workflowExecution.findMany({
                        where:{
                            id:{
                                in:executionIds
                            },
                            triggeredByUserId:userId
                        },
                        select:{
                            id:true
                        }
                    });
                    const userExecutionIdsSet=new Set(userExecutions.map(e=>e.id));
                    allowedJobs=orgJobs.filter(job=>
                        userExecutionIdsSet.has(job.data.executionId)
                    );
                }
                }
                         const formatted = allowedJobs.map((job) => ({
                        executionId: job.data.executionId,
                        workflowId: job.data.workflowId,
                        failedReasons: job.failedReason,
                        failedAt: new Date(job.finishedOn || 0).toString(),
                    }));
                    return reply.send({
                        message: `Found ${formatted.length} jobs in the Dead Letter Queue.`,
                        deadLetters: formatted,
                    });
            }
      
      catch(err:any){
                return reply.code(500).send({ error: err.message });
            }
        
    });




    // 7. Live Telemetry WebSocket route (Secure & Safe Socket version)


     server.register(async (fastify) => {
        fastify.get('/api/workflow/live', { websocket: true }, async (connection, req) => {
            const url = new URL(req.url || "", 'http://localhost');
            const token = url.searchParams.get('token');
            const socket = connection.socket || connection;
            if (!token) {
                socket.close(4001, 'Unauthorized: Token required');
                return;
            }
            let user: any;
            let role: string;
            let permissions: any;
            try {
                user = server.jwt.verify(token);
                // Dynamically fetch permissions from database to ensure fresh data
                const access = await workflowService.getUserAccess(user.id);
                role = access.role;
                permissions = access.permissions;
            } catch (err) {
                socket.close(4002, 'Unauthorized: Invalid token');
                return;
            }
            const onMessage = (channel: string, message: string) => {
                if (channel === 'telemetry') {
                    try {
                        const telemetryData = JSON.parse(message);
                        if (telemetryData.organizationId === user.organizationId) {
                            
                            // Secure dynamic check: If user is a member without team telemetry access, 
                            // only send updates on executions they triggered.
                            if (role === 'MEMBER' && permissions.canViewTeamExecutions === false) {
                                if (telemetryData.triggeredByUserId !== user.id) {
                                    return; // Filter it out
                                }
                            }
                            socket.send(message);
                        }
                    } catch (parseError: any) {
                        server.log.error('Failed to parse telemetry message payload', parseError);
                    }
                }
            };
            redisSubscriber.subscribe('telemetry');
            redisSubscriber.on('message', onMessage);
            socket.on('close', () => {
                redisSubscriber.off('message', onMessage);
            });
        });
    });


    //8 Trigger workflow execution

    server.post("/api/workflow/:id/execute", async (request, reply) => {
        const orgId = request.user.organizationId;
        const { id } = request.params as any;
        const userId = request.user.id;

        try {
             
            const execution = await workflowService.triggerExecution(orgId,id ,userId);

            return reply.code(202).send({
                message: 'Workflow execution triggered successfully.',
                executionId: execution.id,
                status: execution.status,
            });

        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }

    });

    server.post("/api/workflow/:id/execute-node",async(request, reply)=>{
        const orgId=request.user.organizationId;
        const {id}=request.params as any;
        const {nodeId}=request.body as any;  // The node we want to run up to
        const userId = request.user.id;

        
        if (!nodeId) {
            return reply.code(400).send({ error: 'nodeId is required in the request body.' });
        }

        try{
             const execution = await workflowService.triggerPartialExecution(orgId, id, nodeId, userId);
               return reply.code(202).send({
                message: `Partial workflow execution up to node '${nodeId}' triggered.`,
                executionId: execution.id,
                status: execution.status,
            });
        }catch(err: any){
             return reply.code(400).send({ error: err.message });
        }
    });

    

}