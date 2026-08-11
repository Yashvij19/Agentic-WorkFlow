// frontend/app/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [name, setName] = useState('GEMINI_API_KEY');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadCredentials = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:4000/api/credentials', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadCredentials();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:4000/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, apiKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credential.');

      setSuccess(`Credential '${name}' successfully configured!`);
      setApiKey('');
      loadCredentials();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center font-semibold text-sm">
        Loading secure parameters...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/workflow" className="flex items-center gap-3 cursor-pointer">
            <span className="text-xl">🤖</span>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              FlowAgent
            </span>
          </Link>
          <Link href="/workflow" className="text-sm text-slate-300 hover:text-white transition">
            ⬅️ Back to Workflows
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8">
        {/* Save API Key Form */}
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold mb-2">Configure LLM Key</h2>
          <p className="text-slate-400 text-xs mb-6">Keys are encrypted symmetrically before database insert.</p>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-3 rounded-lg mb-4">⚠️ {error}</div>}
          {success && <div className="bg-green-500/10 border border-green-500/20 text-green-200 text-xs px-4 py-3 rounded-lg mb-4">✅ {success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Credential Name</label>
              <select
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm text-white"
              >
                <option value="GEMINI_API_KEY">GEMINI_API_KEY (Recommended)</option>
                <option value="OPENAI_API_KEY">OPENAI_API_KEY</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">API Secret Key</label>
              <input
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm text-white"
                placeholder="AIzaSy..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold rounded-xl transition duration-300 text-sm cursor-pointer"
            >
              Save Credentials
            </button>
          </form>
        </div>

        {/* Existing Credentials List */}
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Configured Keys</h2>
            <p className="text-slate-400 text-xs mb-6">List of credentials currently loaded inside your organization partition.</p>

            {credentials.length === 0 ? (
              <div className="text-slate-500 text-sm py-8 text-center italic">No keys set yet. Run executions will default to fallback mock mode.</div>
            ) : (
              <div className="space-y-3">
                {credentials.map((cred) => (
                  <div key={cred.id} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-white/5">
                    <span className="text-sm font-semibold font-mono text-slate-300">{cred.name}</span>
                    <span className="text-[10px] text-slate-500">Last updated: {new Date(cred.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
