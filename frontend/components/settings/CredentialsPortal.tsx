// frontend/components/settings/CredentialsPortal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/config';

interface CredentialsPortalProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function CredentialsPortal({ onBack, showBackButton = true }: CredentialsPortalProps) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [name, setName] = useState('GEMINI_API_KEY');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

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
    loadCredentials();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/[0.04] rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Back to settings overview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">LLM API Credentials</h2>
            <p className="text-slate-400 text-xs font-light mt-0.5">Symmetrically encrypted keys utilized for multi-agent workflows.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-xs text-slate-400 font-semibold tracking-wider uppercase gap-3">
          <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
          Loading key vault...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Configure Key Card */}
          <div className="bg-[#080D1D] border border-white/[0.07] p-6 md:p-8 rounded-2xl shadow-xl flex flex-col justify-between relative group hover:border-white/15 transition-[border-color] duration-300">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1 pl-1">Configure LLM Key</h3>
              <p className="text-[#98A4C2] text-xs font-light mb-6 pl-1">Store keys securely within your isolated partition.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Credential Name</label>
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
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">API Secret Key</label>
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                    placeholder="AIzaSy..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 hover:from-violet-600 hover:via-purple-500 hover:to-indigo-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-300 border border-white/10 hover:border-white/20 shadow-md cursor-pointer"
                >
                  Save Credentials
                </button>
              </form>
            </div>
          </div>

          {/* Configured Keys Card */}
          <div className="bg-[#080D1D] border border-white/[0.07] p-6 md:p-8 rounded-2xl shadow-xl flex flex-col justify-between relative group hover:border-white/15 transition-[border-color] duration-300">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1 pl-1">Configured Keys</h3>
              <p className="text-[#98A4C2] text-xs font-light mb-6 pl-1">API keys currently loaded and available inside your partition.</p>

              {credentials.length === 0 ? (
                <div className="text-[#687493] text-xs font-light py-16 text-center italic">
                  No credentials saved yet. Active runs will default to mock outputs.
                </div>
              ) : (
                <div className="space-y-3">
                  {credentials.map((cred) => (
                    <div key={cred.id} className="flex justify-between items-center bg-black/35 p-4 rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse" />
                        <span className="text-xs font-semibold font-mono text-slate-300">{cred.name}</span>
                      </div>
                      <span className="text-[9px] text-[#687493] font-mono">Added: {new Date(cred.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
