// frontend/components/canvas/ExecutionHistory.tsx
'use client';

import React, { useEffect, useState } from 'react';

interface ExecutionHistoryProps {
  workflowId: string;
}

export default function ExecutionHistory({ workflowId }: ExecutionHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:4000/api/workflow/${workflowId}/executions`, {
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
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-white/5 flex items-center justify-between px-6 z-25">
        <span className="text-xs text-slate-400">📊 Execution History Logs</span>
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
        >
          ▲ Expand History Drawer
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-72 bg-slate-900/95 border-t border-white/10 z-25 shadow-2xl backdrop-blur-md flex flex-col justify-between">
      {/* Header */}
      <div className="px-6 py-3 bg-slate-950 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">📊 Run Executions Log</span>
        <div className="flex gap-4">
          <button onClick={fetchHistory} className="text-xs text-slate-400 hover:text-white transition cursor-pointer">
            🔄 Refresh
          </button>
          <button onClick={() => setIsOpen(false)} className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer">
            ▼ Close
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="text-center text-xs text-slate-500 py-12">Retrieving telemetry history logs...</div>
        ) : history.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-12 italic">No execution logs found for this workflow.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400">
                <th className="py-2">Execution Run ID</th>
                <th className="py-2">Status</th>
                <th className="py-2">Started At</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Log summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((run) => {
                const duration = run.completedAt
                  ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                  : 'N/A';

                const statusColor =
                  run.status === 'COMPLETED'
                    ? 'text-green-400 bg-green-500/10'
                    : run.status === 'FAILED'
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-blue-400 bg-blue-500/10';

                return (
                  <tr key={run.id} className="hover:bg-white/5 transition">
                    <td className="py-3 font-mono text-slate-300">{run.id}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="py-3 text-slate-400">{duration}</td>
                    <td className="py-3 text-slate-400 truncate max-w-xs">
                      {run.logs?.length || 0} node logs logged
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
