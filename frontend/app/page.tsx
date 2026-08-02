'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

import AgentNode from '../components/nodes/AgentNode';

type NodeData = {
  label?: string;
  prompt?: string;
};

const initialNodes:Node<NodeData>[]  = [
  { 
    id: '1', 
    position: { x: 100, y: 50 }, 
    data: { label: 'Webhook Trigger ⚡' } 
  },
  { 
    id: '2', 
    type: 'agent',
    position: { x: 100, y: 200 }, 
    data: { prompt: 'Analyze the sentiment of the text.' } 
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
];

export default function WorkflowBuilderCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ agent: AgentNode }), []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // --- NEW SERIALIZATION LOGIC ---
  const onSave = useCallback(() => {
    // 1. Strip away UI noise (like X/Y positions) and keep only the execution logic
    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type || 'default',
        data: n.data, // This captures our AI prompts!
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))
    };

    // 2. Output the serialized payload to prove it works
    console.log("📦 Serialized Graph Payload:");
    console.log(JSON.stringify(payload, null, 2));
    
    alert("Workflow Serialized! Check your browser's Developer Console.");
  }, [nodes, edges]);

  return (
    <div className="w-screen h-screen bg-gray-50 flex flex-col">
      
      {/* --- UPDATED NAVIGATION BAR --- */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
        <h1 className="text-lg font-bold text-gray-800">Agentic Workflow Builder</h1>
        <button 
          onClick={onSave}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        >
          Deploy Workflow 🚀
        </button>
      </div>

      <div className="flex-grow w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#ccc" gap={16} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>
    </div>
  );
}