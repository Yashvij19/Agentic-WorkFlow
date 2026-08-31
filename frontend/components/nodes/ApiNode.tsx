// frontend/components/nodes/ApiNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';

export default function ApiNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  let borderClass = 'border-white/[0.08]';
  let badge = <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-950/40 text-amber-300 border border-amber-800/30 px-2 py-0.5 rounded-lg">API Request</span>;
  
  if (data.status === 'RUNNING') {
    borderClass = 'border-blue-500/50 running-ring-blue';
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500/50';
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
  }

  const methodColor = data.method === 'POST' ? 'text-emerald-400' : 'text-sky-400';

  return (
    <div className={`bg-[#080D1D]/90 border backdrop-blur-md rounded-2xl w-60 shadow-xl transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-amber-500 border border-[#030617]" />
      
      <div className="bg-black/35 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">Service Link</span>
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
      
      <div className="p-4 space-y-2">
        <div className="flex gap-2 items-center">
          <span className={`text-xs font-bold font-mono uppercase ${methodColor}`}>{data.method}</span>
          <span className="text-xs text-slate-400 font-mono truncate">{data.url}</span>
        </div>
        {data.status === 'FAILED' && data.error && (
          <div className="text-[9px] text-red-400 bg-red-950/20 p-2 rounded-xl border border-red-900/30 truncate font-mono">
            {data.error}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-amber-500 border border-[#030617]" />
    </div>
  );
}