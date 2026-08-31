import {prisma} from '../utils/db';

import { validateDag } from '../utils/dag';

import { enqueWorkflowJob } from '../queues/workflowQueue';


export class workflowService{

    static async getUserAccess(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, permissions: true }
        });
        if (!user) throw new Error("User not found.");
        
        const perms = typeof user.permissions === 'string'
            ? JSON.parse(user.permissions)
            : (user.permissions || {});
        return { role: user.role, permissions: perms };
    }

        // Resolves Creator, Admin, Global team flag, or whitelisted allowedWorkflowIds
    static hasWorkflowAccess(
        workflow: any, 
        userId: string, 
        role: string, 
        permissions: any, 
        action: 'view' | 'execute' | 'delete'
    ): boolean {
        if (role === 'SINGLE') return true; 
        if (role === 'ADMIN') return true;   
        const isCreator = workflow.createdByUserId === userId;
        if (isCreator) return true; // Creators always have full access to their own workflows
        // Check specific workflow whitelists (Admin granted)
        const allowedIds = permissions?.allowedWorkflowIds || [];
        const isSpecificallyWhitelisted = allowedIds.includes(workflow.id);
        if (isSpecificallyWhitelisted) return true;
        // Check global permission flags
        if (action === 'view') {
            return permissions?.canViewTeamWorkflows === true;
        }
        if (action === 'execute') {
            return permissions?.canExecuteTeamWorkflows === true;
        }
        if (action === 'delete') {
            return permissions?.canDeleteTeamWorkflows === true;
        }
        return false;
    }


    static async createWorkflow(orgId:string, userId:string, name:string, nodes:any[], edges:any[]){

          const { role, permissions } = await workflowService.getUserAccess(userId);

        if (role === 'MEMBER' && permissions.canCreateWorkflow === false) {
            throw new Error("Access Denied: You do not have permission to create workflows.");
        }

        //validata the graph

        const dagCheck =validateDag(nodes , edges);
        if(!dagCheck.isValid){
            throw new Error (dagCheck.error||"Invalid workflow DAG structure.");
        }

        const workflowName=name?.trim();
        const existingWorkflow=await prisma.workflow.findFirst({
            where:{
                organizationId:orgId,
                name:{
                    equals:workflowName,
                    mode:'insensitive'
                }
            }
        })

        if(existingWorkflow){
            throw new Error(`A workflow named "${workflowName}" already exists in your organization.`);
        }

        return await prisma.workflow.create({
            data:{
                name:workflowName,
                nodesJson:nodes,
                dagJson:edges,
                organizationId:orgId,
                createdByUserId:userId,
                status:'ACTIVE',
            }
        });

    }

    static async updateWorkflow(orgId: string, userId: string, id: string, name?: string, nodes?: any[], edges?: any[]) {
        const { role, permissions } = await workflowService.getUserAccess(userId);

        const workflow = await prisma.workflow.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!workflow) {
            throw new Error("Workflow not found.");
        }

        if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'view')) {
            throw new Error("Access Denied: You do not have permission to edit this workflow.");
        }

        const nodesToSave = nodes !== undefined ? nodes : (workflow.nodesJson as any[]);
        const edgesToSave = edges !== undefined ? edges : (workflow.dagJson as any[]);

        const dagCheck = validateDag(nodesToSave, edgesToSave);
        if (!dagCheck.isValid) {
            throw new Error(dagCheck.error || "Invalid workflow DAG structure.");
        }

        return await prisma.workflow.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim() } : {}),
                nodesJson: nodesToSave,
                dagJson: edgesToSave,
            }
        });
    }


    static async getWorkflows(
       parms:{
         orgId:string,
        userId:string,
       
        scope?:'me'|'organization'
       }
    ){
        const {orgId , userId , scope='organization'}=parms;
        const { role, permissions } = await workflowService.getUserAccess(userId);
        const whereClause:any={
            organizationId:orgId
        }

        if(role==='SINGLE'){
            return await prisma.workflow.findMany({
                where:whereClause,
                orderBy:{
                    createdAt:'desc'
                }
            });
        }
         if (role === 'ADMIN') {
            if (scope === 'me') {
                whereClause.createdByUserId = userId;
            }
            return await prisma.workflow.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' }
            });
        }

        

         // If user is a MEMBER, restrict by allowedWorkflowIds (if set)
         if(role==='MEMBER'){
             if (scope === 'me') {
                whereClause.createdByUserId = userId;
            } else{
                 // By default, members only see their own workflows unless they have team view access
            const canViewTeamWorkflows=permissions.canViewTeamWorkflows===true;
            if(!canViewTeamWorkflows){
                 const allowedIds = permissions?.allowedWorkflowIds || [];
                    whereClause.OR = [
                        { createdByUserId: userId },
                        { id: { in: allowedIds } }
                    ];
            }
        }
         }
         return await prisma.workflow.findMany({
            where:whereClause,
            orderBy:{
                createdAt:'desc'
            }
         });
    }



    static async getWorkflowById( orgId: string, userId: string, id: string ){
             const { role, permissions } = await workflowService.getUserAccess(userId);
        
                const workflow = await prisma.workflow.findFirst({
                    where: {
                        id: id,
                        organizationId: orgId
                    }
                });
                if (!workflow) {
                    throw new Error("Workflow not found.");
                }
                if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'view')) {
                    throw new Error("Access Denied: You do not have permission to view this workflow.");
                }
                return workflow;
        
    }

    static async triggerExecution(orgId:string , workflowId:string , userId:string){
         const { role, permissions } = await workflowService.getUserAccess(userId);
        const workflow=await prisma.workflow.findFirst({
            where:{id:workflowId, organizationId:orgId},
        });

        if(!workflow){
            throw new Error("Workflow not found.")
        }

         if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'execute')) {
            throw new Error("Access Denied: You do not have permission to execute this workflow.");
        }

        // 2. Create the PENDING run record in DB
        const execution=await prisma.workflowExecution.create({
            data:{
                workflowId , 
                organizationId:orgId ,
                triggeredByUserId: userId,
                status:'PENDING',
            },
        });

        // 3. Enqueue the execution task to BullMQ
    // Fix note: passing execution.organizationId ensuring spelling matches org ID structure

            await enqueWorkflowJob(execution.id , workflowId , orgId);
            return execution;
    }

    static async getExecutionHistory(workflowId:string , orgId:string , userId:string ){
        const { role, permissions } = await workflowService.getUserAccess(userId);
        
        const workflow = await prisma.workflow.findFirst({
            where: { id: workflowId, organizationId: orgId }
        });
        if (!workflow) {
            throw new Error("Workflow not found.");
        }
        if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'view')) {
            throw new Error("Access Denied: You do not have permission to view execution history.");
        }


      const whereClause:any={
        workflowId,
        organizationId:orgId
      };

      if(role==='MEMBER'){
        const canViewTeam = permissions?.canViewTeamExecutions === true;
        if (!canViewTeam) {
                whereClause.triggeredByUserId = userId; // Can only view own executions
            }
      }

      return await prisma.workflowExecution.findMany({
            where: whereClause,
            include: {
                logs: true
            },
            orderBy: {
                startedAt: 'desc'
            }
        });

    }

    static async triggerPartialExecution(orgId:string , workflowId:string , targetNodeId:string , userId: string){
        
          const { role, permissions } = await workflowService.getUserAccess(userId);
        const workflow = await prisma.workflow.findFirst({
            where:{
                id:workflowId, 
                organizationId:orgId
            }
        });

        if(!workflow){
            throw new Error("Workflow not found.");
        }

        if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'execute')) {
            throw new Error("Access Denied: You do not have permission to execute this workflow.");
        }

        // 1. Create a PENDING run in DB

        const execution=await prisma.workflowExecution.create({
            data:{
                workflowId,
                organizationId:orgId,
                 triggeredByUserId: userId,
                status:'PENDING'
            }
        });

        // 2. Enqueue in BullMQ with targetNodeId parameter
        await enqueWorkflowJob(execution.id, workflowId, orgId, targetNodeId);
        return execution;
    }

    static async triggerReplay(
        orgId:string,
        workflowId:string,
        executionId:string,
        targetNodeId:string,
        resumeDownstream:boolean,
        userId:string
    ){
        const {role , permissions} = await workflowService.getUserAccess(userId);

        const  workflow = await prisma.workflow.findFirst({
            where:{
                id:workflowId,  
                organizationId:orgId
            }
        });

        if(!workflow){
            throw new Error("Workflow not found.");
        }

        if(!workflowService.hasWorkflowAccess(workflow, userId , role , permissions , "execute")){
            throw new Error("Access Denied: You do not have permission to execute this workflow.");
        }

        // 2. Verify the execution exists

        const execution=await prisma.workflowExecution.findFirst({
            where:{
                id:executionId , 
                workflowId,
                organizationId:orgId
            }
        });

        if (!execution) {
            throw new Error("Execution not found.");
        }

        // 3. Determine which nodes to clear from database logs
          const edges = workflow.dagJson as any[];
        const nodesToClear = new Set<string>();
        nodesToClear.add(targetNodeId);

          if (resumeDownstream) {
            // Find all downstream children
            const downstream = new Set<string>();
            const queue: string[] = [targetNodeId];
            while (queue.length > 0) {
                const current = queue.shift()!;
                const children = edges.filter((e: any) => e.source === current).map((e: any) => e.target);
                for (const child of children) {
                    if (!downstream.has(child)) {
                        downstream.add(child);
                        queue.push(child);
                    }
                }
            }
            downstream.forEach(id => nodesToClear.add(id));
        }

          // 4. Delete the logs of nodes that will be re-run
        await prisma.executionLog.deleteMany({
            where: {
                executionId,
                nodeId: { in: Array.from(nodesToClear) }
            }
        });

        // 5. Update execution status back to PENDING and clear completedAt
        const updatedExecution = await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
                status: 'PENDING',
                completedAt: null
            }
        });

         // 6. Enqueue back to BullMQ queue as a replay job
        await enqueWorkflowJob(
            executionId, 
            workflowId, 
            orgId, 
            targetNodeId, 
            resumeDownstream, 
            true // isReplay: true
        );
        return updatedExecution;



    }

    static async deleteWorkflow(orgId:string,userId: string,id:string ){
        const { role, permissions } = await workflowService.getUserAccess(userId);

          const workflow = await prisma.workflow.findFirst({
            where: { id, organizationId: orgId }
        });
        if (!workflow) {
            throw new Error("Workflow not found.");
        }
        if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'delete')) {
            throw new Error("Access Denied: You do not have permission to delete this workflow.");
        }
         return await prisma.workflow.delete({
            where: { id }
        });
    }


}