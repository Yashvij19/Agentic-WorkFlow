// frontend/components/settings/TokenGenerationPortal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/config';

interface Token {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface TokenGenerationPortalProps {
  onBack: () => void;
}

export default function TokenGenerationPortal({ onBack }: TokenGenerationPortalProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [validForHours, setValidForHours] = useState(24);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadTokens = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/org/tokens`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTokens(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGenerating(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/org/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ validForHours }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate token.');

      setSuccess("Invite token generated successfully!");
      loadTokens();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/org/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke token.');

      setSuccess("Invite token revoked successfully.");
      loadTokens();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/[0.04] rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title="Back to settings overview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Invite Tokens</h2>
            <p className="text-slate-400 text-xs font-light mt-0.5">Manage token invite links used for registering new members.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-xs text-slate-400 font-semibold tracking-wider uppercase gap-3">
          <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
          Loading tokens...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Generate Token form */}
          <div className="bg-[#080D1D] border border-white/[0.07] p-6 md:p-8 rounded-2xl shadow-xl flex flex-col justify-between relative group hover:border-white/15 transition-[border-color] duration-300">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1 pl-1">Create Invite Token</h3>
              <p className="text-[#98A4C2] text-xs font-light mb-6 pl-1">Limit: Max 3 active unexpired tokens simultaneously.</p>

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

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2 pl-1">Validity Period</label>
                  <select
                    value={validForHours}
                    onChange={(e) => setValidForHours(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-[#8B5CF6]/50 focus:outline-none transition text-sm text-white cursor-pointer"
                  >
                    <option value={2}>2 Hours</option>
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours (2 Days)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={generating || tokens.length >= 3}
                  className="w-full py-3 mt-4 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 hover:from-violet-600 hover:via-purple-500 hover:to-indigo-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-300 border border-white/10 hover:border-white/20 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {generating ? 'Generating...' : tokens.length >= 3 ? 'Max Token Limit Reached (3)' : 'Generate Invite Code'}
                </button>
              </form>
            </div>
          </div>

          {/* Active Tokens List */}
          <div className="bg-[#080D1D] border border-white/[0.07] p-6 md:p-8 rounded-2xl shadow-xl flex flex-col justify-between relative group hover:border-white/15 transition-[border-color] duration-300">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1 pl-1">Active Invitations</h3>
              <p className="text-[#98A4C2] text-xs font-light mb-6 pl-1">Copy code for team registration. Expired tokens are purged automatically.</p>

              {tokens.length === 0 ? (
                <div className="text-[#687493] text-xs font-light py-16 text-center italic">
                  No active tokens. Generate one to invite teammates.
                </div>
              ) : (
                <div className="space-y-4">
                  {tokens.map((tok) => {
                    const expiryDate = new Date(tok.expiresAt);
                    const isExpired = expiryDate.getTime() < Date.now();

                    return (
                      <div key={tok.id} className="bg-black/35 p-4 rounded-xl border border-white/[0.04] space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold font-mono text-indigo-400 select-all bg-black/45 px-3 py-1.5 rounded-lg border border-white/[0.03]">
                            {tok.token}
                          </span>
                          <button
                            onClick={() => handleRevoke(tok.id)}
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                        <div className="flex justify-between text-[9px] text-[#687493] font-mono px-0.5">
                          <span>Issued: {new Date(tok.createdAt).toLocaleDateString()}</span>
                          <span className={isExpired ? 'text-red-400' : 'text-slate-400'}>
                            Expires: {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
