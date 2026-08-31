// frontend/components/canvas/CanvasHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Pause, Play, ChevronLeft } from 'lucide-react';

interface CanvasHeaderProps {
  title: string;
  isExecuting: boolean;
  executionMessage: string;
  workflowStatus?: string;
  canToggleStatus?: boolean;
  canEdit?: boolean;
  onToggleStatus?: (newStatus: 'ACTIVE' | 'PAUSED') => void;
  onSave: () => void;
  onExecute: () => void;
}

export default function CanvasHeader({
  title,
  isExecuting,
  executionMessage,
  workflowStatus = 'ACTIVE',
  canToggleStatus = false,
  canEdit = true,
  onToggleStatus,
  onSave,
  onExecute,
}: CanvasHeaderProps) {
  const isPaused = workflowStatus === 'PAUSED';

  return (
    <div className="h-16 bg-[#030617] border-b border-white/[0.05] flex items-center justify-between px-6 shadow-sm z-20">
      <div className="flex items-center gap-4">
        <Link 
          href="/workflow" 
          className="text-slate-400 hover:text-white transition text-xs flex items-center gap-1.5 cursor-pointer font-medium"
          title="Back to Workflows"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span>Workflows</span>
        </Link>
        <span className="text-white/20">|</span>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xs font-bold text-slate-100 uppercase tracking-wider">{title}</h1>
          <span 
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
              isPaused 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {workflowStatus}
          </span>
          {!canEdit && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
              Read-Only
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {executionMessage && (
          <span className="text-xs text-purple-300 font-mono px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-pulse">
            {executionMessage}
          </span>
        )}

        {/* Status Toggle Button */}
        {canToggleStatus && onToggleStatus && (
          isPaused ? (
            <button
              onClick={() => onToggleStatus('ACTIVE')}
              className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Activate workflow to enable executions"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Activate</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleStatus('PAUSED')}
              className="px-3 py-2 bg-white/[0.03] hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-slate-300 hover:text-amber-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Pause workflow"
            >
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Pause</span>
            </button>
          )
        )}

        {canEdit && (
          <button
            onClick={onSave}
            className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold rounded-lg transition cursor-pointer text-slate-200 hover:text-white"
          >
            Save Schema
          </button>
        )}

        {/* Execution Button with Paused Tooltip */}
        <div className="relative group/exec">
          <button
            onClick={onExecute}
            disabled={isExecuting || isPaused}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-300 flex items-center gap-2 text-white shadow-md ${
              isPaused
                ? 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 cursor-pointer shadow-purple-600/20'
            }`}
          >
            {isExecuting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span>Execute Workflow</span>
              </>
            )}
          </button>

          {isPaused && (
            <div className="absolute top-12 right-0 bg-[#080D1D]/95 border border-amber-500/30 text-amber-200 text-[10px] font-medium px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-xl opacity-0 group-hover/exec:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Workflow is in PAUSED state. Activate it to run execution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

