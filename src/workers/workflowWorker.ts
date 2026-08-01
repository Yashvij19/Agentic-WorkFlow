import { Worker , Job } from "bullmq";
import { redisConnection } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import { resolve } from "node:dns";
import { error } from "node:console";



const processWorkflow= async (job:Job)=>{

    const {executionId , workflowId , organizationId}=job.data;

    console.log(`\n👨‍🍳 [Worker] Picked up execution: ${executionId}`);
  console.log(`📂 [Worker] Workflow ID: ${workflowId} | Org ID: ${organizationId}`);

  console.log(`⏳ [Worker] Simulating heavy AI processing...`);


  await new Promise((resolve)=> setTimeout(resolve ,3000));

  if(Math.random()<0.1){
    throw new Error('Simulated API Rate Limit or Timeout!');
  }


  console.log(`✅ [Worker] Finished execution: ${executionId}`);
  return { success: true, finishedAt: new Date().toISOString() };


}

const worker=new Worker(WORKFLOW_QUEUE_NAME , processWorkflow,{
    connection:redisConnection, 
    concurrency:5,
})

worker.on('completed',(job)=>{
    console.log(`🟢 [Queue] Job ${job.id} completed successfully.`);
})

worker.on("failed",(job,err)=>{
console.error(`🔴 [Queue] Job ${job?.id} failed with error: ${err.message}`);
})

console.log('👷 [Worker Node] Started and listening for jobs...');