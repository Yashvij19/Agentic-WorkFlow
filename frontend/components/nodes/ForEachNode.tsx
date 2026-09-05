// frontend/components/nodes/ForEachNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ForEachNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  let borderClass = 'border-teal-500/25';
  let badge = (
    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-teal-950/50 text-teal-300 border border-teal-800/40 px-2 py-0.5 rounded-lg">
      Loop {data.concurrency ? `x${data.concurrency}` : 'x1'}
    </span>
  );
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.3)] animate-pulse';
    statusBadge = (
      <span className="text-[9px] bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        {data.progress !== undefined ? `${data.progress}%` : 'running'}
      </span>
    );
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    statusBadge = (
      <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <CheckCircle2 className="w-2.5 h-2.5" />
        completed
      </span>
    );
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    statusBadge = (
      <span className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <AlertCircle className="w-2.5 h-2.5" />
        failed
      </span>
    );
  }

  return (
    <div className={`bg-[#060C1B]/95 border backdrop-blur-md rounded-2xl w-72 shadow-2xl transition-all duration-300 ${borderClass} relative`}>
      {/* Top Input Handle for Upstream Data */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-teal-400 border-2 border-[#030617] rounded-full shadow-sm hover:scale-125 transition-transform" 
      />

      {/* Header Bar */}
      <div className="bg-black/40 px-4 py-3 rounded-t-2xl border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
            <RefreshCw className="w-3 h-3 text-teal-300" />
          </div>
          <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">ForEach Iterator</span>
        </div>
        <div className="flex items-center gap-1.5">
          {badge}
          <button
            onClick={handleDelete}
            className="text-slate-500 hover:text-red-400 transition cursor-pointer text-xs ml-1 p-1 rounded-md hover:bg-white/[0.06] flex items-center justify-center"
            title="Delete Node"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3">
        {/* Source Array Path */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Target Array</span>
            <span className="text-[9px] text-teal-400 font-mono">
              {data.continueOnError ? 'Tolerant' : 'Strict'}
            </span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/[0.05] text-[11px] font-mono text-teal-200/90 truncate">
            {data.arrayPath || 'direct input array'}
          </div>
        </div>

        {/* Live Progress Bar if Running */}
        {data.status === 'RUNNING' && data.progress !== undefined && (
          <div className="space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-teal-400 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(45,212,191,0.6)]" 
                style={{ width: `${Math.max(5, Math.min(100, data.progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Status / Tag Pill */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
          <span className="text-[9px] text-slate-500 font-mono">
            {data.itemAlias || '$item'} / {data.indexAlias || '$index'}
          </span>
          {statusBadge || (
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">idle</span>
          )}
        </div>
      </div>

      {/* Dual Output Ports Footer */}
      <div className="bg-black/50 px-3 py-2 rounded-b-2xl border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono relative">
        {/* Left Port: 🔄 Loop (Item Branch) */}
        <div className="flex items-center gap-1 text-teal-300">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
          <span>🔄 Loop ($item)</span>
        </div>

        {/* Right Port: 🏁 Done (Completed Summary) */}
        <div className="flex items-center gap-1 text-indigo-300">
          <span>🏁 Done (Array)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        </div>
      </div>

      {/* Dual Handles: 
          1. 'loop' handle at bottom-left (30% from left)
          2. 'done' handle at bottom-right (70% from left)
      */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop"
        style={{ left: '25%' }}
        className="w-3.5 h-3.5 !bg-teal-400 border-2 border-[#030617] rounded-full shadow-md hover:scale-125 transition-transform"
        title="Loop Item Branch (Repeats for each element)"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="done"
        style={{ left: '75%' }}
        className="w-3.5 h-3.5 !bg-indigo-400 border-2 border-[#030617] rounded-full shadow-md hover:scale-125 transition-transform"
        title="Done Branch (Triggers once with final aggregated results)"
      />
    </div>
  );
}
