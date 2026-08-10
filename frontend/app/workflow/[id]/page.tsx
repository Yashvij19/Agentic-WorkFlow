// frontend/app/workflows/[id]/page.tsx
'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';

import AgentNode from '../../../components/nodes/AgentNode';

export default function WorkflowWorkspace() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('Loading...');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState('');

  const nodeTypes = useMemo(() => ({ agent: AgentNode }), []);

  // 1. Fetch Workflow from API Gateway
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`http://localhost:4000/api/workflow/${id}`, {
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

  // 2. Connect to Live telemetry WebSocket with JWT token authentication filter
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:4000/api/workflow/live?token=${token}`);

    ws.onopen = () => console.log('📡 Connected to Telemetry Room');

    ws.onmessage = (event) => {
      try {
        const telemetry = JSON.parse(event.data);
        console.log('📥 Live Event:', telemetry);

        if (telemetry.status === 'RUNNING' || telemetry.status === 'COMPLETED' || telemetry.status === 'FAILED') {
          // Reactively paint the node state
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
      } catch (err) {
        console.error('Failed processing socket message', err);
      }
    };

    return () => ws.close();
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 3. Save Node Canvas Setup to DB
  const handleSave = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:4000/api/workflow`, {
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

  // 4. Trigger Execution Run
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionMessage('Pushing job to execution queue...');
    const token = localStorage.getItem('token');

    // Reset UI nodes state to PENDING before executing
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: { ...node.data, status: 'PENDING' },
      }))
    );

    try {
      const res = await fetch(`http://localhost:4000/api/workflow/${id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trigger failed.');

      setExecutionMessage(`Execution running! ID: ${data.executionId}`);
    } catch (err: any) {
      setExecutionMessage(`Failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionMessage('');
      }, 5000);
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col text-white font-sans">
      {/* Workspace Header */}
      <div className="h-16 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/workflow" className="text-slate-400 hover:text-white transition text-sm">
            ⬅️ Dashboard
          </Link>
          <span className="text-white/20">|</span>
          <h1 className="text-base font-bold text-slate-100">{workflowName}</h1>
        </div>

        <div className="flex items-center gap-3">
          {executionMessage && (
            <span className="text-xs text-purple-300 font-mono px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-pulse">
              {executionMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-white/10 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Save Schema
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold rounded-lg transition duration-300 disabled:opacity-50 cursor-pointer"
          >
            {isExecuting ? 'Running...' : 'Execute Workflow ⚡'}
          </button>
        </div>
      </div>

      {/* ReactFlow Canvas Panel */}
      <div className="flex-grow w-full h-full bg-slate-950 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#333" gap={20} size={1} />
          <Controls className="bg-slate-900 border border-white/10 rounded-lg text-white" />
          <MiniMap
            className="bg-slate-900 border border-white/10 rounded-lg"
            nodeColor={() => '#581c87'}
            maskColor="rgba(15, 23, 42, 0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
