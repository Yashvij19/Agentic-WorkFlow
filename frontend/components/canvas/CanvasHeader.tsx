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
    <div className="h-16 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 shadow-sm z-20">
      <div className="flex items-center gap-4">
        <Link href="/workflow" className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1 cursor-pointer">
          ⬅️ Dashboard
        </Link>
        <span className="text-white/20">|</span>
        <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {executionMessage && (
          <span className="text-xs text-purple-300 font-mono px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-pulse">
            {executionMessage}
          </span>
        )}
        <button
          onClick={onSave}
          className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-white/10 text-xs font-semibold rounded-lg transition cursor-pointer"
        >
          Save Schema
        </button>
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold rounded-lg transition duration-300 disabled:opacity-50 cursor-pointer"
        >
          {isExecuting ? 'Running...' : 'Execute Workflow ⚡'}
        </button>
      </div>
    </div>
  );
}
