// frontend/app/workflows/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WorkflowsDashboard() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('http://localhost:4000/api/workflows', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load workflows.');
        return res.json();
      })
      .then((data) => {
        setWorkflows(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');

    // Create a base valid starting DAG structure (one trigger node, one agent node)
    const defaultNodes = [
      { id: 'node_1', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Webhook Trigger ⚡', output: 'explain the docker hub' } },
      { id: 'node_2', type: 'agent', position: { x: 250, y: 200 }, data: { prompt: 'Summarize the input: {{node_1.output}}' } }
    ];
    const defaultEdges = [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true }
    ];

    try {
      const res = await fetch('http://localhost:4000/api/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newWorkflowName,
          nodes: defaultNodes,
          edges: defaultEdges,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create workflow.');

      router.push(`/workflow/${data.workflowId}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center font-semibold text-sm">
        Loading workspace environment...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤖</span>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              FlowAgent
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/setting" className="text-sm text-slate-300 hover:text-white transition">
              ⚙️ Organization Settings
            </Link>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition cursor-pointer">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Workflows Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Design, edit, and track your active agent graphs</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition duration-300 cursor-pointer"
          >
            + Create New Workflow
          </button>
        </div>

        {/* Workflows list */}
        {workflows.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center bg-slate-900/20">
            <span className="text-5xl block mb-4">🕸️</span>
            <h3 className="text-lg font-bold text-slate-200">No workflows found</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
              Start building automation maps by clicking "Create New Workflow" above.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-slate-900/50 border border-white/5 hover:border-purple-500/20 p-6 rounded-2xl transition duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                      {wf.status}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(wf.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-200">{wf.name}</h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Contains {wf.nodesJson?.length || 0} node configurations
                  </p>
                </div>
                <Link
                  href={`/workflow/${wf.id}`}
                  className="w-full text-center py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-800 text-xs font-semibold rounded-xl transition"
                >
                  Configure Canvas
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 relative">
            <h2 className="text-xl font-bold mb-4">New Agentic Workflow</h2>
            {error && <div className="text-red-400 text-xs mb-4">⚠️ {error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm text-white"
                  placeholder="Data Aggregator Run"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-950 border border-white/10 hover:bg-slate-800 text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-semibold rounded-xl transition"
                >
                  Create Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
