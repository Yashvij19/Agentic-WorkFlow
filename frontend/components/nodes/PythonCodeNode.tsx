// frontend/components/nodes/PythonCodeNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

export default function PythonCodeNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  let borderClass = 'border-cyan-500/20';
  let badge = (
    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-950/40 text-cyan-300 border border-cyan-800/30 px-2 py-0.5 rounded-lg">
      Python 3
    </span>
  );
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] animate-pulse';
    statusBadge = <span className="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded animate-pulse font-mono uppercase tracking-wider">running</span>;
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]';
    statusBadge = <span className="text-[9px] bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">completed</span>;
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    statusBadge = <span className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">failed</span>;
  }

  return (
    <div className={`bg-[#080D1D]/90 border backdrop-blur-md rounded-2xl w-64 shadow-xl transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-cyan-500 border border-[#030617]" />
      
      <div className="bg-black/35 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">Python Script</span>
        </div>
        <div className="flex items-center gap-1.5">
          {badge}
          <button 
            onClick={handleDelete}
            className="text-slate-500 hover:text-red-400 transition cursor-pointer text-xs ml-1.5 p-0.5 rounded hover:bg-white/[0.04] leading-none"
            title="Delete Node"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Script Preview</span>
          <span className="text-[9px] text-[#687493] font-mono">Py 3.x</span>
        </div>
        
        <pre className="text-[11px] font-mono text-cyan-200/90 line-clamp-3 bg-black/60 p-2.5 rounded-xl border border-white/[0.05] overflow-hidden">
          {data.code || 'def main(inputs, context):\n    return inputs'}
        </pre>

        {statusBadge && <div className="flex justify-end pt-1">{statusBadge}</div>}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-cyan-500 border border-[#030617]" />
    </div>
  );
}
