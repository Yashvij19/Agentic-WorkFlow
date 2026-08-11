'use client'
import React from "react"
import { Handle ,Position ,NodeProps } from "reactflow";

export default function TriggerNode({data}:NodeProps){
    let borderClass = 'border-purple-500';
    let badge = <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">⚡ Trigger</span>;

        if (data.status === 'RUNNING') {
        borderClass = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse';
    } else if (data.status === 'COMPLETED') {
        borderClass = 'border-green-500';
    }

    return (
        <div className={`bg-slate-900 border-2 rounded-xl w-60 shadow-xl transition-all duration-300 ${borderClass}`}>
      <div className="bg-slate-950/80 px-4 py-3 rounded-t-xl border-b border-white/5 flex items-center justify-between">
        <span className="font-bold text-slate-100 text-xs tracking-wide">⚡ ENTRY POINT</span>
        {badge}
      </div>
      <div className="p-4">
        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Trigger Output</div>
        <p className="text-sm font-mono text-slate-200 truncate bg-slate-950 px-2 py-1.5 rounded border border-white/5">
          {data.output || 'No output defined'}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-purple-500 border border-slate-950" />
    </div>
    );
}