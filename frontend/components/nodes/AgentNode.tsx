// frontend/components/nodes/AgentNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';

export default function AgentNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  let borderClass = 'border-white/[0.08]';
  let badge = <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-950/40 text-indigo-300 border border-indigo-800/30 px-2 py-0.5 rounded-lg">AI Agent</span>;
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-indigo-500/50 running-ring-indigo';
    statusBadge = <span className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded animate-pulse font-mono uppercase tracking-wider">running</span>;
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500/50';
    statusBadge = <span className="text-[9px] bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">completed</span>;
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    statusBadge = <span className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">failed</span>;
  }

  return (
    <div className={`bg-[#080D1D]/90 border backdrop-blur-md rounded-2xl w-60 shadow-xl transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-indigo-500 border border-[#030617]" />
      
      <div className="bg-black/35 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">Brain Unit</span>
        <div className="flex items-center gap-1.5">
          {badge}
          <button 
            onClick={handleDelete}
            className="text-slate-500 hover:text-red-400 transition cursor-pointer text-xs ml-1.5 p-1 rounded-md hover:bg-white/[0.06] flex items-center justify-center"
            title="Delete Node"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agent Prompt</div>
        <p className="text-xs text-slate-200 line-clamp-3 bg-black/40 p-2.5 rounded-xl border border-white/[0.05]">
          {data.prompt || 'Define prompt instruction...'}
        </p>
        {statusBadge && <div className="flex justify-end">{statusBadge}</div>}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-indigo-500 border border-[#030617]" />
    </div>
  );
}
