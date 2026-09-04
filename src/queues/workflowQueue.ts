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
    removeOnFail: {
        count: 1000, // Retain at most 1,000 failed jobs in Redis RAM to prevent memory overflow
        age: 3 * 24 * 3600 // Auto-expire failed jobs from Redis cache after 7 days (Postgres keeps permanent history)
    }
   },

});

export async function enqueWorkflowJob(
    executionId: string, 
    workflowId: string, 
    organizationId: string, 
    targetNodeId?: string, 
    resumeDownstream?: boolean,
    isReplay?: boolean,
    triggeredByUserId?: string
) {
    try {
        const existingJob = await workflowQueue.getJob(executionId);
        if (existingJob) {
            await existingJob.remove();
            console.log(`🧹 [Queue] Removed existing job ${executionId} before re-enqueuing.`);
        }
    } catch (err: any) {
        console.warn(`⚠️ [Queue] Error removing job ${executionId}:`, err.message);
    }

    await workflowQueue.add(
        `execute-${executionId}`,
        {
            executionId, 
            workflowId, 
            organizationId, 
            targetNodeId,
            resumeDownstream,
            isReplay,
            triggeredByUserId
        },
        {
            jobId: executionId
        }
    );
}