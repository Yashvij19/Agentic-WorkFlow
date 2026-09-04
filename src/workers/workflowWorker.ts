import { Worker, Job, UnrecoverableError } from "bullmq";
import { redisConnection, redisPublisher } from "../utils/redis";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue";
import { prisma } from '../utils/db'
import { injectVariables } from "../utils/interpolation";
import 'dotenv/config';
import { nodeRegistry, ExecutionContext } from '../nodes';

/**
 * 🛡️ Determines whether an error is permanent (unrecoverable)
 * or transient (safe to retry with exponential backoff).
 */
function isNonRetryableError(err: any): boolean {
  if (err instanceof UnrecoverableError || err?.name === 'UnrecoverableError') return true;
  const msg = (err.message || '').toLowerCase();

  // 1. Missing or invalid credentials, tokens, and API keys
  const isAuthOrSecretIssue =
    (msg.includes('missing') && (msg.includes('credential') || msg.includes('key') || msg.includes('token'))) ||
    msg.includes('gemini_api_key') ||
    msg.includes('invalid api key') ||
    msg.includes('invalid token') ||
    msg.includes('token invalid') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('http 401') ||
    msg.includes('http 403');

  // 2. Client configuration, bad request, endpoint not found, or syntax errors
  const isClientConfigIssue =
    msg.includes('http 400') ||
    msg.includes('http 404') ||
    msg.includes('http 405') ||
    msg.includes('http 422') ||
    msg.includes('bad request') ||
    msg.includes('not found') ||
    msg.includes('url is required') ||
    msg.includes('syntaxerror');

  // 3. Guardrail self-correction loop exhausted after max internal retries
  const isGuardrailExhausted =
    msg.includes('guardrail') && msg.includes('permanently');

  return isAuthOrSecretIssue || isClientConfigIssue || isGuardrailExhausted;
}

// A mock array of steps for our workflow
function topologicalSort(nodes: any[], edges: any[]): any[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize maps
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  })

  // Populate maps

  edges.forEach(e => {
    if (adjList.has(e.source)) {
      adjList.get(e.source)!.push(e.target); // ! this is teoperator that check that adjList.get(e.source) does not give null 
    }
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // Collect nodes with no incoming dependencies 
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree == 0) queue.push(nodeId);
  });

  const orderedNodeIds: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    orderedNodeIds.push(currentId);

    const neighbor = adjList.get(currentId) || [];

    neighbor.forEach(neighborId => {
      const newDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, newDegree);

      if (newDegree === 0) {
        queue.push(neighborId);
      }
    });
  }

  // If sorted size is different, the graph is cyclic (invalid)

  if (orderedNodeIds.length !== nodes.length) {
    throw new Error("Loop detected in workflow graph during execution sorting.");
  }

  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  // Map IDs back to complete Node definitions

  return orderedNodeIds.map(id => nodeMap.get(id)!);


}


// Recursively collect the target node and all of its ancestors

function resolveAncestors(targetId: string, edges: any[]): Set<string> {
  const ancestors = new Set<string>();
  function dfs(nodeId: string) {
    ancestors.add(nodeId);

    const parents = edges.filter(e => e.target === nodeId).map(e => e.source);

    parents.forEach(pId => {
      if (!ancestors.has(pId)) {
        dfs(pId);
      }
    });
  }
  dfs(targetId);
  return ancestors;
}

// Recursively collect the target node and all of its downstream children
function resolveDownstreamNodes(startNodeId: string, edges: any[]): Set<string> {
  const downstream = new Set<string>();
  const queue: string[] = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    // Find all edges where source is current
    const children = edges.filter((e: any) => e.source === current).map((e: any) => e.target);
    for (const child of children) {
      if (!downstream.has(child)) {
        downstream.add(child);
        queue.push(child);
      }
    }
  }
  return downstream;
}


/**
 * 🔄 Resolves the loop sub-graph child nodes connected to a ForEach node.
 * 1. Follows the edge connected to the 'loop' handle.
 * 2. Collects all downstream nodes in that branch until terminal nodes.
 * 3. Excludes any nodes that belong to the 'done' handle branch.
 * 4. Returns the loop nodes sorted in topological dependency order.
 */
function resolveLoopSubGraph(
  forEachNodeId: string,
  edges: any[],
  nodes: any[]
): { loopNodes: any[]; loopNodeIds: Set<string>; doneNodeIds: Set<string> } {
  // 1. Identify all outgoing edges from this ForEach node
  const outgoingEdges = edges.filter((e: any) => e.source === forEachNodeId);

  // 2. Separate edges by handle ('loop' vs 'done')
  const loopEdge = outgoingEdges.find(
    (e: any) => e.sourceHandle === 'loop' || (outgoingEdges.length === 1 && e.sourceHandle !== 'done')
  );
  const doneEdge = outgoingEdges.find((e: any) => e.sourceHandle === 'done');

  // 3. Collect all nodes that belong to the 'done' branch (to never include them in the loop)
  const doneNodeIds = new Set<string>();
  if (doneEdge) {
    const downstreamOfDone = resolveDownstreamNodes(doneEdge.target, edges);
    downstreamOfDone.forEach(id => doneNodeIds.add(id));
    doneNodeIds.add(doneEdge.target);
  }

  // 4. Trace the loop branch starting from the loopEdge target
  const loopNodeIds = new Set<string>();
  if (loopEdge) {
    const queue: string[] = [loopEdge.target];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!doneNodeIds.has(current) && !loopNodeIds.has(current)) {
        loopNodeIds.add(current);
        const children = edges.filter((e: any) => e.source === current).map((e: any) => e.target);
        for (const child of children) {
          if (!doneNodeIds.has(child) && !loopNodeIds.has(child)) {
            queue.push(child);
          }
        }
      }
    }
  }

  // 5. Preserve topological execution order inside the sub-graph
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const sortedLoopNodes: any[] = [];

  if (loopNodeIds.size > 0) {
    const subEdges = edges.filter((e: any) => loopNodeIds.has(e.source) && loopNodeIds.has(e.target));
    const subNodes = Array.from(loopNodeIds).map(id => nodeMap.get(id)!);
    try {
      sortedLoopNodes.push(...topologicalSort(subNodes, subEdges));
    } catch {
      // Fallback: If no internal dependencies exist between sub-nodes
      sortedLoopNodes.push(...subNodes);
    }
  }

  return { loopNodes: sortedLoopNodes, loopNodeIds, doneNodeIds };
}



const processWorkflow = async (job: Job) => {

  const { executionId, workflowId, organizationId, targetNodeId, resumeDownstream, isReplay, triggeredByUserId } = job.data;

  console.log(`\n👨‍🍳 [Worker] Picked up execution: ${executionId}`);
  console.log(`📂 [Worker] Workflow ID: ${workflowId} | Org ID: ${organizationId}`);


  const orgId = organizationId;
  if (targetNodeId) {
    console.log(`🎯 [Worker] Target execution node: ${targetNodeId}`);
  }

  // 1. Mark the execution state as RUNNING in DB
  await prisma.workflowExecution.update({
    where: {
      id: executionId
    },
    data: {
      status: 'RUNNING'
    }
  })


  // 2. Load the workflow from DB

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      organizationId: orgId
    }
  })

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found in database for org ${orgId}.`)
  }

  const nodes = workflow.nodesJson as any[];
  const edges = workflow.dagJson as any[];

  // 3. Resolve execution order
  const sortedNodes = topologicalSort(nodes, edges);

  // 4. Resolve sub-graph filter if targetNodeId is specified

  let nodesToExecute = sortedNodes;
  let effectiveTargetId = targetNodeId;

  if (targetNodeId) {
    // 🔀 Smart Loop Replay Auto-Routing:
    // If targetNodeId is inside a ForEach loop sub-graph, elevate to the parent ForEach node!
    const forEachNodes = nodes.filter((n: any) => n.type === 'foreach');
    for (const feNode of forEachNodes) {
      const { loopNodeIds } = resolveLoopSubGraph(feNode.id, edges, nodes);
      if (loopNodeIds.has(targetNodeId)) {
        console.log(`🔀 [Worker] Smart Replay: Target '${targetNodeId}' is inside loop of '${feNode.id}'. Elevating replay target to '${feNode.id}'.`);
        effectiveTargetId = feNode.id;
        break;
      }
    }

    if (isReplay) {
      console.log(`🎯 [Worker] Replay triggered for target: ${effectiveTargetId} | resumeDownstream: ${resumeDownstream}`);
      const downstream = resolveDownstreamNodes(effectiveTargetId, edges);
      // We execute the effective target node itself AND its downstream children
      nodesToExecute = sortedNodes.filter(node =>
        node.id === effectiveTargetId || (resumeDownstream && downstream.has(node.id))
      );
      console.log(`🔁 [Worker] Sub-graph Replay path: ${nodesToExecute.map(n => n.id).join(' -> ')}`);
    } else {
      console.log(`🎯 [Worker] Computing dependency tree for node: ${effectiveTargetId}`);
      const ancestors = resolveAncestors(effectiveTargetId, edges);
      nodesToExecute = sortedNodes.filter(node => ancestors.has(node.id));
      console.log(`🎯 [Worker] Sub-graph execution path: ${nodesToExecute.map(n => n.id).join(' -> ')}`);
    }
  }

  // 5. Hydrate previous steps' logs (idempotency/memory recovery)

  const pastLogs = await prisma.executionLog.findMany({
    where: {
      executionId
    },
    select: {
      nodeId: true, status: true, outputData: true
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

  // If this is a replay, ensure the effective target node and all loop child nodes are never marked as completed!
  if (effectiveTargetId && isReplay) {
    completedNodes.delete(effectiveTargetId);
    const forEachNodes = nodes.filter((n: any) => n.type === 'foreach');
    for (const feNode of forEachNodes) {
      if (feNode.id === effectiveTargetId) {
        const { loopNodeIds } = resolveLoopSubGraph(feNode.id, edges, nodes);
        loopNodeIds.forEach(id => completedNodes.delete(id));
      }
    }
  }

  // 6. Execute steps sequentially

  const loopChildNodesToSkip = new Set<string>();

  for (let i = 0; i < nodesToExecute.length; i++) {
       const node = nodesToExecute[i];
    if (completedNodes.has(node.id)) {
      console.log(`⏩ [Worker] Skipping '${node.id}' - Already completed in a previous run.`);
      continue;
    }
    // ⏩ Skip nodes that belong inside a ForEach loop sub-graph
    if (loopChildNodesToSkip.has(node.id)) {
      console.log(`⏩ [Worker] Skipping '${node.id}' - Handled internally by its parent ForEach loop.`);
      continue;
    }

    broadcastTelemetry(orgId, executionId, node.id, 'RUNNING', `Executing step: ${node.id}`, undefined, triggeredByUserId);

    let stepResult: any = null;
    try {
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
        //  Inject correction feedback if retrying after a guardrail rejection
        correctionFeedback: workflowContext[`${node.id}_correction`],
        emitTelemetry: (status, message, data) => {
          broadcastTelemetry(orgId, executionId, node.id, status, message, data, triggeredByUserId);
        },
      };

      // 🔄 ForEach Sub-Graph Discovery & Scoped Runner Injection
      if (node.type === 'foreach') {
        const { loopNodes, loopNodeIds } = resolveLoopSubGraph(node.id, edges, nodes);

        // Tell the outer worker loop to never run these child nodes on the main line
        loopNodeIds.forEach(id => loopChildNodesToSkip.add(id));

        console.log(`🔄 [Worker] ForEach '${node.id}' identified ${loopNodes.length} loop child node(s): [${loopNodes.map(n => n.id).join(', ')}]`);

        // Inject the subGraphRunner callback into the execution context
        (ctx as any).subGraphRunner = async (
          item: any,
          index: number,
          aliases: { itemAlias: string; indexAlias: string }
        ) => {
          // 1. Create an isolated, scoped memory sandbox for this specific item!
          const iterationContext: Record<string, any> = {
            ...workflowContext,
            [aliases.itemAlias]: item,
            [aliases.indexAlias]: index,
            $item: item,
            $index: index,
          };

          let lastSubResult = item;

          // 2. Execute each sub-node in the loop branch sequentially for this item
          for (const subNode of loopNodes) {
            // Resolve direct inputs for this sub-node
            const parentEdges = edges.filter((e: any) => e.target === subNode.id);
            let subDirectInputs: any = {};

            if (parentEdges.length === 1) {
              const parentId = parentEdges[0].source;
              if (parentId === node.id) {
                // Directly wired to the ForEach node -> receives the single item!
                subDirectInputs = item;
              } else {
                subDirectInputs = iterationContext[parentId]?.output ?? iterationContext[parentId] ?? {};
              }
            } else if (parentEdges.length > 1) {
              parentEdges.forEach((e: any) => {
                if (e.source === node.id) {
                  subDirectInputs[e.source] = item;
                } else {
                  subDirectInputs[e.source] = iterationContext[e.source]?.output ?? iterationContext[e.source];
                }
              });
            }

            // Build scoped execution context for the child node
            const subCtx: ExecutionContext = {
              executionId,
              workflowId,
              orgId,
              nodeId: subNode.id,
              workflowContext: iterationContext,
              credentials: credentialsMap,
              correctionFeedback: iterationContext[`${subNode.id}_correction`],
              emitTelemetry: (status, message, data) => {
                broadcastTelemetry(
                  orgId,
                  executionId,
                  subNode.id,
                  status,
                  `[Item #${index + 1}] ${message}`,
                  data,
                  triggeredByUserId
                );
              },
            };

            // Execute subNode using universal NodeRegistry
            const subExecutor = nodeRegistry.get(subNode.type);
            if (subExecutor) {
              const subResult = await subExecutor.execute(subNode.data, subDirectInputs, subCtx);
              if (!subResult.success && subResult.error) {
                throw new Error(`[Node ${subNode.id}] ${subResult.error}`);
              }
              iterationContext[subNode.id] = { output: subResult.output };
              lastSubResult = subResult.output;
            } else {
              iterationContext[subNode.id] = { output: subNode.data?.output || null };
              lastSubResult = subNode.data?.output || null;
            }
          }

          // Return the output of the final node in the loop branch
          return lastSubResult;
        };
      }


      // 🔌 4. Universal Node Execution via Strategy Pattern!
      const executor = nodeRegistry.get(node.type);
      if (executor) {
        const result = await executor.execute(node.data, directInputs, ctx);
        if(result.retryFeedback){
          const {targetNodeId , reason , retryCount , maxRetries , shouldRetry , augmentedPrompt} = result.retryFeedback;

          // 1. Record the retry attempt in workflow memory
          workflowContext[`${node.id}_retry_count`] = retryCount;

          if(shouldRetry){
            console.log(`🛡️ [Worker] Guardrail '${node.id}' rejected output. Rewinding to '${targetNodeId}' (Attempt ${retryCount}/${maxRetries}).`);
            console.log(`   Reason: ${reason}`);

               // 2. Attach actionable correction feedback for the target node's next attempt
            workflowContext[`${targetNodeId}_correction`] = augmentedPrompt || reason;

             // 3. Find the target node in our execution path
            const targetIndex = nodesToExecute.findIndex(n => n.id === targetNodeId);
             if (targetIndex !== -1) {
              // Unmark the target node and any intermediary nodes up to the guardrail

              for (let j = targetIndex; j <= i; j++) {
                completedNodes.delete(nodesToExecute[j].id);
              }

              // Broadcast live telemetry so canvas highlights the self-healing retry!
              broadcastTelemetry(
                orgId,
                executionId,
                node.id,
                'RUNNING',
                `🔄 Auto-correcting: Rewinding to '${targetNodeId}' (Attempt ${retryCount}/${maxRetries}): ${reason}`,
                { retryFeedback: result.retryFeedback },
                triggeredByUserId
              );

                // ⏪ REWIND: Set loop counter so next iteration starts at targetIndex
              i = targetIndex - 1;
              continue;

             }else{
              console.warn(`⚠️ [Worker] Target node '${targetNodeId}' not found in execution path.`);
             }
          }else{
             console.error(`☠️ [Worker] Guardrail '${node.id}' exhausted all ${maxRetries} retries.`);
            throw new Error(`Guardrail '${node.id}' failed permanently after ${maxRetries} attempts: ${reason}`);
          }
        }
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
     

      // Write/Update execution log (using upsert to support safe node re-runs!)
      await prisma.executionLog.upsert({
        where: {
          executionId_nodeId: {
            executionId,
            nodeId: node.id,
          },
        },
        update: {
          status: 'COMPLETED',
          outputData: { result: workflowContext[node.id] },
        },
        create: {
          executionId,
          nodeId: node.id,
          status: 'COMPLETED',
          outputData: { result: workflowContext[node.id] },
        },
      });
      broadcastTelemetry(orgId, executionId, node.id, 'COMPLETED', `Step ${node.id} finished successfully.`, undefined, triggeredByUserId);



    } catch (nodeError: any) {
      console.error(`☠️ [Worker] Step ${node.id} failed:`, nodeError.message);
      

        // Use upsert here as well to safely record failure even on retry
      await prisma.executionLog.upsert({
        where: {
          executionId_nodeId: {
            executionId,
            nodeId: node.id,
          },
        },
        update: {
          status: 'FAILED',
          outputData: { error: nodeError.message },
        },
        create: {
          executionId,
          nodeId: node.id,
          status: 'FAILED',
          outputData: { error: nodeError.message },
        },
      });
      broadcastTelemetry(orgId, executionId, node.id, 'FAILED', `Step ${node.id} failed: ${nodeError.message}`, undefined, triggeredByUserId);

      
      // 🛡️ Permanent vs Transient Error Handling
      if (isNonRetryableError(nodeError)) {
        console.warn(`🛑 [Worker] Permanent error detected at node '${node.id}'. Bypassing BullMQ retries: ${nodeError.message}`);

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
          },
        });

        // Abort BullMQ job immediately on attempt 1 without useless retries
        throw new UnrecoverableError(nodeError.message);
      }

      // Transient error (e.g. temporary network drop, rate limit): re-throw standard error so BullMQ retries!
      throw nodeError;
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
const worker = new Worker(WORKFLOW_QUEUE_NAME, processWorkflow, {
  connection: redisConnection,
  concurrency: 10,
})

worker.on('completed', (job) => {
  console.log(`🟢 [Queue] Job ${job.id} completed successfully.`);
})

worker.on("failed", async (job, err) => {
  if (!job) return;

  const { executionId } = job.data;
  const isUnrecoverable = err.name === 'UnrecoverableError' || err instanceof UnrecoverableError || isNonRetryableError(err);

  if (isUnrecoverable || job.attemptsMade >= (job.opts.attempts || 3)) {
    if (isUnrecoverable) {
      console.error(`🛑 [Worker] Job ${executionId} aborted immediately (UnrecoverableError). No useless retries performed.`);
    } else {
      console.error(`☠️ [DLQ] Job ${executionId} failed permanently after exhausting all ${job.opts.attempts || 3} attempts. Moving to Dead Letter Queue.`);
    }
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
    console.warn(`⚠️ [Retry] Job ${executionId} failed with transient error (Attempt ${job.attemptsMade}/${job.opts.attempts || 3}). Retrying in a few seconds...`);
  }
});

// Publishes status details, including the organizationId and triggeredByUserId for multi-tenant websocket security
function broadcastTelemetry(orgId: string, executionId: string, nodeId: string, status: string, message?: string, data?: any, triggeredByUserId?: string) {
  const payload = JSON.stringify({
    organizationId: orgId,
    executionId,
    nodeId,
    status,
    message,
    data,
    triggeredByUserId,
    timeStamp: new Date().toISOString()
  });
  redisPublisher.publish('telemetry', payload);
}




