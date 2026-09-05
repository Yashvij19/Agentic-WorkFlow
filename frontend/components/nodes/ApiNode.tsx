// frontend/components/nodes/ApiNode.tsx
'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X, Globe, CheckCircle2, AlertCircle, Loader2, Key, FileText, Filter } from 'lucide-react';

export default function ApiNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const method = (data.method || 'GET').toUpperCase();

  // Distinct color palettes for standard REST verbs
  let methodBadgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
  if (method === 'POST') {
    methodBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (method === 'PUT') {
    methodBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else if (method === 'PATCH') {
    methodBadgeColor = 'bg-violet-500/10 text-violet-400 border-violet-500/30';
  } else if (method === 'DELETE') {
    methodBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }

  let borderClass = 'border-white/[0.08]';
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse';
    statusBadge = (
      <span className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Calling
      </span>
    );
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    statusBadge = (
      <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <CheckCircle2 className="w-2.5 h-2.5" />
        {data.metrics?.status ? `HTTP ${data.metrics.status}` : '200 OK'}
      </span>
    );
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]';
    statusBadge = (
      <span className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase tracking-wider">
        <AlertCircle className="w-2.5 h-2.5" />
        Failed
      </span>
    );
  }

  const hasHeaders = !!data.headers && (typeof data.headers === 'string' ? data.headers.trim().length > 0 : Object.keys(data.headers).length > 0);
  const hasAuth = !!data.bearerToken || !!(data.authHeaderName && data.authHeaderValue);
  const hasParams = !!data.queryParams;
  const hasBody = !!data.body && method !== 'GET' && method !== 'HEAD';

  return (
    <div className={`bg-[#080D1D]/90 border backdrop-blur-md rounded-2xl w-64 shadow-xl transition-all duration-300 ${borderClass} relative`}>
      {/* Top Input Handle for Upstream Data */}
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-amber-500 border border-[#030617]" />

      {/* Header Bar */}
      <div className="bg-black/35 px-4 py-3 rounded-t-2xl border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Globe className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">REST API</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider border px-2 py-0.5 rounded-lg ${methodBadgeColor}`}>
            {method}
          </span>
          <button
            onClick={handleDelete}
            className="text-slate-500 hover:text-red-400 transition cursor-pointer text-xs p-1 rounded-md hover:bg-white/[0.06] flex items-center justify-center"
            title="Delete API Node"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-2.5">
        {/* URL Box */}
        <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.05] space-y-1">
          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Endpoint URL</span>
          <p className="text-xs text-slate-200 font-mono truncate" title={data.url || 'https://api.example.com'}>
            {data.url || 'https://api.example.com'}
          </p>
        </div>

        {/* Feature Tags (Headers, Auth, Body, Params) */}
        <div className="flex flex-wrap gap-1">
          {hasAuth && (
            <span className="text-[8px] bg-amber-950/40 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
              <Key className="w-2.5 h-2.5" /> Auth
            </span>
          )}
          {hasHeaders && (
            <span className="text-[8px] bg-slate-800/60 text-slate-300 border border-white/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
              Headers
            </span>
          )}
          {hasParams && (
            <span className="text-[8px] bg-purple-950/40 text-purple-300 border border-purple-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
              <Filter className="w-2.5 h-2.5" /> Params
            </span>
          )}
          {hasBody && (
            <span className="text-[8px] bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
              <FileText className="w-2.5 h-2.5" /> Payload
            </span>
          )}
        </div>

        {/* Status / Metric Badge */}
        {statusBadge && <div className="flex justify-end pt-1">{statusBadge}</div>}

        {/* Error Notification */}
        {data.status === 'FAILED' && data.error && (
          <div className="text-[9px] text-red-400 bg-red-950/20 p-2 rounded-xl border border-red-900/30 truncate font-mono">
            {data.error}
          </div>
        )}
      </div>

      {/* Bottom Output Handle for Downstream Data */}
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-amber-500 border border-[#030617]" />
    </div>
  );
}