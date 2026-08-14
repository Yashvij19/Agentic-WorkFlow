// frontend/components/canvas/ExecutionHistory.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { API_URL } from '../../utils/config';

interface ExecutionHistoryProps {
  workflowId: string;
}

export default function ExecutionHistory({ workflowId }: ExecutionHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/workflow/${workflowId}/executions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, workflowId]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-[#030617]/90 backdrop-blur-md border-t border-white/[0.05] flex items-center justify-between px-6 z-25 shadow-lg">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Execution History Logs</span>
        <button
          onClick={() => setIsOpen(true)}
          className="text-[#8B5CF6] hover:text-[#7C3AED] text-[10px] font-bold tracking-widest uppercase transition duration-200 cursor-pointer"
        >
          Expand Logs Panel
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-72 bg-[#030617]/95 backdrop-blur-md border-t border-white/[0.08] z-25 shadow-2xl flex flex-col justify-between transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-3.5 bg-black/45 border-b border-white/[0.05] flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-200 tracking-widest uppercase">Run Executions Log</span>
        <div className="flex gap-2">
          <button 
            onClick={fetchHistory} 
            className="glass-button px-3.5 py-1.5 text-[9px] font-bold tracking-wider uppercase rounded-lg cursor-pointer"
          >
            Refresh
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="px-3.5 py-1.5 bg-[#EF4444]/10 hover:bg-[#EF4444] border border-[#EF4444]/20 hover:border-transparent text-[#EF4444] hover:text-white text-[9px] font-bold tracking-wider uppercase rounded-lg transition duration-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto px-6 py-4 bg-black/15">
        {loading ? (
          <div className="text-center text-[10px] font-mono tracking-wider uppercase text-slate-500 py-12 flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
            Retrieving telemetry history logs...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-12 italic">No execution logs found for this workflow.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05] text-[#687493] uppercase font-bold tracking-widest text-[9px]">
                <th className="py-2.5 pl-2">Execution Run ID</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Started At</th>
                <th className="py-2.5">Duration</th>
                <th className="py-2.5">Log summary</th>
                <th className="py-2.5 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {history.map((run) => {
                const duration = run.completedAt
                  ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                  : 'N/A';

                const statusColor =
                  run.status === 'COMPLETED'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : run.status === 'FAILED'
                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : 'text-sky-400 bg-sky-500/10 border-sky-500/20';

                return (
                  <tr key={run.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pl-2 font-mono text-slate-300">{run.id}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold uppercase tracking-wider ${statusColor}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">{duration}</td>
                    <td className="py-3 text-slate-400 truncate max-w-xs pl-1 font-mono text-[11px]">
                      {run.logs?.length || 0} node logs
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="glass-button px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase rounded-lg text-slate-300 hover:text-white cursor-pointer transition"
                      >
                        View Result
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>

      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#080D1D]/95 border border-white/[0.08] backdrop-blur-md rounded-2xl max-w-xl w-full max-h-[82vh] flex flex-col p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Execution Result Detail</h3>
                <span className="text-[9px] font-mono text-[#687493] uppercase tracking-wider">Run: {selectedRun.id}</span>
              </div>
              <button 
                onClick={() => setSelectedRun(null)}
                className="p-1 hover:bg-white/[0.04] rounded-lg text-slate-500 hover:text-white transition cursor-pointer"
                title="Dismiss"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List of execution node results */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-4">
              {selectedRun.logs && selectedRun.logs.length > 0 ? (
                selectedRun.logs.map((log: any) => {
                  const resultData = log.outputData?.result?.output || log.outputData?.result || log.outputData?.error || 'No output data.';
                  const isError = log.status === 'FAILED' || !!log.outputData?.error;
                  const textToCopy = typeof resultData === 'object' ? JSON.stringify(resultData, null, 2) : String(resultData);
                  return (
                    <div key={log.id} className="p-4 bg-black/30 rounded-xl border border-white/[0.04]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-slate-200 uppercase">{log.nodeId}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono ${
                            isError ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#687493] font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="relative group/copy">
                        <pre className="text-xs font-mono text-slate-300 bg-black/45 p-3 rounded-lg border border-white/[0.03] whitespace-pre-wrap overflow-visible pr-9">
                          {textToCopy}
                        </pre>
                        <button 
                          onClick={() => navigator.clipboard.writeText(textToCopy)}
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
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-xs py-8 text-center italic">No node execution logs found for this run.</div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end border-t border-white/[0.05] pt-4 shrink-0">
              <button 
                onClick={() => setSelectedRun(null)}
                className="glass-button px-5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl cursor-pointer text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
