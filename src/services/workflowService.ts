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

        // Resolves Creator, Admin, Global team flags, or whitelisted allowedWorkflowIds matrix
    static hasWorkflowAccess(
        workflow: any, 
        userId: string, 
        role: string, 
        permissions: any, 
        action: 'view' | 'edit' | 'rename' | 'delete' | 'execute' | 'view_logs'
    ): boolean {
        if (role === 'SINGLE') return true; 
        if (role === 'ADMIN') return true;   
        const isCreator = workflow.createdByUserId === userId;
        if (isCreator) return true; // Creators always have full access to their own workflows

        // Check specific workflow whitelists (Supports both string IDs and scoped permission objects)
        const allowedList = Array.isArray(permissions?.allowedWorkflowIds) ? permissions.allowedWorkflowIds : [];
        const specificRule = allowedList.find((item: any) => {
            if (typeof item === 'string') return item === workflow.id;
            return item && item.workflowId === workflow.id;
        });

        // 1. Visibility Check: User must have global view access OR specific workflow view access
        const canView = permissions?.canViewTeamWorkflows === true || 
            (specificRule !== undefined && (typeof specificRule === 'string' || specificRule.canView !== false));

        if (!canView) {
            return false; // If the user cannot view the workflow, all actions on it are rejected
        }

        if (action === 'view') {
            return true;
        }

        if (action === 'edit') {
            if (permissions?.canEditTeamWorkflows === true) return true;
            if (specificRule && typeof specificRule === 'object' && specificRule.canEdit === true) return true;
            return false;
        }

        if (action === 'rename') {
            if (permissions?.canRenameTeamWorkflows === true) return true;
            if (specificRule && typeof specificRule === 'object' && specificRule.canRename === true) return true;
            return false;
        }

        if (action === 'delete') {
            if (permissions?.canDeleteTeamWorkflows === true) return true;
            if (specificRule && typeof specificRule === 'object' && specificRule.canDelete === true) return true;
            return false;
        }

        if (action === 'execute') {
            if (permissions?.canExecuteTeamWorkflows === true) return true;
            if (specificRule && (typeof specificRule === 'string' || specificRule.canExecute === true)) return true;
            return false;
        }

        if (action === 'view_logs') {
            if (permissions?.canViewTeamExecutions === true) return true;
            if (specificRule && typeof specificRule === 'object' && specificRule.canViewExecutionLogs === true) return true;
            return false;
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

        if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'edit')) {
            throw new Error("Access Denied: You do not have permission to edit this workflow blueprint.");
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

    static async renameWorkflow(orgId: string, userId: string, id: string, name: string) {
        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new Error("Workflow name cannot be empty.");
        }

        const { role, permissions } = await workflowService.getUserAccess(userId);

        const workflow = await prisma.workflow.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!workflow) {
            throw new Error("Workflow not found.");
        }

        if (!workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'rename')) {
            throw new Error("Access Denied: You do not have permission to rename this workflow.");
        }

        const existing = await prisma.workflow.findFirst({
            where: {
                organizationId: orgId,
                name: { equals: trimmedName, mode: 'insensitive' },
                id: { not: id },
            }
        });

        if (existing) {
            throw new Error(`A workflow named "${trimmedName}" already exists in your organization.`);
        }

        return await prisma.workflow.update({
            where: { id },
            data: {
                name: trimmedName,
            }
        });
    }

    static async duplicateWorkflow(orgId: string, userId: string, id: string, customName?: string) {
        const { role, permissions } = await workflowService.getUserAccess(userId);

        if (role === 'MEMBER' && permissions.canCreateWorkflow === false) {
            throw new Error("Access Denied: You do not have permission to create workflows.");
        }

        const sourceWorkflow = await prisma.workflow.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!sourceWorkflow) {
            throw new Error("Workflow not found.");
        }

        if (!workflowService.hasWorkflowAccess(sourceWorkflow, userId, role, permissions, 'view')) {
            throw new Error("Access Denied: You do not have permission to view this workflow.");
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const dateTimeStamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

        let duplicateName = customName?.trim() || `${sourceWorkflow.name}_${dateTimeStamp}`;

        let attempts = 0;
        let finalName = duplicateName;
        while (attempts < 10) {
            const existing = await prisma.workflow.findFirst({
                where: {
                    organizationId: orgId,
                    name: { equals: finalName, mode: 'insensitive' }
                }
            });
            if (!existing) break;
            attempts++;
            finalName = `${duplicateName}_${attempts}`;
        }

        return await prisma.workflow.create({
            data: {
                name: finalName,
                description: sourceWorkflow.description,
                nodesJson: (sourceWorkflow.nodesJson ?? []) as any,
                dagJson: (sourceWorkflow.dagJson ?? []) as any,
                organizationId: orgId,
                createdByUserId: userId,
                status: 'ACTIVE',
            }
        });
    }

    static async updateWorkflowStatus(
        orgId: string, 
        userId: string, 
        id: string, 
        status: 'ACTIVE' | 'PAUSED' | 'DRAFT'
    ) {
        const allowedStatuses = ['ACTIVE', 'PAUSED', 'DRAFT'];
        if (!allowedStatuses.includes(status)) {
            throw new Error(`Invalid status '${status}'. Must be one of: ${allowedStatuses.join(', ')}.`);
        }

        const { role, permissions } = await workflowService.getUserAccess(userId);

        const workflow = await prisma.workflow.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!workflow) {
            throw new Error("Workflow not found.");
        }

        const isCreator = workflow.createdByUserId === userId;

        // Role-based permission checks
        if (role === 'MEMBER') {
            if (status === 'PAUSED' && !isCreator) {
                throw new Error("Access Denied: Team Members can only pause workflows they created.");
            }
            if (status === 'ACTIVE' && !isCreator) {
                throw new Error("Access Denied: Only the workflow owner or an Admin can activate this paused workflow.");
            }
            if (status === 'DRAFT' && !isCreator) {
                throw new Error("Access Denied: Team Members can only update status of their own workflows.");
            }
        }

        return await prisma.workflow.update({
            where: { id },
            data: {
                status
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
                    const allowedList = Array.isArray(permissions?.allowedWorkflowIds) ? permissions.allowedWorkflowIds : [];
                    const allowedIds = allowedList
                        .filter((item: any) => typeof item === 'string' || (item && item.canView !== false))
                        .map((item: any) => typeof item === 'string' ? item : item.workflowId)
                        .filter(Boolean);

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
                return {
                    ...workflow,
                    userPermissions: {
                        canEdit: workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'edit'),
                        canRename: workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'rename'),
                        canDelete: workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'delete'),
                        canExecute: workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'execute'),
                        canViewExecutionLogs: workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'view_logs'),
                    }
                };
        
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

        if (workflow.status === 'PAUSED') {
            throw new Error("Cannot execute a paused workflow. Please activate the workflow before running.");
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
        await enqueWorkflowJob(execution.id , workflowId , orgId, undefined, undefined, false, userId);
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

        const isOwner = workflow.createdByUserId === userId;
        const canViewAllLogs = isOwner || 
            role === 'ADMIN' || 
            role === 'SINGLE' || 
            permissions?.canViewTeamExecutions === true || 
            workflowService.hasWorkflowAccess(workflow, userId, role, permissions, 'view_logs');
            
        if (!canViewAllLogs) {
            whereClause.triggeredByUserId = userId; // Can only view own executions
        }

        const executions = await prisma.workflowExecution.findMany({
            where: whereClause,
            include: {
                logs: true,
                triggeredByUser: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: {
                startedAt: 'desc'
            }
        });

        return {
            executions,
            scope: canViewAllLogs ? 'TEAM' : 'OWN_ONLY',
            canViewTeamExecutions: canViewAllLogs,
            isOwner,
            message: canViewAllLogs 
                ? 'Showing all team execution runs.' 
                : 'Showing your own execution runs only. Team execution logs are restricted.'
        };
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

        if (workflow.status === 'PAUSED') {
            throw new Error("Cannot execute a paused workflow. Please activate the workflow before running.");
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
        await enqueWorkflowJob(execution.id, workflowId, orgId, targetNodeId, undefined, false, userId);
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

        if (workflow.status === 'PAUSED') {
            throw new Error("Cannot execute a paused workflow. Please activate the workflow before running.");
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
            true, // isReplay: true
            userId
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