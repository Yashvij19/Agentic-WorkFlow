// frontend/app/workflow/[id]/page.tsx
'use client';

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  // Register Custom Node Types
  const nodeTypes = useMemo(() => ({
    input: TriggerNode,
    agent: AgentNode,
    api: ApiNode,
    rag_query: RagNode
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

    ws.onopen = () => console.log('📡 Connected to Telemetry Room');

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
  const handleSave = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/workflow`, {
        method: 'POST',
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
      alert('Workflow saved successfully!');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  // 7. Trigger full execution
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionMessage('Pushing job to queue...');
    const token = localStorage.getItem('token');

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
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trigger failed.');

      setExecutionMessage(`Running execution...`);
    } catch (err: any) {
      setExecutionMessage(`Failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionMessage('');
      }, 5000);
    }
  };

    // 7.1 Trigger partial execution up to a selected node
  const handleExecuteUpToNode = async (nodeId: string) => {
    setIsExecuting(true);
    setExecutionMessage(`Queuing partial run up to ${nodeId}...`);
    setPartialRunResult(null); // Reset previous outputs
    const token = localStorage.getItem('token');

    // Reset nodes status to PENDING visually
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: { ...node.data, status: 'PENDING' },
      }))
    );

    try {
      const res = await fetch(`${API_URL}/api/workflow/${id}/execute-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nodeId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Partial run failed to trigger.');

      setExecutionMessage(`Running partial execution...`);
      // Update ref to track WebSocket execution details!
      partialRunRef.current = { runId: data.executionId, targetId: nodeId };
    } catch (err: any) {
      setExecutionMessage(`Failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionMessage('');
      }, 5000);
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
        onSave={handleSave}
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
      />
    </div>
  );
}
