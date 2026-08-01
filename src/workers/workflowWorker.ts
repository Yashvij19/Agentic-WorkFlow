import { Worker , Job } from "bullmq";
import { redisConnection } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import {prisma} from '../utils/db'

// A mock array of steps for our workflow
const   WORKFLOW_STEPS =["fetch_data" , "analyze_with_ai","send_slack_message"]
const processWorkflow = async (job: Job) => {

  const { executionId, workflowId, organizationId } = job.data;

  console.log(`\n👨‍🍳 [Worker] Picked up execution: ${executionId}`);
  console.log(`📂 [Worker] Workflow ID: ${workflowId} | Org ID: ${organizationId}`);


  const pastEvents = await prisma.executionLog.findMany({
    where: { executionId },
    select: { nodeId: true, status: true }
  })

  const completedNodes = new Set(
    pastEvents.filter(e => e.status === 'COMPLETED').map(e => e.nodeId)
  )

  for (const step of WORKFLOW_STEPS) {
    if (completedNodes.has(step)) {
      console.log(`⏩ [Worker] Skipping '${step}' - Already completed in a previous run.`);
      continue;
    }

    console.log(`⏳ [Worker] Executing step: '${step}'...`);

    // Simulate the heavy AI/Network work
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (Math.random() < 0.1) {
      throw new Error('Simulated API Rate Limit or Timeout!');
    }

    await prisma.executionLog.create({
      data: {
        executionId,
        nodeId: step,
        status: 'COMPLETED',
        outputData: { result: `Success data from ${step}` }
      }
    });

    console.log(`✅ [Worker] Finished and saved step: '${step}'`);


  }
// If we exit the loop, the entire workflow is done!
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });
  return { success: true };

}
// Initialize the Worker
const worker=new Worker(WORKFLOW_QUEUE_NAME , processWorkflow,{
    connection:redisConnection, 
    concurrency:5,
})

worker.on('completed',(job)=>{
    console.log(`🟢 [Queue] Job ${job.id} completed successfully.`);
})

worker.on("failed",async (job,err)=>{
if(!job) return

const {executionId}=job.data
// job.attemptsMade tells us how many times it has tried so far
  // job.opts.attempts tells us the maximum allowed tries (3)  , built in bull mq methods

  if(job.attemptsMade >=(job.opts.attempts|| 3)){
    console.error(`☠️ [DLQ] Job ${executionId} failed permanently. Moving to Dead Letter Queue.`);
    console.error(`   Error details: ${err.message}`);

    await prisma.workflowExecution.update({
      where:{
        id:executionId
      },
      data:{
        status:'FAILED',
        completedAt:new Date()
      }
    });
  }else{
    console.warn(`⚠️ [Retry] Job ${executionId} failed (Attempt ${job.attemptsMade}). Retrying in a few seconds...`);
  }
  });





