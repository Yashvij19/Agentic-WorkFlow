// frontend/components/nodes/RagNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

export default function RagNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  let borderClass = 'border-purple-500/20';
  let badge = (
    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-950/40 text-purple-300 border border-purple-800/30 px-2 py-0.5 rounded-lg">
      RAG Unit
    </span>
  );
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)] animate-pulse';
    statusBadge = (
      <span className="text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded animate-pulse font-mono uppercase tracking-wider">
        retrieving
      </span>
    );
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500/50';
    statusBadge = (
      <span className="text-[9px] bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
        completed
      </span>
    );
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    statusBadge = (
      <span className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
        failed
      </span>
    );
  }

  const profile = data.useCaseProfile || 'GENERAL_QA';

  return (
    <div className={`bg-[#080D1D]/90 border backdrop-blur-md rounded-2xl w-64 shadow-xl transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-purple-500 border border-[#030617]" />

      <div className="bg-black/35 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">Knowledge Base</span>
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

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Query</span>
          <span className="text-[8px] font-mono text-purple-400 bg-purple-950/30 border border-purple-800/30 px-1.5 py-0.5 rounded">
            {profile}
          </span>
        </div>

        <p className="text-xs text-slate-200 line-clamp-3 bg-black/40 p-2.5 rounded-xl border border-white/[0.05] font-sans">
          {data.query || 'Define search query or variable...'}
        </p>

        <div className="flex items-center justify-between pt-1">
          {statusBadge || <div />}
          {data.status === 'COMPLETED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (data.onInspectTrace) {
                  data.onInspectTrace(id);
                } else {
                  // Dispatch custom event for canvas listener
                  window.dispatchEvent(new CustomEvent('inspect-rag-trace', { detail: { nodeId: id } }));
                }
              }}
              className="text-[9px] font-mono font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
              title="Inspect RAG Telemetry Trace"
            >
              <span>📊</span> Trace
            </button>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-purple-500 border border-[#030617]" />
    </div>
  );
}
