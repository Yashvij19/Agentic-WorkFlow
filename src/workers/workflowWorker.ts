import { Worker , Job } from "bullmq";
import { redisConnection, redisPublisher } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import {prisma} from '../utils/db'
import { injectVariables } from "../utils/interpolation";


import 'dotenv/config';



import { nodeRegistry, ExecutionContext } from '../nodes';

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


// Recursively collect the target node and all of its ancestors

function resolveAncestors(targetId:string , edges:any[]):Set<string>{
  const ancestors=new Set<string>();
  function dfs(nodeId:string){
    ancestors.add(nodeId);

    const parents=edges.filter(e=>e.target===nodeId).map(e=>e.source);

    parents.forEach(pId=>{
      if(!ancestors.has(pId)){
        dfs(pId);
      }
    });
  }
  dfs(targetId);
  return ancestors;
}




const processWorkflow = async (job: Job) => {

  const { executionId, workflowId, organizationId  , targetNodeId} = job.data;

  console.log(`\n👨‍🍳 [Worker] Picked up execution: ${executionId}`);
  console.log(`📂 [Worker] Workflow ID: ${workflowId} | Org ID: ${organizationId}`);

  
  const orgId=organizationId;
   if (targetNodeId){
      console.log(`🎯 [Worker] Target execution node: ${targetNodeId}`);
   } 

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

  // 4. Resolve sub-graph filter if targetNodeId is specified

  let nodesToExecute=sortedNodes;
  if(targetNodeId){
    console.log(`🎯 [Worker] Computing dependency tree for node: ${targetNodeId}`);
    const ancestors = resolveAncestors(targetNodeId , edges);
    nodesToExecute=sortedNodes.filter(node=>ancestors.has(node.id));
    console.log(`🎯 [Worker] Sub-graph execution path: ${nodesToExecute.map(n => n.id).join(' -> ')}`);
  }

  // 5. Hydrate previous steps' logs (idempotency/memory recovery)

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

  // 6. Execute steps sequentially
  for (const node of nodesToExecute) {
    if (completedNodes.has(node.id)) {
      console.log(`⏩ [Worker] Skipping '${node.id}' - Already completed in a previous run.`);
      continue;
    }
    broadcastTelemetry(orgId, executionId,node.id, 'RUNNING', `Executing step: ${node.id}`);
   
    let stepResult: any = null;
try{
  // 1. Fetch organization credentials once
     const orgCredentials = await prisma.credential.findMany({
        where: { organizationId: orgId },
      });
      const credentialsMap: Record<string, string> = {};
      orgCredentials.forEach(c => {
        credentialsMap[c.name] = c.encryptedData;
      });

       // 2. Resolve direct inputs from parent nodes
         const parentEdges = edges.filter((e: any) => e.target === node.id);
      let directInputs: any = {};
      if (parentEdges.length === 1) {
        const parentId = parentEdges[0].source;
        directInputs = workflowContext[parentId]?.output ?? workflowContext[parentId] ?? {};
      } else if (parentEdges.length > 1) {
        parentEdges.forEach((e: any) => {
          directInputs[e.source] = workflowContext[e.source]?.output ?? workflowContext[e.source];
        });
      }

      // 3. Build the Execution Context (The Toolbox)
      const ctx: ExecutionContext = {
        executionId,
        workflowId,
        orgId,
        nodeId: node.id,
        workflowContext,
        credentials: credentialsMap,
        emitTelemetry: (status, message, data) => {
          broadcastTelemetry(orgId, executionId, node.id, status, message, data);
        },
      };

       // 🔌 4. Universal Node Execution via Strategy Pattern!
      const executor = nodeRegistry.get(node.type);
      if (executor) {
        const result = await executor.execute(node.data, directInputs, ctx);
        if (!result.success && result.error) {
          throw new Error(result.error);
        }
        stepResult = result.output;
      } else {
        // Fallback for simple/unregistered pass-through nodes
        console.warn(`⚠️ [Worker] No executor found for type '${node.type}'. Using raw node data.`);
        stepResult = node.data?.output || null;
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
      broadcastTelemetry(orgId, executionId, node.id, 'COMPLETED', `Step ${node.id} finished successfully.`);

      
    
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
function broadcastTelemetry(orgId: string, executionId: string, nodeId: string, status: string, message?: string, data?: any) {
  const payload = JSON.stringify({
    organizationId: orgId,
    executionId,
    nodeId,
    status,
    message,
    data,
    timeStamp: new Date().toISOString()
  });
  redisPublisher.publish('telemetry', payload);
}




