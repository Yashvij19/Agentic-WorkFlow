// frontend/components/canvas/TraceInspectorModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/config';

interface TraceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionId?: string | null;
  nodeId?: string | null;
  traceId?: string | null;
}

export default function TraceInspectorModal({
  isOpen,
  onClose,
  executionId,
  nodeId,
  traceId,
}: TraceInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'query' | 'candidates' | 'context'>('waterfall');
  const [trace, setTrace] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || (!traceId && !executionId && !nodeId)) {
      return;
    }

    const fetchTrace = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      try {
        let endpoint = '';
        if (traceId) {
          endpoint = `${API_URL}/api/rag/trace/${traceId}`;
        } else if (executionId && nodeId) {
          endpoint = `${API_URL}/api/rag/traces/${executionId}/${nodeId}`;
        } else if (nodeId) {
          endpoint = `${API_URL}/api/rag/traces/node/${nodeId}`;
        }

        if (!endpoint) return;

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch telemetry trace.');
        }
        setTrace(data.trace);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrace();
  }, [isOpen, executionId, nodeId, traceId]);

  if (!isOpen) return null;

  const metrics = trace?.metricsJson || {};
  const timing = metrics?.timing || {
    analysisMs: 0,
    retrievalMs: 0,
    fusionMs: 0,
    rerankMs: 0,
    expansionMs: 0,
    graphMs: 0,
    contextBuildMs: 0,
    generationMs: 0,
    totalMs: metrics?.latencyMs || 0,
  };
  const totalMs = Math.max(timing.totalMs || metrics?.latencyMs || 1, 1);

  const waterfallStages = [
    { name: '1. Query Analysis', ms: timing.analysisMs || 0, color: 'bg-indigo-500' },
    { name: '2. DB Search (Vector + Keyword)', ms: timing.retrievalMs || 0, color: 'bg-blue-500' },
    { name: '3. Reciprocal Rank Fusion', ms: timing.fusionMs || 0, color: 'bg-cyan-500' },
    { name: '4. Cross-Encoder Reranker', ms: timing.rerankMs || 0, color: 'bg-purple-500' },
    { name: '5. Context Expansion (Parent/Neighbors)', ms: timing.expansionMs || 0, color: 'bg-emerald-500' },
    { name: '6. Graph Traversal (OKF Links)', ms: timing.graphMs || 0, color: 'bg-teal-500' },
    { name: '7. Context Assembly & Deduplication', ms: timing.contextBuildMs || 0, color: 'bg-amber-500' },
    { name: '8. LLM Answer Generation', ms: timing.generationMs || 0, color: 'bg-rose-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0A0D1A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#060813] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
                RAG Observability & Telemetry Trace
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                  Node: {nodeId || trace?.nodeId || 'N/A'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-xl">
                Query: <span className="text-slate-200 italic font-mono">"{trace?.query || 'Loading...'}"</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {metrics?.latencyMs !== undefined && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                ⚡ {metrics.latencyMs} ms
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#070A17] px-6">
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'waterfall'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Latency Waterfall & Cost
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'query'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 Query & Intent Analysis
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'candidates'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔄 Search & Rerank Matrix ({trace?.retrievedJson?.length || 0} Candidates)
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'context'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🕸️ Context & Synthesized Answer
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#04060F]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <span className="text-xs uppercase tracking-widest font-mono">Loading RAG Trace Telemetry...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <strong>Telemetry Error:</strong> {error}
            </div>
          ) : !trace ? (
            <div className="text-center py-20 text-slate-500 italic text-sm">
              No trace telemetry recorded for this node execution.
            </div>
          ) : (
            <>
              {/* TAB 1: Waterfall & Metrics */}
              {activeTab === 'waterfall' && (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Latency</div>
                      <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{metrics.latencyMs || 0} <span className="text-xs text-slate-500">ms</span></div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chunks Filtered</div>
                      <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                        {metrics.chunksUsed || 0} <span className="text-xs text-slate-500">/ {metrics.chunksRetrieved || 0} hits</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Est. Token Usage</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                        {(metrics.estimatedPromptTokens || 0) + (metrics.estimatedCompletionTokens || 0)}{' '}
                        <span className="text-xs text-slate-500">tokens</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Est. Cost (USD)</div>
                      <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                        ${metrics.estimatedCostUsd !== undefined ? metrics.estimatedCostUsd.toFixed(6) : '0.000000'}
                      </div>
                    </div>
                  </div>

                  {/* Latency Waterfall Chart */}
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center justify-between">
                      <span>Pipeline Latency Waterfall</span>
                      <span className="text-[10px] font-mono text-slate-500">Total: {totalMs}ms</span>
                    </h3>

                    <div className="space-y-3">
                      {waterfallStages.map((stage, idx) => {
                        const pct = Math.max(Math.round((stage.ms / totalMs) * 100), stage.ms > 0 ? 2 : 0);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-slate-300">{stage.name}</span>
                              <span className="text-slate-400">{stage.ms} ms ({pct}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Query Analysis & Intent */}
              {activeTab === 'query' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Raw Query</div>
                      <div className="p-3 bg-black/40 rounded-lg text-xs font-mono text-purple-300 border border-white/5">
                        {trace.query}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Normalized Query</div>
                      <div className="p-3 bg-black/40 rounded-lg text-xs font-mono text-cyan-300 border border-white/5">
                        {trace.analysisJson?.normalizedQuery || trace.query}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Detected Intent & Filters</div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase">Classified Intent</span>
                        <span className="font-semibold text-emerald-400">{trace.analysisJson?.intent || 'GENERAL_QA'}</span>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase">Keywords Extracted</span>
                        <span className="text-slate-300 font-mono">
                          {trace.analysisJson?.keywords?.join(', ') || 'None'}
                        </span>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase">Active Filters</span>
                        <span className="text-slate-300 font-mono">
                          {JSON.stringify(trace.analysisJson?.filters || {})}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Retrieval Plan Details</div>
                    <pre className="p-3 bg-black/40 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-white/5">
                      {JSON.stringify(trace.planJson, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Search & Rerank Matrix */}
              {activeTab === 'candidates' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>
                      Comparing candidates retrieved across <strong>Vector Search</strong>, <strong>Keyword Search</strong>, and <strong>Cross-Encoder Reranker</strong>.
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(trace.rerankedJson || trace.fusedJson || trace.retrievedJson || []).map((chunk: any, i: number) => {
                      const initialRank = chunk.initialRank !== undefined ? chunk.initialRank : i + 1;
                      const isReranked = trace.rerankedJson && trace.rerankedJson.length > 0;

                      return (
                        <div
                          key={chunk.chunkId || i}
                          className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/40 transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-mono font-bold">
                                #{i + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-200">{chunk.title || 'Document Chunk'}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase font-mono">
                                {chunk.retrievalMethod || 'hybrid'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono">
                              <span className="text-slate-400">
                                Score: <strong className="text-cyan-400">{typeof chunk.score === 'number' ? chunk.score.toFixed(4) : chunk.score}</strong>
                              </span>
                              {isReranked && (
                                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded">
                                  Initial Rank: #{initialRank}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 bg-black/40 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap border border-white/5 max-h-36 overflow-y-auto">
                            {chunk.content}
                          </div>

                          {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {Object.entries(chunk.metadata).map(([k, v]) => (
                                <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: Context & Synthesized Answer */}
              {activeTab === 'context' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-purple-500/[0.03] border border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Synthesized Answer (Gemini)</div>
                      <span className="text-[10px] font-mono text-slate-400">Grounded Output</span>
                    </div>
                    <div className="p-4 bg-black/50 rounded-xl text-xs text-slate-100 whitespace-pre-wrap leading-relaxed border border-purple-500/20 font-sans">
                      {trace.answerString || 'No answer generated.'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Prompt Context Provided to LLM</div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {metrics.tokensUsedEstimate || 0} tokens
                      </span>
                    </div>
                    <pre className="p-4 bg-black/50 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-80 overflow-y-auto border border-white/5">
                      {trace.contextString || 'No context assembled.'}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#060813] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
