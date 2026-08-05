'use client';

import React, { useCallback, useMemo, useEffect } from 'react'; // <-- Import useEffect
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

import AgentNode from '../components/nodes/AgentNode';

const initialNodes = [
  // Ensure the IDs match what your backend worker is executing!
  { id: 'node_1', position: { x: 100, y: 50 }, data: { label: 'Webhook Trigger ⚡', status: 'PENDING' } },
  { id: 'node_2', type: 'agent', position: { x: 100, y: 200 }, data: { prompt: 'Analyze the sentiment...', status: 'PENDING' } },
];

const initialEdges = [{ id: 'e1-2', source: 'node_1', target: 'node_2', animated: true }];

export default function WorkflowBuilderCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(() => ({ agent: AgentNode }), []);

  // --- NEW: WEBSOCKET CONNECTION LOGIC ---
  useEffect(() => {
    // Connect to the Fastify WebSocket route we built in 4.3
    const ws = new WebSocket('ws://localhost:3000/api/workflows/live');

    ws.onopen = () => console.log('📡 Connected to Mission Control Telemetry');

    ws.onmessage = (event) => {
      const telemetry = JSON.parse(event.data);
      console.log('📥 Telemetry Received:', telemetry);

      // Update the specific node's color/status based on the broadcast
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id === telemetry.nodeId) {
            // Create a brand new copy of the node with the updated status
            return {
              ...node,
              data: { ...node.data, status: telemetry.status },
            };
          }
          return node;
        })
      );
    };

    // Cleanup: Close the connection if the user leaves the page
    return () => ws.close();
  }, [setNodes]);
  // ---------------------------------------

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-screen h-screen bg-gray-50 flex flex-col">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm z-10">
        <h1 className="text-lg font-bold text-gray-800">Agentic Workflow Builder</h1>
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