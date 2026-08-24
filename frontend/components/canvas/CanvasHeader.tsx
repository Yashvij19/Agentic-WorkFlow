// frontend/components/canvas/CanvasHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface CanvasHeaderProps {
  title: string;
  isExecuting: boolean;
  executionMessage: string;
  onSave: () => void;
  onExecute: () => void;
}

export default function CanvasHeader({
  title,
  isExecuting,
  executionMessage,
  onSave,
  onExecute,
}: CanvasHeaderProps) {
  return (
    <div className="h-16 bg-[#030617] border-b border-white/[0.05] flex items-center justify-between px-6 shadow-sm z-20">
      <div className="flex items-center gap-4">
        <Link 
          href="/workflow" 
          className="text-slate-400 hover:text-white transition text-xs flex items-center gap-1.5 cursor-pointer font-medium"
          title="Back to Workflows"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Workflows</span>
        </Link>
        <span className="text-white/20">|</span>
        <h1 className="text-xs font-bold text-slate-100 uppercase tracking-wider">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {executionMessage && (
          <span className="text-xs text-purple-300 font-mono px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-pulse">
            {executionMessage}
          </span>
        )}
        <button
          onClick={onSave}
          className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold rounded-lg transition cursor-pointer text-slate-200 hover:text-white"
        >
          Save Schema
        </button>
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold rounded-lg transition duration-300 disabled:opacity-50 cursor-pointer flex items-center gap-2 text-white shadow-md shadow-purple-600/20"
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
      </div>
    </div>
  );
}
