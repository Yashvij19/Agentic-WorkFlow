// frontend/components/canvas/PropertiesPanel.tsx
'use client';

import React from 'react';

interface PropertiesPanelProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, updatedData: any) => void;
  onClose: () => void;
  onExecuteUpToNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  partialRunResult: string | null;
}

export default function PropertiesPanel({
  selectedNode,
  onUpdateNodeData,
  onClose,
  onExecuteUpToNode,
  onDeleteNode,
  partialRunResult,
}: PropertiesPanelProps) {
  if (!selectedNode) return null;

  const { id, type, data } = selectedNode;

  return (
    <div className="w-80 bg-[#080D1D]/75 border-l border-white/[0.08] p-6 flex flex-col justify-between z-10 backdrop-blur-md overflow-y-auto relative transition-all duration-300">
      {/* Visual Glass Edge highlight */}
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Properties</h2>
            <span className="text-[9px] text-[#687493] font-mono uppercase tracking-wider">ID: {id}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/[0.04] rounded-lg text-slate-500 hover:text-white transition cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input Trigger Node Editor */}
        {type === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Node Label</label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, label: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Trigger Output Data</label>
              <textarea
                rows={4}
                value={data.output || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, output: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs font-mono"
                placeholder="Starter payload..."
              />
            </div>
          </div>
        )}

        {/* AI Agent Node Editor */}
        {type === 'agent' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Gemini System Instructions</label>
              <input
                type="text"
                value={data.systemInstruction || 'Summarize or analyze details.'}
                onChange={(e) => onUpdateNodeData(id, { ...data, systemInstruction: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">AI Agent Prompt Template</label>
              <textarea
                rows={6}
                value={data.prompt || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, prompt: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs font-sans"
                placeholder="Analyze this payload: {{node_1.output}}"
              />
              <p className="text-[9px] text-[#687493] mt-2 leading-relaxed">
                * Reference variables using <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-400 font-mono">{"{{node_id.output}}"}</code>.
              </p>
            </div>
          </div>
        )}

        {/* API Request Node Editor */}
        {type === 'api' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Request Method</label>
              <select
                value={data.method || 'GET'}
                onChange={(e) => onUpdateNodeData(id, { ...data, method: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white focus:border-[#8B5CF6]/50 focus:outline-none transition cursor-pointer"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">API Target URL</label>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, url: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs font-mono"
                placeholder="https://api.github.com/repos"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3.5 border-t border-white/[0.05] pt-4">
        {/* Node Partial Run Response Box */}
        {partialRunResult && (
          <div className="p-3 bg-black/35 rounded-xl border border-white/[0.04] mb-1 relative group/copy">
            <span className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1.5 pl-1">Execution Response</span>
            <pre className="text-[10px] font-mono text-emerald-400 bg-black/45 p-2.5 rounded-lg border border-white/[0.03] max-h-40 overflow-y-auto overflow-x-auto whitespace-pre-wrap pr-9">
              {partialRunResult}
            </pre>
            <button 
              onClick={() => navigator.clipboard.writeText(partialRunResult)}
              className="absolute top-2 right-2 p-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer z-10"
              title="Copy Response"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
              </svg>
            </button>
            {/* Tooltip */}
            <div className="absolute top-[-26px] right-0 bg-slate-950 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-white/10 opacity-0 group-hover/copy:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap shadow-lg">
              Copy Response
            </div>
          </div>
        )}

        {/* Run Up to Node Action Button */}
        <button
          onClick={() => onExecuteUpToNode(id)}
          className="w-full py-2.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 text-white text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-200 shadow-md cursor-pointer"
        >
          Run Up To This Node
        </button>

        {/* Delete Node Button */}
        <button
          onClick={() => onDeleteNode(id)}
          className="w-full py-2.5 bg-[#EF4444]/10 hover:bg-[#EF4444] border border-[#EF4444]/20 hover:border-transparent text-[#EF4444] hover:text-white text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-200 shadow-md cursor-pointer"
        >
          Delete Node
        </button>

        <div className="text-[9px] text-[#687493] leading-normal font-light">
          Parameters are saved to memory state instantly. Click <strong>Save Schema</strong> in the header to write blueprints permanently.
        </div>
      </div>
    </div>
  );
}
