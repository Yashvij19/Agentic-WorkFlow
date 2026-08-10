import { Worker , Job } from "bullmq";
import { redisConnection, redisPublisher } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import {prisma} from '../utils/db'
import { injectVariables } from "../utils/interpolation";
import { executeAiAgent } from "../utils/aiAgent";
import { error, timeStamp } from "node:console";
import 'dotenv/config';
// A mock array of steps for our workflow
function topologicalSort(nodes:any[] , edges:any[]):any[]{
  const inDegree=new Map<string , number>();
  const adjList=new Map<string , string[]>();

  // Initialize maps
  nodes.forEach(n=>{
    inDegree.set(n.id , 0);
    adjList.set(n.id,[]);
  })

   // Populate maps

   edges.forEach(e=>{
    if(adjList.has(e.source)){
      adjList.get(e.source)!.push(e.target); // ! this is teoperator that check that adjList.get(e.source) does not give null 
    }
    inDegree.set(e.target , (inDegree.get(e.target)||0)+1);
   });

   // Collect nodes with no incoming dependencies 
   const queue:string[]=[];
   inDegree.forEach((degree,nodeId)=>{
    if(degree==0) queue.push(nodeId);
   });

     const orderedNodeIds: string[] = [];

     while(queue.length>0){
      const currentId=queue.shift()!;
      orderedNodeIds.push(currentId);

      const neighbor=adjList.get(currentId)||[];

      neighbor.forEach(neighborId=>{
        const newDegree=(inDegree.get(neighborId)||0) - 1;
        inDegree.set(neighborId , newDegree);

        if(newDegree===0){
          queue.push(neighborId);
        }
      });
     }

      // If sorted size is different, the graph is cyclic (invalid)

      if(orderedNodeIds.length !== nodes.length){
        throw new Error("Loop detected in workflow graph during execution sorting.");
      }

      const nodeMap = new Map(nodes.map(node => [node.id, node]));

        // Map IDs back to complete Node definitions

        return orderedNodeIds.map(id => nodeMap.get(id)!);


}
const processWorkflow = async (job: Job) => {

  const { executionId, workflowId, organizationId } = job.data;

  console.log(`\n👨‍🍳 [Worker] Picked up execution: ${executionId}`);
  console.log(`📂 [Worker] Workflow ID: ${workflowId} | Org ID: ${organizationId}`);
  const orgId=organizationId;

  // 1. Mark the execution state as RUNNING in DB
      await prisma.workflowExecution.update({
        where:{
          id:executionId
        },
        data:{
          status:'RUNNING'
        }
      })

    
  // 2. Load the workflow from DB

  const workflow=await prisma.workflow.findFirst({
    where:{
      id:workflowId , 
      organizationId:orgId
    }
  })

  if(!workflow){
    throw new Error(`Workflow ${workflowId} not found in database for org ${orgId}.`)
  }

  const nodes=workflow.nodesJson as any[];
  const edges=workflow.dagJson as any[];

  // 3. Resolve execution order
  const sortedNodes=topologicalSort(nodes , edges);

  // 4. Hydrate previous steps' logs (idempotency/memory recovery)

  const pastLogs=await prisma.executionLog.findMany({
    where:{
      executionId
    },
    select:{
      nodeId:true ,status:true , outputData:true
    }
  });

  const workflowContext: Record<string, any> = {};
  const completedNodes = new Set<string>();

  
  pastLogs.forEach(log => {
    if (log.status === 'COMPLETED') {
      completedNodes.add(log.nodeId);
      if (log.outputData) {
        workflowContext[log.nodeId] = (log.outputData as any).result; // Hydrate the memory!
      }
    }
  });

  // 5. Execute steps sequentially
  for (const node of sortedNodes) {
    if (completedNodes.has(node.id)) {
      console.log(`⏩ [Worker] Skipping '${node.id}' - Already completed in a previous run.`);
      continue;
    }
    broadcastTelemetry(orgId, executionId,node.id, 'RUNNING', `Executing step: ${node.id}`);
   
    let stepResult: any = null;
try{
    if (node.type === 'agent') {
      const promptText=node.data.prompt||'';
      // Inject results from parent steps e.g. {{node_1.output}}
      const hydratedPrompt = injectVariables(promptText ,workflowContext);

      console.log(`✨ [Agent] Hydrated Prompt: "${hydratedPrompt}"`);

      // Check organization credentials for Gemini Key
  

      const credentials=await prisma.credential.findFirst({
        where:{
          organizationId:orgId, name:"GEMINI_API_KEY"
        }
      });

      let encryptedKey:string|null=null;

      if(credentials){
        encryptedKey=credentials.encryptedData;
      }

      if (encryptedKey) {
        console.log(`📡 [Agent] Calling Gemini API...`);
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
      stepResult = node.data.output || '';
    }

    // Save step result into execution context
    workflowContext[node.id] = { output: stepResult };

     // Write execution log
    await prisma.executionLog.create({
      data: {
        executionId,
        nodeId: node.id,
        status: 'COMPLETED',
        outputData: { result: workflowContext[node.id] }
      }
    });

    broadcastTelemetry(orgId,executionId, node.id, 'COMPLETED', `Step ${node.id} finished successfully.`)
    
} catch (nodeError: any) {
  console.error(`☠️ [Worker] Step ${node.id} failed:`, nodeError.message);
  await prisma.executionLog.create({

    data: {
      executionId,
      nodeId: node.id,
      status: 'FAILED',
      outputData: { error: nodeError.message }
    }
  });
  broadcastTelemetry(orgId, executionId, node.id, 'FAILED', `Step ${node.id} failed: ${nodeError.message}`);
  //  Mark entire run as FAILED in DB and abort

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'FAILED',
      completedAt: new Date()
    }
  });
  throw nodeError; // Re-throw to fail the BullMQ job
}
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

// Publishes status details, including the organizationId for multi-tenant websocket security
  function broadcastTelemetry(orgId: string, executionId: string, nodeId: string, status: string, message?: string) {
  const payload = JSON.stringify({
    organizationId: orgId,
    executionId,
    nodeId,
    status,
    message,
    timeStamp: new Date().toISOString()
  });

    redisPublisher.publish('telemetry', payload);
  }





