import { Worker , Job } from "bullmq";
import { redisConnection, redisPublisher } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import {prisma} from '../utils/db'
import { injectVariables } from "../utils/interpolation";
import { executeAiAgent } from "../utils/aiAgent";
import { timeStamp } from "node:console";

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
    if (completedNodes.has(step.id)) {
      console.log(`⏩ [Worker] Skipping '${step}' - Already completed in a previous run.`);
      continue;
    }
    broadcastTelemetry(executionId, step.id, 'RUNNING', `Starting execution of ${step.id}`);
    console.log(`⏳ [Worker] Executing step: '${step}'...`);
    let stepResult: any = null;

    if (step.type === 'agent' && step.data.prompt) {
      const hydratedPrompt = injectVariables(step.data.prompt, workflowContext);
      console.log(`🧠 [Agent] Original Prompt: ${step.data.prompt}`);
      console.log(`✨ [Agent] Hydrated Prompt: ${hydratedPrompt}`);
      // const encryptedKey = step.data.encryptedKey || process.env.ENCRYPTED_OPENAI_KEY;
      const encryptedKey = process.env.ENCRYPTED_OPENAI_KEY;


      if (encryptedKey) {
        console.log(`📡 [Agent] Calling OpenAI API...`);
        const aiResponse = await executeAiAgent({
          prompt: hydratedPrompt,
          encryptedApiKey: encryptedKey
        });
        stepResult = aiResponse.output;
        console.log(`🤖 [Agent Output]: "${stepResult}"`);
        console.log(`📊 [Metrics] Duration: ${aiResponse.durationMs}ms | Tokens: ${aiResponse.usage.totalTokens}`);
      }
      else {

        console.warn(`⚠️ [Agent] No API Key provided. Falling back to mock execution.`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        stepResult = `[Mock AI Response for: ${hydratedPrompt}]`;
      }
    }else{
      stepResult = step.data.output || 'Step completed successfully.';
    }

    
    workflowContext[step.id] = { output: stepResult };

    await prisma.executionLog.create({
      data: {
        executionId,
        nodeId: step.id,
        status: 'COMPLETED',
        outputData: { result: workflowContext[step.id] }
      }
    });

    broadcastTelemetry(executionId, step.id, 'COMPLETED', `Step ${step.id} finished successfully.`)
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
    concurrency:10,
})

worker.on('completed',(job)=>{
    console.log(`🟢 [Queue] Job ${job.id} completed successfully.`);
})

worker.on("failed", async (job, err) => {
  if (!job) return

  const { executionId } = job.data
  // job.attemptsMade tells us how many times it has tried so far
  // job.opts.attempts tells us the maximum allowed tries (3)  , built in bull mq methods

  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    console.error(`☠️ [DLQ] Job ${executionId} failed permanently. Moving to Dead Letter Queue.`);
    console.error(`   Error details: ${err.message}`);

    await prisma.workflowExecution.update({
      where: {
        id: executionId
      },
      data: {
        status: 'FAILED',
        completedAt: new Date()
      }
    });
  } else {
    console.warn(`⚠️ [Retry] Job ${executionId} failed (Attempt ${job.attemptsMade}). Retrying in a few seconds...`);
  }
});

  function broadcastTelemetry(executionId:string , nodeId:string , status:string , message?:string){
    const payload=JSON.stringify({
      executionId,
      nodeId,
      status,
      message, 
      timeStamp:new Date().toISOString()
    });

    redisPublisher.publish('telemetry', payload);
  }





