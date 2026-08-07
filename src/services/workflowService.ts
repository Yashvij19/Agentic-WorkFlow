import {prisma} from '../utils/db';

import { validateDag } from '../utils/dag';

import { enqueWorkflowJob } from '../queues/workflowQueue';
import { exec } from 'node:child_process';

export class workflowService{

    static async createWorkflow(orgId:string , name:string , nodes:any[] , edges:any[]){


        //validata the graph

        const dagCheck =validateDag(nodes , edges);
        if(!dagCheck.isValid){
            throw new Error (dagCheck.error||"Invalid workflow DAG structure.");
        }

        return await prisma.workflow.create({
            data:{
                name:name||'Untitled Agentic Workflow',
                nodesJson:nodes,
                dagJson:edges,
                organizationId:orgId,
                status:'ACTIVE',
            }
        });

    }

    static async getWorkflows(orgId:string){
        return await prisma.workflow.findMany({
            where:{
                organizationId:orgId
            },
            orderBy:{
                createdAt:'desc'
            }
        });
    }

    static async getWorkflowById(orgId:string , id:string){
        return await prisma.workflow.findFirst({
            where:{
                id:id,
                organizationId:orgId
            }
        });
    }

    static async triggerExecution(orgId:string , workflowId:string){
        const workflow=await prisma.workflow.findFirst({
            where:{id:workflowId, organizationId:orgId},
        });

        if(!workflow){
            throw new Error("Workflow not found.")
        }

        // 2. Create the PENDING run record in DB
        const execution=await prisma.workflowExecution.create({
            data:{
                workflowId , 
                organizationId:orgId ,
                status:'PENDING',
            },
        });

        // 3. Enqueue the execution task to BullMQ
    // Fix note: passing execution.organizationId ensuring spelling matches org ID structure

    await enqueWorkflowJob(execution.id , workflowId , orgId);
    return execution;
    }

    static async getExecutionHistory(workflowId:string , orgId:string){
       return await prisma.workflowExecution.findMany({
            where:{
                workflowId:workflowId,
                organizationId:orgId
            },
            include:{
                logs:true
            },
            orderBy:{
                startedAt:'desc'
            }
        });
    }
}