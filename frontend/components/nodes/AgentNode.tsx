// frontend/components/nodes/AgentNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export default function AgentNode({ data }: NodeProps) {
  let borderClass = 'border-indigo-500';
  let badge = <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded">🤖 AI Agent</span>;
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse';
    statusBadge = <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded animate-pulse">⚙️ running</span>;
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500';
    statusBadge = <span className="text-[10px] bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded">✅ completed</span>;
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
    statusBadge = <span className="text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded">☠️ failed</span>;
  }

  return (
    <div className={`bg-slate-900 border-2 rounded-xl w-60 shadow-xl transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-indigo-500 border border-slate-950" />
      
      <div className="bg-slate-950/80 px-4 py-3 rounded-t-xl border-b border-white/5 flex items-center justify-between">
        <span className="font-bold text-slate-100 text-xs tracking-wide">🧠 BRAIN UNIT</span>
        {badge}
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Agent Prompt</div>
        <p className="text-sm text-slate-200 line-clamp-3 bg-slate-950 p-2.5 rounded border border-white/5">
          {data.prompt || 'Define prompt instruction...'}
        </p>
        {statusBadge && <div className="flex justify-end">{statusBadge}</div>}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-indigo-500 border border-slate-950" />
    </div>
  );
}
