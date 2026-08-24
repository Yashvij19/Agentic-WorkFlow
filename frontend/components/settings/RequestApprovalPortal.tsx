// frontend/components/settings/RequestApprovalPortal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/config';

interface PendingRequest {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface RequestApprovalPortalProps {
  onBack: () => void;
}

export default function RequestApprovalPortal({ onBack }: RequestApprovalPortalProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadRequests = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/org/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setError('');
    setSuccess('');
    setActioningId(id);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/org/requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve request.');

      setSuccess("Teammate approved successfully! They can now log in.");
      loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setError('');
    setSuccess('');
    setActioningId(id);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/org/requests/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject request.');

      setSuccess("Registration request rejected and discarded.");
      loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActioningId(null);
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
            <h2 className="text-xl font-bold text-white">Registration Approvals</h2>
            <p className="text-slate-400 text-xs font-light mt-0.5">Approve or deny membership requests from new team registrants.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center items-center text-xs text-slate-400 font-semibold tracking-wider uppercase gap-3">
          <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
          Checking queue requests...
        </div>
      ) : (
        <div className="bg-[#080D1D] border border-white/[0.07] p-6 md:p-8 rounded-2xl shadow-xl relative group hover:border-white/15 transition-[border-color] duration-300">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          
          <h3 className="text-sm font-bold text-white mb-1 pl-1">Pending Approval Queue</h3>
          <p className="text-[#98A4C2] text-xs font-light mb-6 pl-1">Requests expire automatically after 48 hours if unapproved.</p>

          {requests.length === 0 ? (
            <div className="text-[#687493] text-xs font-light py-16 text-center italic">
              No pending registration requests for your organization.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] space-y-4">
              {requests.map((req) => {
                const isActioning = actioningId === req.id;
                const hoursLeft = Math.max(0, Math.round((new Date(req.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));

                return (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-white">{req.email}</span>
                      <div className="flex items-center gap-3 text-[10px] text-[#687493] font-mono">
                        <span>Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                        <span className="text-red-400">Expires in: {hoursLeft} hours</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={isActioning}
                        className="px-4 py-2 bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase rounded-xl border border-white/10 hover:border-white/20 transition cursor-pointer disabled:opacity-50"
                      >
                        {isActioning ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={isActioning}
                        className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-red-400 hover:text-red-300 text-[10px] font-bold tracking-wider uppercase rounded-xl border border-white/5 hover:border-white/10 transition cursor-pointer disabled:opacity-50"
                      >
                        {isActioning ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
