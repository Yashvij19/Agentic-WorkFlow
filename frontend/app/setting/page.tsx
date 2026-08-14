// frontend/app/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../utils/config';

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
      const res = await fetch(`${API_URL}/api/credentials`, {
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
      const res = await fetch(`${API_URL}/api/credentials`, {
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
      <div className="min-h-screen bg-[#030617] text-[#98A4C2] flex items-center justify-center font-semibold text-xs tracking-wider uppercase">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
          Loading secure parameters...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030617] text-[#F5F7FF] font-sans selection:bg-[#8B5CF6]/30 selection:text-white pb-20">
      {/* Navbar matching dashboard compact styling */}
      <nav className="border-b border-white/[0.05] bg-[#030617]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="font-bold tracking-tight text-white text-base hover:text-slate-200 transition-colors duration-200">
              FlowAgent
            </Link>
          </div>
          <Link 
            href="/workflow" 
            className="glass-button px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Workflows
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8 relative z-10">
        {/* Save API Key Form */}
        <div className="bg-[#080D1D] border border-white/[0.07] p-8 rounded-2xl shadow-xl flex flex-col justify-between relative group hover:border-white/15 transition-all duration-300">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">Configure LLM Key</h2>
            <p className="text-[#98A4C2] text-xs font-light mb-6">Keys are encrypted symmetrically before database insert.</p>

            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-red-200 text-xs px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#EF4444] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2">Credential Name</label>
                <select
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-[#8B5CF6]/50 focus:outline-none transition text-sm text-white cursor-pointer"
                >
                  <option value="GEMINI_API_KEY">GEMINI_API_KEY (Recommended)</option>
                  <option value="OPENAI_API_KEY">OPENAI_API_KEY</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2">API Secret Key</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none"
                  placeholder="AIzaSy..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-4 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 hover:from-violet-600 hover:via-purple-500 hover:to-indigo-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-300 border border-white/10 hover:border-white/20 shadow-[0_4px_20px_rgba(139,92,246,0.15)] hover:shadow-[0_4px_24px_rgba(139,92,246,0.25)] hover:-translate-y-[1px] cursor-pointer"
              >
                Save Credentials
              </button>
            </form>
          </div>
        </div>

        {/* Existing Credentials List */}
        <div className="bg-[#080D1D] border border-white/[0.07] p-8 rounded-2xl shadow-xl flex flex-col justify-between relative group hover:border-white/15 transition-all duration-300">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">Configured Keys</h2>
            <p className="text-[#98A4C2] text-xs font-light mb-6">List of credentials currently loaded inside your organization partition.</p>

            {credentials.length === 0 ? (
              <div className="text-[#687493] text-xs font-light py-8 text-center italic">
                No keys set yet. Run executions will default to fallback mock mode.
              </div>
            ) : (
              <div className="space-y-3">
                {credentials.map((cred) => (
                  <div key={cred.id} className="flex justify-between items-center bg-black/35 p-4 rounded-xl border border-white/[0.04]">
                    <span className="text-xs font-semibold font-mono text-slate-300">{cred.name}</span>
                    <span className="text-[9px] text-[#687493] font-mono">Last updated: {new Date(cred.createdAt).toLocaleDateString()}</span>
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
