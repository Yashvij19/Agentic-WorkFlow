// frontend/components/nodes/GuardrailNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X, Shield, ShieldCheck, ShieldAlert, RotateCcw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function GuardrailNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const mode = data.mode || 'strict_json';
  const retryFeedback = data.retryFeedback;

  let borderClass = 'border-rose-500/25';
  let modeBadgeLabel = 'Strict JSON';
  let modeBadgeColor = 'bg-rose-950/50 text-rose-300 border-rose-800/40';

  switch (mode) {
    case 'strict_json':
      modeBadgeLabel = 'Strict JSON';
      modeBadgeColor = 'bg-rose-950/50 text-rose-300 border-rose-800/40';
      break;
    case 'required_keys':
      modeBadgeLabel = `Keys: ${Array.isArray(data.requiredKeys) && data.requiredKeys.length > 0 ? data.requiredKeys.slice(0, 2).join(',') : 'Schema'}`;
      modeBadgeColor = 'bg-orange-950/50 text-orange-300 border-orange-800/40';
      break;
    case 'regex_match':
      modeBadgeLabel = 'Regex Match';
      modeBadgeColor = 'bg-amber-950/50 text-amber-300 border-amber-800/40';
      break;
    case 'banned_keywords':
      modeBadgeLabel = 'Safety Filter';
      modeBadgeColor = 'bg-red-950/50 text-red-300 border-red-800/40';
      break;
    case 'llm_judge':
      modeBadgeLabel = 'LLM Judge';
      modeBadgeColor = 'bg-purple-950/50 text-purple-300 border-purple-800/40';
      break;
  }

  let statusBadge = null;

  if (data.status === 'RUNNING') {
    if (retryFeedback && retryFeedback.retryCount > 0) {
      borderClass = 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] animate-pulse';
      statusBadge = (
        <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider shadow-sm">
          <RotateCcw className="w-2.5 h-2.5 animate-spin" />
          Retry {retryFeedback.retryCount}/{retryFeedback.maxRetries}
        </span>
      );
    } else {
      borderClass = 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse';
      statusBadge = (
        <span className="text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Verifying
        </span>
      );
    }
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    statusBadge = (
      <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Passed
      </span>
    );
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]';
    statusBadge = (
      <span className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <ShieldAlert className="w-2.5 h-2.5" />
        Failed
      </span>
    );
  }

  return (
    <div className={`bg-[#0A0713]/95 border backdrop-blur-md rounded-2xl w-64 shadow-2xl transition-all duration-300 ${borderClass} relative`}>
      {/* Top Input Handle for Upstream Data */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-rose-400 border-2 border-[#030617] rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      {/* Header Bar */}
      <div className="bg-black/40 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Shield className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">
            Guardrail
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider border px-2 py-0.5 rounded-lg ${modeBadgeColor}`}>
            {modeBadgeLabel}
          </span>
          <button
            onClick={handleDelete}
            className="text-slate-500 hover:text-red-400 transition cursor-pointer text-xs p-1 rounded-md hover:bg-white/[0.06] flex items-center justify-center"
            title="Delete Guardrail Node"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3">
        {/* Rule Summary */}
        <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.05] space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Validation Rule</span>
            <span className="text-[9px] font-mono text-rose-400/80">Max: {data.maxRetries ?? 3}x</span>
          </div>

          <p className="text-xs text-slate-200 line-clamp-2 font-mono">
            {mode === 'strict_json' && 'Strict valid JSON parser'}
            {mode === 'required_keys' && `Required: [${(data.requiredKeys || ['summary']).join(', ')}]`}
            {mode === 'regex_match' && `Pattern: /${data.regexPattern || '.*'}/`}
            {mode === 'banned_keywords' && `Blocked: [${(data.bannedWords || []).join(', ') || 'None'}]`}
            {mode === 'llm_judge' && (data.llmJudgePrompt ? data.llmJudgePrompt.slice(0, 50) + '...' : 'Gemini Quality Judge')}
          </p>
        </div>

        {/* Live Retry Counter / Status Badge */}
        {statusBadge && <div className="flex justify-end">{statusBadge}</div>}

        {/* Optional Target Node Label */}
        {data.targetNodeId && (
          <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1 pl-0.5">
            <span className="text-rose-400">Target:</span>
            <span>{data.targetNodeId}</span>
          </div>
        )}
      </div>

      {/* Bottom Output Handle for Downstream Data */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-rose-400 border-2 border-[#030617] rounded-full shadow-sm hover:scale-125 transition-transform"
      />
    </div>
  );
}
