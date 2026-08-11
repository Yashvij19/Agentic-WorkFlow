// frontend/components/canvas/PropertiesPanel.tsx
'use client';

import React from 'react';

interface PropertiesPanelProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, updatedData: any) => void;
  onClose: () => void;
  onExecuteUpToNode: (nodeId: string) => void; // <-- ADD THIS PROP
}

export default function PropertiesPanel({
  selectedNode,
  onUpdateNodeData,
  onClose,
  onExecuteUpToNode, // <-- DESTRUCTURE THIS PROP
}: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-slate-900/90 border-l border-white/5 p-6 flex items-center justify-center text-center text-slate-500 text-xs italic backdrop-blur-sm">
        Select a node to inspect and configure properties.
      </div>
    );
  }

  const { id, type, data } = selectedNode;

  return (
    <div className="w-80 bg-slate-900/90 border-l border-white/5 p-6 flex flex-col justify-between z-10 backdrop-blur-sm overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Properties</h2>
            <span className="text-[10px] text-slate-400 font-mono">ID: {id}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xs cursor-pointer">
            ✕
          </button>
        </div>

        {/* Input Trigger Node Editor */}
        {type === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Node Label</label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, label: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:border-purple-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Trigger Output Data</label>
              <textarea
                rows={4}
                value={data.output || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, output: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:border-purple-500 focus:outline-none transition font-mono"
                placeholder="Starter payload..."
              />
            </div>
          </div>
        )}

        {/* AI Agent Node Editor */}
        {type === 'agent' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gemini System Instructions</label>
              <input
                type="text"
                value={data.systemInstruction || 'Summarize or analyze details.'}
                onChange={(e) => onUpdateNodeData(id, { ...data, systemInstruction: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Agent Prompt Template</label>
              <textarea
                rows={6}
                value={data.prompt || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, prompt: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none transition font-sans"
                placeholder="Analyze this payload: {{node_1.output}}"
              />
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                * Support variables reference using <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 font-mono">{"{{node_id.output}}"}</code> to import values from upstream nodes.
              </p>
            </div>
          </div>
        )}

        {/* API Request Node Editor */}
        {type === 'api' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Request Method</label>
              <select
                value={data.method || 'GET'}
                onChange={(e) => onUpdateNodeData(id, { ...data, method: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none transition"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">API Target URL</label>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, url: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl focus:border-amber-500 focus:outline-none transition font-mono"
                placeholder="https://api.github.com/repos"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-white/5 pt-4">
        {/* Run Up to Node Action Button */}
        <button
          onClick={() => onExecuteUpToNode(id)}
          className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-xs font-semibold rounded-xl shadow-md transition duration-200 cursor-pointer"
        >
          Run Up To This Node 🎯
        </button>

        <div className="text-[10px] text-slate-500 leading-normal">
          Changes to parameters are saved to memory state instantly. Click <strong>Save Schema</strong> in the header to write blueprints permanently.
        </div>
      </div>
    </div>
  );
}
