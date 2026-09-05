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

    // 3.2 Rename workflow
    const handleRename = async (request: any, reply: any) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as any;
        const { name } = request.body as any;

        if (!name) {
            return reply.code(400).send({ error: 'New workflow name is required.' });
        }

        try {
            const workflow = await workflowService.renameWorkflow(orgId, userId, id, name);
            return reply.code(200).send({
                success: true,
                message: 'Workflow renamed successfully!',
                workflow,
            });
        } catch (err: any) {
            return handleRouteError(err, reply);
        }
    };

    server.patch("/api/workflow/:id/rename", handleRename);
    server.put("/api/workflow/:id/rename", handleRename);

    // 3.3 Duplicate workflow
    server.post("/api/workflow/:id/duplicate", async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as any;
        const { name } = (request.body as any) || {};

        try {
            const workflow = await workflowService.duplicateWorkflow(orgId, userId, id, name);
            return reply.code(201).send({
                success: true,
                message: 'Workflow duplicated successfully!',
                workflow,
            });
        } catch (err: any) {
            return handleRouteError(err, reply);
        }
    });

    // 3.4 Update workflow status (ACTIVE, PAUSED, DRAFT)
    const handleStatusUpdate = async (request: any, reply: any) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as any;
        const { status } = request.body as any;

        if (!status) {
            return reply.code(400).send({ error: 'Status is required.' });
        }

        try {
            const workflow = await workflowService.updateWorkflowStatus(orgId, userId, id, status);
            return reply.code(200).send({
                success: true,
                message: `Workflow status updated to ${status}.`,
                workflow,
            });
        } catch (err: any) {
            return handleRouteError(err, reply);
        }
    };

    server.patch("/api/workflow/:id/status", handleStatusUpdate);
    server.put("/api/workflow/:id/status", handleStatusUpdate);


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

     // 6. Get failed jobs from Dead Letter Queue (DLQ) with rich diagnostics & pagination
    server.get('/api/workflows/failed-jobs', async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;

        try {
            const { role, permissions } = await workflowService.getUserAccess(userId);

            // 🛡️ Strict RBAC Permission Check
            const hasAccess = 
                role === 'SINGLE' || 
                role === 'ADMIN' || 
                (role === 'MEMBER' && (permissions?.canViewTeamFailedExecutions === true || permissions?.canViewDLQ === true));

            if (!hasAccess) {
                return reply.code(403).send({ 
                    error: 'Access denied: You do not have permission to view the Dead Letter Queue. Contact your administrator.' 
                });
            }

            const query = request.query as any;
            const page = Math.max(1, parseInt(query?.page, 10) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(query?.limit, 10) || 10));
            const search = (query?.search || '').trim();
            const skip = (page - 1) * limit;

            const whereClause: any = {
                organizationId: orgId,
                status: 'FAILED',
            };

            if (search) {
                whereClause.OR = [
                    { id: { contains: search, mode: 'insensitive' } },
                    { workflow: { name: { contains: search, mode: 'insensitive' } } },
                ];
            }

            const [totalCount, failedExecutions, bullFailedJobs] = await Promise.all([
                prisma.workflowExecution.count({ where: whereClause }),
                prisma.workflowExecution.findMany({
                    where: whereClause,
                    orderBy: { completedAt: 'desc' },
                    skip,
                    take: limit,
                    include: {
                        workflow: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                                description: true,
                            },
                        },
                        triggeredByUser: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                        logs: {
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                nodeId: true,
                                status: true,
                                outputData: true,
                                createdAt: true,
                            },
                        },
                    },
                }),
                workflowQueue.getFailed(0, 100).catch(() => []),
            ]);

            const bullMap = new Map<string, any>(
                bullFailedJobs.map(j => [j.data?.executionId || j.id, j])
            );

            const formatted = failedExecutions.map((exec) => {
                const bullJob = bullMap.get(exec.id);
                const failedLog = exec.logs.find(l => l.status === 'FAILED') || exec.logs[0];
                const rawError = (failedLog?.outputData as any)?.error || bullJob?.failedReason || 'Workflow execution failed.';
                const attemptsMade = bullJob?.attemptsMade ?? (exec.logs.length > 0 ? 1 : 1);
                const maxAttempts = bullJob?.opts?.attempts ?? 3;
                const isUnrecoverable = 
                    rawError.toLowerCase().includes('unrecoverable') || 
                    rawError.toLowerCase().includes('missing') || 
                    rawError.toLowerCase().includes('credential') || 
                    attemptsMade < maxAttempts;

                const startedMs = new Date(exec.startedAt).getTime();
                const completedMs = exec.completedAt ? new Date(exec.completedAt).getTime() : startedMs;
                const durationMs = Math.max(0, completedMs - startedMs);

                return {
                    executionId: exec.id,
                    workflowId: exec.workflowId,
                    workflowName: exec.workflow?.name || 'Untitled Workflow',
                    workflowDescription: exec.workflow?.description || '',
                    workflowStatus: exec.workflow?.status || 'ACTIVE',
                    triggeredBy: exec.triggeredByUser?.email || 'Automated / System Trigger',
                    triggeredByUserId: exec.triggeredByUserId,
                    startedAt: exec.startedAt,
                    completedAt: exec.completedAt,
                    durationMs,
                    failedNodeId: failedLog?.nodeId || 'unknown_node',
                    failureReason: rawError,
                    attemptsMade,
                    maxAttempts,
                    isUnrecoverable,
                    logs: exec.logs,
                };
            });

            return reply.send({
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
                currentPage: page,
                pageSize: limit,
                redisFailedCount: bullFailedJobs.filter(j => j.data?.organizationId === orgId).length,
                deadLetters: formatted,
            });
        } catch (err: any) {
            return reply.code(500).send({ error: err.message });
        }
    });

    // 6.1 Clear/Purge Dead Letter Jobs from Redis memory cache (Admin/Single only)
    server.post('/api/workflows/failed-jobs/clear-redis', async (request, reply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;

        try {
            const { role } = await workflowService.getUserAccess(userId);
            if (role === 'MEMBER') {
                return reply.code(403).send({ error: 'Only Organization Admins can clear Redis memory.' });
            }

            const failedJobs = await workflowQueue.getFailed(0, 500);
            let removedCount = 0;

            for (const job of failedJobs) {
                if (job.data?.organizationId === orgId) {
                    await job.remove();
                    removedCount++;
                }
            }

            return reply.send({
                success: true,
                message: `Purged ${removedCount} dead letter jobs from Redis RAM cache.`,
                removedCount,
            });
        } catch (err: any) {
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
                            const isTriggerer = telemetryData.triggeredByUserId && telemetryData.triggeredByUserId === user.id;
                            const canViewTeam = role === 'ADMIN' || role === 'SINGLE' || permissions?.canViewTeamExecutions === true;

                            if (!isTriggerer && !canViewTeam) {
                                return; // Filter out executions triggered by other teammates
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

    server.post("/api/workflow/:id/replay" , async(request , reply)=>{
        const orgId=request.user.organizationId;
        const {id}=request.params as any;
        const {executionId , targetNodeId , resumeDownstream}= request.body as any;
        const userId=request.user.id;

        if(!executionId || !targetNodeId){
              return reply.code(400).send({ error: 'executionId and targetNodeId are required in the request body.' });
        }

        try{
            const execution = await workflowService.triggerReplay(
                orgId,
                id,
                executionId,
                targetNodeId,
                !!resumeDownstream, // Ensures we pass a clean boolean
                userId
            );

            return reply.code(202).send({
                message: `Workflow execution replay triggered for node '${targetNodeId}'.`,
                executionId: execution.id,
                status: execution.status,
            });


        }catch(err:any){
             return reply.code(400).send({ error: err.message });
        }
    })

    

}