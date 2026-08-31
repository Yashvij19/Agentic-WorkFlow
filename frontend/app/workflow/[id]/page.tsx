// frontend/app/workflow/[id]/page.tsx
'use client';

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { API_URL, WS_URL } from '../../../utils/config';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom Flow Nodes
import TriggerNode from '../../../components/nodes/TriggerNode';
import AgentNode from '../../../components/nodes/AgentNode';
import ApiNode from '../../../components/nodes/ApiNode';
import RagNode from '../../../components/nodes/RagNode';

// Modular Canvas UI Components
import CanvasHeader from '../../../components/canvas/CanvasHeader';
import NodePalette from '../../../components/canvas/NodePalette';
import PropertiesPanel from '../../../components/canvas/PropertiesPanel';
import ExecutionHistory from '../../../components/canvas/ExecutionHistory';
import TraceInspectorModal from '../../../components/canvas/TraceInspectorModal';

import CustomCodeNode from '../../../components/nodes/CustomCodeNode';
import PythonCodeNode from '../../../components/nodes/PythonCodeNode';


export default function WorkflowWorkspace() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // DOM Refs & Flow Instance states
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Custom sidebar config states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Loading...');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [partialRunResult, setPartialRunResult] = useState<string | null>(null);
  const partialRunRef = useRef<{ runId: string | null; targetId: string | null }>({ runId: null, targetId: null });
 const idempotencyKeyRef = useRef<string>('');
  // Trace Modal state
  const [traceModal, setTraceModal] = useState<{
    isOpen: boolean;
    executionId?: string | null;
    nodeId?: string | null;
    traceId?: string | null;
  }>({ isOpen: false });


    // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500); // Auto-dismiss after 3.5 seconds
  };


  // Event listener for RAG trace modal triggers
  useEffect(() => {
    const handleInspect = (e: any) => {
      const { nodeId, executionId, traceId } = e.detail || {};
      setTraceModal({
        isOpen: true,
        executionId: executionId || null,
        nodeId: nodeId || null,
        traceId: traceId || null,
      });
    };
    window.addEventListener('inspect-rag-trace', handleInspect);
    return () => window.removeEventListener('inspect-rag-trace', handleInspect);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, []);

  // Register Custom Node Types
   const nodeTypes = useMemo(() => ({
    input: TriggerNode,
    agent: AgentNode,
    api: ApiNode,
    rag_query: RagNode,
    custom_code: CustomCodeNode,
    python_code: PythonCodeNode,
  }), []);


  // Compute selectedNode object helper
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  // 1. Fetch Workflow blueprint
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${API_URL}/api/workflow/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve workflow.');
        return res.json();
      })
      .then((data) => {
        setWorkflowName(data.name);
        setNodes(data.nodesJson || []);
        setEdges(data.dagJson || []);
      })
      .catch((err) => {
        console.error(err);
        setWorkflowName('Error loading');
      });
  }, [id, router, setNodes, setEdges]);

  // 2. Telemetry WebSockets receiver
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/api/workflow/live?token=${token}`);

    ws.onopen = () => console.log('Connected to Telemetry Room');

    ws.onmessage = (event) => {
      try {
        const telemetry = JSON.parse(event.data);

        if (telemetry.status === 'RUNNING' || telemetry.status === 'COMPLETED' || telemetry.status === 'FAILED') {
          setNodes((currentNodes) =>
            currentNodes.map((node) => {
              if (node.id === telemetry.nodeId) {
                return {
                  ...node,
                  data: { ...node.data, status: telemetry.status },
                };
              }
              return node;
            })
          );

          if (telemetry.status === 'COMPLETED') {
            setExecutionMessage(`Step '${telemetry.nodeId}' finished.`);
            setIsExecuting(false);
          } else if (telemetry.status === 'FAILED') {
            setExecutionMessage(`Step '${telemetry.nodeId}' failed.`);
            setIsExecuting(false);
          } else if (telemetry.status === 'RUNNING') {
            setExecutionMessage(`Executing '${telemetry.nodeId}'...`);
          }
        }


        // Check if telemetry matches the target partial node execution
        const currentPartial = partialRunRef.current;
        if (currentPartial.runId && telemetry.executionId === currentPartial.runId && telemetry.nodeId === currentPartial.targetId) {
          if (telemetry.status === 'COMPLETED' || telemetry.status === 'FAILED') {
            const runId = currentPartial.runId;
            const targetId = currentPartial.targetId;
            
            // Clear ref to avoid multiple triggers
            partialRunRef.current = { runId: null, targetId: null };

            setTimeout(async () => {
              const tok = localStorage.getItem('token');
              try {
                const res = await fetch(`${API_URL}/api/workflow/${id}/executions`, {
                  headers: { Authorization: `Bearer ${tok}` }
                });
                const executions = await res.json();
                if (Array.isArray(executions)) {
                  const run = executions.find((e: any) => e.id === runId);
                  if (run && Array.isArray(run.logs)) {
                    const log = run.logs.find((l: any) => l.nodeId === targetId);
                    if (log) {
                      const output = log.outputData?.result?.output || log.outputData?.result || log.outputData?.error || 'No output.';
                      setPartialRunResult(typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output));
                    }
                  }
                }
              } catch (err) {
                console.error("Failed fetching partial run details:", err);
              }
            }, 600);
          }
        }
      } catch (err) {
        console.error('Failed processing socket message', err);
      }
    };

    return () => ws.close();
  }, [id, setNodes]);

  // 3. Connect Nodes handler
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // 4. Click handlers for panel configuration
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
    setPartialRunResult(null); // Clear previous runs!
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // 5. Update data state from Properties Panel
  const onUpdateNodeData = useCallback((nodeId: string, updatedData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: updatedData,
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId((currentId) => currentId === nodeId ? null : currentId);
  }, [setNodes, setEdges]);

  // 6. Save Canvas Blueprint
  const handleSave = async (silent: boolean | any = false) => {
      // If React passes a MouseEvent object from onClick, treat it as silent = false
    const isSilent = typeof silent === 'boolean' ? silent : false;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/workflow/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: workflowName,
          nodes,
          edges,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed saving workflow.');
      if (!silent) {
        showToast(data.message || 'Workflow blueprint saved successfully!', 'success');
      }
      return true;
    } catch (err: any) {
      if (!silent) {
        showToast(`Save error: ${err.message}`, 'error');
      }
      console.error('Auto-save error:', err.message);
      return false;
    }
  };

  // 7. Trigger full execution
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionMessage('Auto-saving canvas & pushing job to queue...');
    const token = localStorage.getItem('token');

    // 1. Auto-save latest canvas state to database so the worker gets the exact nodes & query
    await handleSave(true);

    // Reset nodes to PENDING status visually
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: { ...node.data, status: 'PENDING' },
      }))
    );

    try {
      const res = await fetch(`${API_URL}/api/workflow/${id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`,
         'idempotency-key': idempotencyKeyRef.current // ADDED THIS HEADER
       },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trigger failed.');

      setExecutionMessage(`Running execution: ${data.executionId?.slice(0, 8)}...`);
    } catch (err: any) {
      setExecutionMessage(`Failed: ${err.message}`);
      setIsExecuting(false);
    }
    finally {
      
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  };

  // 7.1 Trigger partial execution up to a selected node
  const handleExecuteUpToNode = async (nodeId: string) => {
    setIsExecuting(true);
    setExecutionMessage(`Auto-saving canvas & queuing partial run up to ${nodeId}...`);
    setPartialRunResult(null); // Reset previous outputs
    const token = localStorage.getItem('token');

    // 1. Auto-save latest canvas state to database so worker finds this node and updated query!
    await handleSave(true);

    // Reset target node status to PENDING visually
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: { ...node.data, status: node.id === nodeId ? 'PENDING' : node.data.status },
      }))
    );

    try {
      const res = await fetch(`${API_URL}/api/workflow/${id}/execute-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
           'idempotency-key': idempotencyKeyRef.current 

        },
        body: JSON.stringify({ nodeId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Partial run failed to trigger.');

      setExecutionMessage(`Running step ${nodeId}...`);
      // Update ref to track WebSocket execution details!
      partialRunRef.current = { runId: data.executionId, targetId: nodeId };
    } catch (err: any) {
      setExecutionMessage(`Failed: ${err.message}`);
      setIsExecuting(false);
    }
    finally {
      //  Refresh the key so the NEXT run gets a fresh UUID
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  };

    // 7.2 Trigger workflow execution replay starting from a specific node
  const handleReplayNode = async (nodeId: string, resumeDownstream: boolean) => {
    const token = localStorage.getItem('token');
    
    // First, let's fetch execution history to get the latest run ID
    let executionId = '';
    try {
      const histRes = await fetch(`${API_URL}/api/workflow/${id}/executions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = await histRes.json();
      if (Array.isArray(history) && history.length > 0) {
        // history is ordered descending, index 0 is the latest run
        executionId = history[0].id;
      }
    } catch (err: any) {
      console.error("Failed to load execution history for replay:", err.message);
    }

    if (!executionId) {
      showToast("No previous execution found to replay. Please run the workflow fully once first.", "error");
      return;
    }

    setIsExecuting(true);
    setExecutionMessage(resumeDownstream 
      ? `Replaying workflow from node '${nodeId}' to end...` 
      : `Re-running step '${nodeId}' only...`
    );
    setPartialRunResult(null); // Reset output box

    // Auto-save canvas schema first
    await handleSave(true);

    // Compute which nodes to reset visually back to PENDING on the canvas
    const nodesToReset = new Set<string>();
    nodesToReset.add(nodeId);

    if (resumeDownstream) {
      const queue = [nodeId];
      const downstream = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = edges.filter(e => e.source === current).map(e => e.target);
        for (const child of children) {
          if (!downstream.has(child)) {
            downstream.add(child);
            queue.push(child);
          }
        }
      }
      downstream.forEach(id => nodesToReset.add(id));
    }

    // Update statuses on react flow nodes visually
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: { 
          ...node.data, 
          status: nodesToReset.has(node.id) ? 'PENDING' : node.data.status 
        },
      }))
    );

    try {
      const res = await fetch(`${API_URL}/api/workflow/${id}/replay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'idempotency-key': idempotencyKeyRef.current
        },
        body: JSON.stringify({
          executionId,
          targetNodeId: nodeId,
          resumeDownstream
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Replay failed to trigger.');

      setExecutionMessage(resumeDownstream 
        ? `Replay running from step ${nodeId}...` 
        : `Re-running step ${nodeId}...`
      );
      
      // Update ref to track WebSocket execution details so it grabs outputs when done
      partialRunRef.current = { runId: executionId, targetId: nodeId };
    } catch (err: any) {
      setExecutionMessage(`Failed: ${err.message}`);
      setIsExecuting(false);
    } finally {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  };




  // 8. Drag and drop HTML5 handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (!type) return;

      // Project mouse client coordinates into React Flow coordinate system
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

            const newNode = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.toUpperCase()} Node`,
          status: 'PENDING',
          prompt: type === 'agent' ? 'Analyze data: {{node_1.output}}' : undefined,
          systemInstruction: type === 'agent' ? 'Be concise.' : undefined,
          method: type === 'api' ? 'GET' : undefined,
          url: type === 'api' ? 'https://api.github.com' : undefined,
          output: type === 'input' ? 'Trigger payload data.' : undefined,
          code: type === 'custom_code'
            ? `module.exports = async function(inputs, context) {\n  // Access inputs or context['nodeId']\n  console.log("Processing inputs:", inputs);\n  return inputs;\n};`
            : type === 'python_code'
            ? `def main(inputs, context):\n    # Access inputs or context['nodeId']\n    print("Processing inputs:", inputs)\n    return inputs`
            : undefined,
          timeoutMs: (type === 'custom_code' || type === 'python_code') ? 10000 : undefined,
        },
      };


      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  return (
    <div className="w-screen h-screen bg-[#030617] flex flex-col text-white font-sans overflow-hidden">
      {/* 1. Canvas Top Header */}
      <CanvasHeader
        title={workflowName}
        isExecuting={isExecuting}
        executionMessage={executionMessage}
        onSave={() => handleSave(false)} // Pass explicit false!
        onExecute={handleExecute}
      />

      <div className="flex flex-grow w-full overflow-hidden relative pb-10">
        {/* 2. Left Drag and Drop Palette / Collapsible Sidebar */}
        {isSidebarOpen ? (
          <NodePalette 
            isOpen={isSidebarOpen}
            onClose={() => {
              setIsSidebarOpen(false);
              setSelectedNodeId(null);
            }}
          />
        ) : (
          <button 
            onClick={() => {
              setIsSidebarOpen(true);
              setIsLogsOpen(false);
            }}
            className="absolute top-4 left-4 z-40 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg text-white cursor-pointer transition-all duration-200"
            title="Open Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6h15m-15 6h15m-15 6h15" />
            </svg>
          </button>
        )}

        {/* 3. ReactFlow Central Canvas Workspace */}
        <div ref={reactFlowWrapper} className="flex-grow h-full bg-[#030617] relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="bg-[#080D1D]/70 border border-white/10 rounded-lg text-white" />
            <MiniMap
              className="bg-[#080D1D]/70 border border-white/10 rounded-lg"
              nodeColor={() => '#4f46e5'}
              maskColor="rgba(15, 23, 42, 0.8)"
            />
          </ReactFlow>
        </div>

        {/* 4. Right Properties Inspector Drawer */}
        {selectedNode && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onUpdateNodeData={onUpdateNodeData}
            onClose={() => setSelectedNodeId(null)}
            onExecuteUpToNode={handleExecuteUpToNode}
            onDeleteNode={handleDeleteNode}
            partialRunResult={partialRunResult}
            onOpenTraceModal={(nodeId) => setTraceModal({ isOpen: true, nodeId, executionId: null, traceId: null })}
            onReplayNode={handleReplayNode}
          />
        )}
      </div>

      {/* 5. Bottom Historical Executions Logs Drawer */}
      <ExecutionHistory 
        workflowId={id} 
        isOpen={isLogsOpen}
        onOpen={() => {
          setIsLogsOpen(true);
          setIsSidebarOpen(false);
        }}
        onClose={() => setIsLogsOpen(false)}
        onOpenTrace={(executionId, nodeId, traceId) => setTraceModal({ isOpen: true, executionId, nodeId, traceId })}
      />

      {/* 6. Visual RAG Observability & Telemetry Trace Inspector Modal */}
      <TraceInspectorModal
        isOpen={traceModal.isOpen}
        onClose={() => setTraceModal({ isOpen: false })}
        executionId={traceModal.executionId}
        nodeId={traceModal.nodeId}
        traceId={traceModal.traceId}
      />
                {/* 7. Modern Floating Glassmorphic Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-auto">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-950/50'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <div className="text-xs font-semibold tracking-wide">{toast.message}</div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white transition p-0.5 rounded cursor-pointer flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      

    </div>
  );
}
