// frontend/components/canvas/PropertiesPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Search, Sliders, Activity, RotateCcw } from 'lucide-react';
import { API_URL } from '../../utils/config';

interface PropertiesPanelProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, updatedData: any) => void;
  onClose: () => void;
  onExecuteUpToNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  partialRunResult: string | null;
  workflowStatus?: string;
  onOpenTraceModal?: (nodeId: string) => void;
  onReplayNode: (nodeId: string, resumeDownstream: boolean) => void; 
}

export default function PropertiesPanel({
  selectedNode,
  onUpdateNodeData,
  onClose,
  onExecuteUpToNode,
  onDeleteNode,
  partialRunResult,
  workflowStatus = 'ACTIVE',
  onOpenTraceModal,
  onReplayNode,
}: PropertiesPanelProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);

  useEffect(() => {
    if (selectedNode?.type === 'rag_query') {
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/rag/knowledge-bases`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setKnowledgeBases(data);
        })
        .catch(err => console.error(err));
    }
  }, [selectedNode?.type]);

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

        {/* RAG Knowledge Node Editor */}
        {type === 'rag_query' && (
          <div className="space-y-4">
            {/* Knowledge Base Scope & Container Selector */}
            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1.5 pl-1">
                Knowledge Base Scope
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateNodeData(id, {
                      ...data,
                      knowledgeBaseScope: 'ORGANIZATION',
                      knowledgeSourceId: '',
                    });
                  }}
                  className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                    (data.knowledgeBaseScope || 'ORGANIZATION') === 'ORGANIZATION'
                      ? 'bg-violet-950/50 border-violet-500/50 text-violet-200 shadow-sm'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Organization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateNodeData(id, {
                      ...data,
                      knowledgeBaseScope: 'PERSONAL',
                      knowledgeSourceId: '',
                    });
                  }}
                  className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                    data.knowledgeBaseScope === 'PERSONAL'
                      ? 'bg-violet-950/50 border-violet-500/50 text-violet-200 shadow-sm'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Personal
                </button>
              </div>

              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                Target Knowledge Base
              </label>
              <select
                value={data.knowledgeSourceId || ''}
                onChange={(e) =>
                  onUpdateNodeData(id, {
                    ...data,
                    knowledgeSourceId: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white focus:border-violet-500/50 focus:outline-none transition cursor-pointer"
              >
                <option value="" className="bg-[#080D1D] text-slate-400">
                  -- All {(data.knowledgeBaseScope || 'ORGANIZATION').toLowerCase()} Knowledge Bases --
                </option>
                {knowledgeBases
                  .filter((kb) => kb.scope === (data.knowledgeBaseScope || 'ORGANIZATION'))
                  .map((kb) => (
                    <option key={kb.id} value={kb.id} className="bg-[#080D1D] text-slate-200">
                      {kb.name} ({kb._count?.documents || 0} docs)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Search Query / Prompt</label>
              <textarea
                rows={3}
                value={data.query || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, query: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs font-sans"
                placeholder="Find error code: {{trigger.output}}"
              />
              <p className="text-[9px] text-[#687493] mt-1.5 leading-relaxed">
                * Reference variables using <code className="bg-black/30 px-1 py-0.5 rounded text-purple-400 font-mono">{"{{node_id.output}}"}</code>.
              </p>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Use Case Profile</label>
              <select
                value={data.useCaseProfile || 'GENERAL_QA'}
                onChange={(e) => onUpdateNodeData(id, { ...data, useCaseProfile: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white focus:border-[#8B5CF6]/50 focus:outline-none transition cursor-pointer"
              >
                <option value="GENERAL_QA">General Q&A (Dense Vector)</option>
                <option value="TECHNICAL_DOCUMENTATION">Technical Docs (Hybrid + RRF)</option>
                <option value="COMPANY_POLICY">Company Policy (Keyword + Vector)</option>
                <option value="DATABASE_KNOWLEDGE">Database Knowledge (Exact Keyword)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Configuration Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateNodeData(id, { ...data, mode: 'simple' })}
                  className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                    (data.mode || 'simple') === 'simple'
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Simple Preset
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateNodeData(id, { ...data, mode: 'advanced' })}
                  className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                    data.mode === 'advanced'
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>

            {/* Advanced Settings Drawer */}
            {data.mode === 'advanced' && (
              <div className="space-y-3.5 p-3 bg-black/30 rounded-xl border border-white/5">
                {/* 1. Retrieval Mode */}
                <div>
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">Retrieval Mode</label>
                  <select
                    value={data.retrieval?.mode || 'hybrid'}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        retrieval: { ...(data.retrieval || {}), mode: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-black/45 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="hybrid">Hybrid (Vector + Keyword RRF)</option>
                    <option value="vector">Vector Only</option>
                    <option value="keyword">Keyword Only</option>
                  </select>
                </div>

                {/* 2. Top K Candidates */}
                <div>
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                    Initial Search Pool (Top K: {data.retrieval?.topK || 10})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={data.retrieval?.topK || 10}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        retrieval: { ...(data.retrieval || {}), topK: parseInt(e.target.value) },
                      })
                    }
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* 3. Phase 2: Reranker Strategy Selector */}
                <div className="pt-2 border-t border-white/[0.05]">
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                    Cross-Encoder Reranker
                  </label>
                  <select
                    value={data.reranker?.provider || 'none'}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        reranker: {
                          ...(data.reranker || {}),
                          provider: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-black/45 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="none">Disabled (Use RRF Scores)</option>
                    <option value="local_cross_encoder">Local Cross-Encoder (Neural Attention)</option>
                    <option value="simple_lexical">Simple Lexical (Fast Exact Match)</option>
                  </select>
                </div>

                {/* 4. Phase 2: Reranker Top-N Final Chunks */}
                {data.reranker?.provider && data.reranker.provider !== 'none' && (
                  <div>
                    <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                      Final Reranked Chunks (Top N: {data.reranker?.topN || 5})
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={data.reranker?.topN || 5}
                      onChange={(e) =>
                        onUpdateNodeData(id, {
                          ...data,
                          reranker: {
                            ...(data.reranker || {}),
                            topN: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* 5. Phase 3: Context Expansion Strategy */}
                <div className="pt-2 border-t border-white/[0.05]">
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                    Context Expansion Strategy
                  </label>
                  <select
                    value={data.context?.strategy || 'top_chunks'}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        context: {
                          ...(data.context || {}),
                          strategy: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-black/45 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="top_chunks">Standard Top Chunks (Default)</option>
                    <option value="parent_child">Parent-Child (Inject Full Parent)</option>
                    <option value="neighbors">Neighbor Window (Stitch Surrounding)</option>
                  </select>
                </div>

                {/* 6. Phase 3: Max Token Budget */}
                <div>
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                    Max Context Tokens: {data.context?.maxTokens || 4000}
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="12000"
                    step="500"
                    value={data.context?.maxTokens || 4000}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        context: {
                          ...(data.context || {}),
                          maxTokens: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* 7. Phase 4: Knowledge Graph Traversal */}
                <div className="pt-2 border-t border-white/[0.05]">
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">
                    Knowledge Graph Traversal (OKF)
                  </label>
                  <select
                    value={data.graph?.enabled !== false ? 'enabled' : 'disabled'}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        graph: {
                          ...(data.graph || {}),
                          enabled: e.target.value === 'enabled',
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-black/45 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="enabled">Enabled (2-Hop BFS Entity Multi-Hop)</option>
                    <option value="disabled">Disabled (Text-Only)</option>
                  </select>
                </div>

                {/* 8. Citation Format */}
                <div className="pt-2 border-t border-white/[0.05]">
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1 pl-1">Citation Format</label>
                  <select
                    value={data.context?.citationMode || 'inline'}
                    onChange={(e) =>
                      onUpdateNodeData(id, {
                        ...data,
                        context: { ...(data.context || {}), citationMode: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-black/45 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="inline">Inline Citations [Source 1]</option>
                    <option value="source_list">Source Bibliography at Bottom</option>
                    <option value="none">No Citations</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom JavaScript Code Node Editor */}
        {type === 'custom_code' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[9px] font-bold text-amber-400 uppercase tracking-widest pl-1">
                  JavaScript Code
                </label>
                <span className="text-[9px] text-[#687493] font-mono">Node.js V8</span>
              </div>
              
              <textarea
                rows={12}
                value={data.code || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, code: e.target.value })}
                className="w-full p-3 bg-black/60 border border-amber-500/20 focus:border-amber-500/50 rounded-xl text-xs font-mono text-amber-200/90 leading-relaxed outline-none transition resize-y"
                placeholder="module.exports = async function(inputs, context) { ... };"
                spellCheck={false}
              />
            </div>

            {/* Quick Starter Templates */}
            <div>
              <span className="block text-[9px] font-bold text-[#687493] uppercase tracking-widest mb-1.5 pl-1">
                Quick Snippets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNodeData(id, {
                      ...data,
                      code: `module.exports = async function(inputs, context) {\n  // Transform and clean data\n  return {\n    cleanText: inputs.text?.trim(),\n    timestamp: new Date().toISOString()\n  };\n};`,
                    })
                  }
                  className="py-1.5 px-2 bg-black/30 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-lg text-[10px] text-slate-300 hover:text-amber-200 transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Transform Data</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNodeData(id, {
                      ...data,
                      code: `module.exports = async function(inputs, context) {\n  // Query data from previous nodes\n  const prev = context.node_1?.output;\n  console.log("Memory context:", prev);\n  return { merged: prev };\n};`,
                    })
                  }
                  className="py-1.5 px-2 bg-black/30 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-lg text-[10px] text-slate-300 hover:text-amber-200 transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Query Memory</span>
                </button>
              </div>
            </div>

            {/* Timeout Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5 pl-1">
                <label className="text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest">
                  Timeout Limit: {(data.timeoutMs || 10000) / 1000}s
                </label>
              </div>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={data.timeoutMs || 10000}
                onChange={(e) => onUpdateNodeData(id, { ...data, timeoutMs: Number(e.target.value) })}
                className="w-full accent-amber-500 bg-black/40 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Available Scope Helpers */}
            <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-[#98A4C2] space-y-1">
              <span className="font-bold text-slate-200 block text-[9px] uppercase tracking-wider mb-1">
                Available Scope:
              </span>
              <p><code className="text-amber-300 font-mono">inputs</code>: Direct payload from parent node</p>
              <p><code className="text-amber-300 font-mono">context</code>: Full workflow memory dictionary</p>
              <p><code className="text-amber-300 font-mono">$node(id)</code>: Shorthand output lookup</p>
            </div>
          </div>
        )}

        {/* Custom Python Script Node Editor */}
        {type === 'python_code' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[9px] font-bold text-cyan-400 uppercase tracking-widest pl-1">
                  Python Script (3.x)
                </label>
                <span className="text-[9px] text-[#687493] font-mono">Python Runtime</span>
              </div>
              
              <textarea
                rows={12}
                value={data.code || ''}
                onChange={(e) => onUpdateNodeData(id, { ...data, code: e.target.value })}
                className="w-full p-3 bg-black/60 border border-cyan-500/20 focus:border-cyan-500/50 rounded-xl text-xs font-mono text-cyan-200/90 leading-relaxed outline-none transition resize-y"
                placeholder="def main(inputs, context):\n    return inputs"
                spellCheck={false}
              />
            </div>

            {/* Quick Starter Templates */}
            <div>
              <span className="block text-[9px] font-bold text-[#687493] uppercase tracking-widest mb-1.5 pl-1">
                Quick Snippets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNodeData(id, {
                      ...data,
                      code: `def main(inputs, context):\n    # Process text or list\n    print("Running Python processor...")\n    return {\n        "processed": True,\n        "keys": list(inputs.keys())\n    }`,
                    })
                  }
                  className="py-1.5 px-2 bg-black/30 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 rounded-lg text-[10px] text-slate-300 hover:text-cyan-200 transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Sliders className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>Text/Data Filter</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNodeData(id, {
                      ...data,
                      code: `def main(inputs, context):\n    # Extract all ancestor answers\n    answers = [v.get('output') for k, v in context.items() if 'output' in v]\n    return {"total_steps": len(answers), "answers": answers}`,
                    })
                  }
                  className="py-1.5 px-2 bg-black/30 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 rounded-lg text-[10px] text-slate-300 hover:text-cyan-200 transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>Query Memory</span>
                </button>
              </div>
            </div>

            {/* Timeout Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5 pl-1">
                <label className="text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest">
                  Timeout Limit: {(data.timeoutMs || 10000) / 1000}s
                </label>
              </div>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={data.timeoutMs || 10000}
                onChange={(e) => onUpdateNodeData(id, { ...data, timeoutMs: Number(e.target.value) })}
                className="w-full accent-cyan-500 bg-black/40 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Available Scope Helpers */}
            <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-[#98A4C2] space-y-1">
              <span className="font-bold text-slate-200 block text-[9px] uppercase tracking-wider mb-1">
                Python Function Signature:
              </span>
              <p><code className="text-cyan-300 font-mono">def main(inputs, context):</code></p>
              <p className="text-[9px] text-[#687493]">All <code className="text-slate-300 font-mono">print()</code> calls are captured in live telemetry logs!</p>
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
            <div className="absolute top-[-26px] right-0 bg-slate-950 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-white/10 opacity-0 group-hover/copy:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap shadow-lg">
              Copy Response
            </div>
          </div>
        )}

        {/* RAG Telemetry Trace Button */}
        {type === 'rag_query' && onOpenTraceModal && (
          <button
            onClick={() => onOpenTraceModal(id)}
            className="w-full py-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-500/60 text-purple-200 text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-200 shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <Activity className="w-3.5 h-3.5 text-purple-300" />
            <span>Inspect Live RAG Trace</span>
          </button>
        )}

        {/* Replay Node Actions Grid */}
        <div className="relative group/replay">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onReplayNode(id, false)}
              disabled={workflowStatus === 'PAUSED'}
              className={`py-2.5 border text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-200 flex items-center justify-center gap-1.5 ${
                workflowStatus === 'PAUSED'
                  ? 'bg-slate-800/50 border-white/5 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-500/50 text-blue-200 shadow-md cursor-pointer'
              }`}
              title={workflowStatus === 'PAUSED' ? undefined : "Run only this node using cached upstream data"}
            >
              <Zap className="w-3.5 h-3.5 text-blue-300" />
              <span>Run Step Only</span>
            </button>
            <button
              onClick={() => onReplayNode(id, true)}
              disabled={workflowStatus === 'PAUSED'}
              className={`py-2.5 border text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-200 flex items-center justify-center gap-1.5 ${
                workflowStatus === 'PAUSED'
                  ? 'bg-slate-800/50 border-white/5 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 hover:border-indigo-500/50 text-indigo-200 shadow-md cursor-pointer'
              }`}
              title={workflowStatus === 'PAUSED' ? undefined : "Replay from this node through all downstream children"}
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-300" />
              <span>Replay From Here</span>
            </button>
          </div>
          {workflowStatus === 'PAUSED' && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#080D1D]/95 border border-amber-500/30 text-amber-200 text-[10px] font-medium px-3 py-1 rounded-xl shadow-2xl backdrop-blur-xl opacity-0 group-hover/replay:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Workflow is in PAUSED state. Activate it to run.
            </div>
          )}
        </div>


        {/* Run Up to Node Action Button */}
        <div className="relative group/runupto">
          <button
            onClick={() => onExecuteUpToNode(id)}
            disabled={workflowStatus === 'PAUSED'}
            className={`w-full py-2.5 border text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-200 ${
              workflowStatus === 'PAUSED'
                ? 'bg-slate-800/50 border-white/5 text-slate-500 cursor-not-allowed opacity-50'
                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-white shadow-md cursor-pointer'
            }`}
          >
            Run Up To This Node
          </button>
          {workflowStatus === 'PAUSED' && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#080D1D]/95 border border-amber-500/30 text-amber-200 text-[10px] font-medium px-3 py-1 rounded-xl shadow-2xl backdrop-blur-xl opacity-0 group-hover/runupto:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Workflow is in PAUSED state. Activate it to run.
            </div>
          )}
        </div>

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
