import { Worker , Job } from "bullmq";
import { redisConnection } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import {prisma} from '../utils/db'
import { injectVariables } from "../utils/interpolation";

// A mock array of steps for our workflow
const WORKFLOW_STEPS = [
  { id: 'node_1', type: 'trigger', data: { output: 'The customer is extremely angry about the late delivery.' } },
  { id: 'node_2', type: 'agent', data: { prompt: 'Analyze the sentiment of this text: {{node_1.output}}' } }
];
const processWorkflow = async (job: Job) => {

  const { executionId, workflowId, organizationId } = job.data;

  console.log(`\n👨‍🍳 [Worker] Picked up execution: ${executionId}`);
  console.log(`📂 [Worker] Workflow ID: ${workflowId} | Org ID: ${organizationId}`);


  const pastEvents = await prisma.executionLog.findMany({
    where: { executionId },
    select: { nodeId: true, status: true , outputData: true }
  })

  const workflowContext: Record<string, any> = {};
  const completedNodes = new Set();
  
  pastEvents.forEach(e => {
    if (e.status === 'COMPLETED') {
      completedNodes.add(e.nodeId);
      if (e.outputData) {
        workflowContext[e.nodeId] = (e.outputData as any).result; // Hydrate the memory!
      }
    }
  });

  for (const step of WORKFLOW_STEPS) {
    if (completedNodes.has(step)) {
      console.log(`⏩ [Worker] Skipping '${step}' - Already completed in a previous run.`);
      continue;
    }

    console.log(`⏳ [Worker] Executing step: '${step}'...`);

    if (step.type === 'agent' && step.data.prompt) {
      const hydratedPrompt = injectVariables(step.data.prompt, workflowContext);
      console.log(`🧠 [Agent] Original Prompt: ${step.data.prompt}`);
      console.log(`✨ [Agent] Hydrated Prompt: ${hydratedPrompt}`);
    }

    // Simulate the heavy AI/Network work
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (Math.random() < 0.1) {
      throw new Error('Simulated API Rate Limit or Timeout!');
    }

    const stepResult = step.type === 'trigger' ? step.data.output : 'Sentiment is: NEGATIVE';
    workflowContext[step.id] = { output: stepResult };

    await prisma.executionLog.create({
      data: {
        executionId,
        nodeId: step.id,
        status: 'COMPLETED',
        outputData: { result: workflowContext[step.id] }
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





