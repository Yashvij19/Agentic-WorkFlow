import { Queue } from "bullmq";
import { redisConnection } from "../utils/redis";

export const WORKFLOW_QUEUE_NAME='workflow-executions';

export const workflowQueue = new Queue(WORKFLOW_QUEUE_NAME , {
    connection:redisConnection,
   defaultJobOptions:{
    attempts:3,  // Automatically retry a job 3 times if it fails
    backoff:{
        type:"exponential",
        delay:2000, // Wait 2s, then 4s, then 8s between retries
    },
    removeOnComplete:true, // Keep Redis clean by removing successful jobs
    removeOnFail:false   // Keep failed jobs in Redis so we can inspect them
   },

});

export async function enqueWorkflowJob(executionId:string , workflowId:string , organizationID:string) {
    
    await workflowQueue.add(`execute-${executionId}`,{
        executionId , workflowId , organizationID
    });
}