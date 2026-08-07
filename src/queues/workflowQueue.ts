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
        // 1. The Job Payload (What the worker needs to do the job)
        executionId , workflowId , organizationID
    },
    
    // 2. The Job Options (How Redis should handle this specific job)
    {
        group:{
            name:organizationID
        },

        // We also add a unique jobId to prevent the EXACT same execution from 
      // being accidentally added to the queue twice (Queue-level idempotency!)
        jobId:executionId
    }


);

}