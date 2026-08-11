"use clinet";

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export default function ApiNode({ data }: NodeProps) {

     let borderClass = 'border-amber-500';
  let badge = <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">🌐 API Request</span>;
  if (data.status === 'RUNNING') {
    borderClass = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse';
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500';
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
  }

    const methodColor = data.method === 'POST' ? 'text-emerald-400' : 'text-sky-400';

    return (

        <div className={`bg-slate-900 border-2 rounded-xl w-60 shadow-xl transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-amber-500 border border-slate-950" />
      
      <div className="bg-slate-950/80 px-4 py-3 rounded-t-xl border-b border-white/5 flex items-center justify-between">
        <span className="font-bold text-slate-100 text-xs tracking-wide">🌐 SERVICE LINK</span>
        {badge}
      </div>
      
      <div className="p-4 space-y-2">
        <div className="flex gap-2 items-center">
          <span className={`text-xs font-bold font-mono uppercase ${methodColor}`}>{data.method}</span>
          <span className="text-xs text-slate-400 font-mono truncate">{data.url}</span>
        </div>
        {data.status === 'FAILED' && data.error && (
          <div className="text-[10px] text-red-400 bg-red-950/40 p-1.5 rounded border border-red-900/30 truncate">
            {data.error}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-amber-500 border border-slate-950" />
    </div>
    )
}