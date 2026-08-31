'use client'
import React from "react"
import { Handle ,Position ,NodeProps, useReactFlow } from "reactflow";
import { X } from "lucide-react";

export default function TriggerNode({ id, data }: NodeProps) {
    const { setNodes, setEdges } = useReactFlow();
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    };

    let borderClass = 'border-white/[0.08]';
    let badge = <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-950/40 text-purple-300 border border-purple-800/30 px-2 py-0.5 rounded-lg">Trigger</span>;

    if (data.status === 'RUNNING') {
        borderClass = 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-pulse';
    } else if (data.status === 'COMPLETED') {
        borderClass = 'border-green-500/50';
    }

    return (
        <div className={`bg-[#080D1D]/90 border backdrop-blur-md rounded-2xl w-60 shadow-xl transition-all duration-300 ${borderClass}`}>
      <div className="bg-black/35 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">Entry Point</span>
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
      <div className="p-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Trigger Output</div>
        <p className="text-xs font-mono text-slate-200 truncate bg-black/40 px-2.5 py-2 rounded-xl border border-white/[0.05]">
          {data.output || 'No output defined'}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-purple-500 border border-[#030617]" />
    </div>
    );
}