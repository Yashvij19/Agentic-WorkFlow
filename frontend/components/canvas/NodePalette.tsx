// frontend/components/canvas/NodePalette.tsx
'use client';

import React from 'react';

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-slate-900/90 border-r border-white/5 p-6 flex flex-col gap-6 z-10 backdrop-blur-sm">
      <div>
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Node Palette</h2>
        <p className="text-xs text-slate-400 mt-1">Drag and drop nodes onto the canvas to map out your pipeline</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Trigger Node Item */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'input')}
          className="flex items-center gap-3 p-4 bg-slate-950 border border-purple-500/20 hover:border-purple-500/40 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
        >
          <span className="text-xl">⚡</span>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Webhook Trigger</h4>
            <p className="text-[10px] text-slate-500">Pipeline entry input</p>
          </div>
        </div>

        {/* AI Agent Node Item */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'agent')}
          className="flex items-center gap-3 p-4 bg-slate-950 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
        >
          <span className="text-xl">🤖</span>
          <div>
            <h4 className="text-xs font-bold text-slate-200">AI Agent</h4>
            <p className="text-[10px] text-slate-500">Gemini content brain</p>
          </div>
        </div>

        {/* API Request Node Item */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'api')}
          className="flex items-center gap-3 p-4 bg-slate-950 border border-amber-500/20 hover:border-amber-500/40 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
        >
          <span className="text-xl">🌐</span>
          <div>
            <h4 className="text-xs font-bold text-slate-200">API Connector</h4>
            <p className="text-[10px] text-slate-500">Query external REST APIs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
