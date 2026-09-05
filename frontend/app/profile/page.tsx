// frontend/app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Shield, KeyRound, Building, Mail, Clock, CheckCircle2, XCircle, Lock, ArrowLeft, ShieldCheck, Key, RefreshCw } from 'lucide-react';
import { API_URL } from '../../utils/config';
import { useToast } from '@/context/ToastContext';
import AetherFlowLogo from '@/components/AetherFlowLogo';

import { PageTransitionLoader } from '@/components/PageTransitionLoader';

interface UserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'SINGLE';
  organizationId: string;
  organizationName: string;
  permissions?: any;
  createdAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Password Reset State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve profile.');
      }
      const data = await res.json();
      setProfile(data);
    } catch (err: any) {
      console.error(err);
      // Fallback from localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setProfile(JSON.parse(userStr));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.warning('Please enter your current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setIsResetting(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      toast.success('Your password has been changed successfully.');

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const emailInitial = profile?.email ? profile.email.charAt(0).toUpperCase() : 'U';
  const perms = profile?.permissions || {};

  const permissionList = [
    { key: 'canCreateWorkflow', label: 'Create Workflows', desc: 'Build and save new workflows in organization' },
    { key: 'canViewTeamWorkflows', label: 'View Team Workflows', desc: 'Browse workflows created by teammates' },
    { key: 'canEditTeamWorkflows', label: 'Edit Team Blueprints', desc: 'Modify nodes and DAG configurations of team workflows' },
    { key: 'canRenameTeamWorkflows', label: 'Rename Team Workflows', desc: 'Change titles of team workflows' },
    { key: 'canExecuteTeamWorkflows', label: 'Execute Team Workflows', desc: 'Trigger full and partial executions on team workflows' },
    { key: 'canDeleteTeamWorkflows', label: 'Delete Team Workflows', desc: 'Permanently remove team workflows' },
    { key: 'canViewTeamExecutions', label: 'View Team Runs & Logs', desc: 'Monitor execution telemetry and node outputs of others' },
    { key: 'canViewTeamFailedExecutions', label: 'View Dead Letter Queue', desc: 'Inspect queue error logs and failed retry attempts' },
    { key: 'canCreatePersonalKnowledgeBase', label: 'Personal Knowledge Base', desc: 'Create private document indices isolated to yourself' },
    { key: 'canChangeOrgKnowledgeBase', label: 'Modify Org Knowledge Base', desc: 'Upload and delete in shared organization knowledge bases' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030617] flex items-center justify-center">
        <PageTransitionLoader text="PROFILE" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030617] text-[#F5F7FF] font-sans selection:bg-[#8B5CF6]/30 selection:text-white pb-20 relative overflow-x-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="border-b border-white/[0.05] bg-[#030617]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/workflow" className="flex items-center gap-2 group">
              <AetherFlowLogo size={26} showText textSize="text-base" />
            </Link>
            <span className="text-white/25 text-xs font-light">/</span>
            <span className="text-[#98A4C2] text-xs font-medium uppercase tracking-wider">
              My Profile & Permissions
            </span>
          </div>

          <Link 
            href="/workflow" 
            className="glass-button px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-white border border-white/10 hover:bg-white/[0.04] transition duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10 space-y-8">
        
        {/* Profile Hero Card */}
        <div className="bg-gradient-to-r from-[#080D1D] via-[#0D152F] to-[#080D1D] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-md shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-violet-500/25 shrink-0 border border-violet-400/30">
              {emailInitial}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">{profile?.email}</h1>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                  {profile?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                <span>{profile?.organizationName || 'Default Workspace'}</span>
                {profile?.createdAt && (
                  <>
                    <span className="text-white/20">•</span>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5 text-right">
              <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Workspace Mode</span>
              <span className="text-xs font-semibold text-slate-200">
                {profile?.role === 'SINGLE' ? 'Personal Studio' : 'Team Collaboration'}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Section: Account Info & Password Reset */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Account Details Box */}
          <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-5">
            <div className="border-b border-white/[0.05] pb-3 flex items-center gap-2.5">
              <User className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Account Overview</h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/[0.04]">
                <span className="text-slate-400 font-medium">User Identifier</span>
                <span className="font-mono text-slate-200 select-all text-[11px]">{profile?.id}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/[0.04]">
                <span className="text-slate-400 font-medium">Email Address</span>
                <span className="font-semibold text-slate-100">{profile?.email}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/[0.04]">
                <span className="text-slate-400 font-medium">Organization ID</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[220px]" title={profile?.organizationId}>
                  {profile?.organizationId}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/[0.04]">
                <span className="text-slate-400 font-medium">Access Tier</span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/30 uppercase">
                  {profile?.role === 'ADMIN' ? 'Full Administrator' : profile?.role === 'SINGLE' ? 'Solo Developer' : 'Team Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Reset Password Card */}
          <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-5">
            <div className="border-b border-white/[0.05] pb-3 flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Change Password</h2>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Full Width Permissions Matrix */}
        <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
          <div className="border-b border-white/[0.05] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Permissions Matrix</h2>
              </div>
              <p className="text-[11px] text-[#98A4C2] mt-0.5">
                {profile?.role === 'ADMIN'
                  ? 'Administrator has unrestricted operational rights across all pipelines, execution queues, and team artifacts.'
                  : profile?.role === 'SINGLE'
                  ? 'Solo studio account has full control over all personal workflows and knowledge sources.'
                  : 'Role-Based Access Control (RBAC) capabilities configured by your organization administrator.'}
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-violet-950/40 text-violet-300 border border-violet-800/30 uppercase shrink-0">
              {profile?.role === 'ADMIN' || profile?.role === 'SINGLE' ? 'Full Access' : 'Custom Policy'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {permissionList.map(({ key, label, desc }) => {
              const isGranted = profile?.role === 'ADMIN' || profile?.role === 'SINGLE' || perms[key] === true;
              return (
                <div
                  key={key}
                  className={`p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                    isGranted
                      ? 'bg-violet-950/20 border-violet-500/30 shadow-sm'
                      : 'bg-black/20 border-white/[0.04] opacity-55'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isGranted ? 'text-violet-100' : 'text-slate-400'}`}>
                        {label}
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        isGranted 
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40' 
                          : 'bg-slate-900 text-slate-500 border border-white/5'
                      }`}>
                        {isGranted ? 'Granted' : 'Restricted'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{desc}</p>
                  </div>

                  <div className="shrink-0 mt-0.5">
                    {isGranted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoped Whitelisted Workflows Box for Members */}
          {profile?.role === 'MEMBER' && (() => {
            const rawScoped = perms.scopedWorkflows || perms.allowedWorkflowIds || [];
            const scopedList = Array.isArray(rawScoped) ? rawScoped.map((item: any) => {
              if (typeof item === 'string') {
                return {
                  workflowId: item,
                  workflowName: `Workflow ${item.slice(0, 8)}...`,
                  canView: true,
                  canExecute: false,
                  canEdit: false,
                  canRename: false,
                  canDelete: false,
                  canViewExecutionLogs: false,
                };
              }
              return {
                workflowId: item.workflowId,
                workflowName: item.workflowName || `Workflow ${item.workflowId?.slice(0, 8)}...`,
                canView: item.canView !== false,
                canExecute: item.canExecute === true,
                canEdit: item.canEdit === true,
                canRename: item.canRename === true,
                canDelete: item.canDelete === true,
                canViewExecutionLogs: item.canViewExecutionLogs === true,
              };
            }) : [];

            return (
              <div className="p-5 bg-black/40 rounded-2xl border border-violet-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-violet-300 font-bold text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-violet-400" />
                    <span>Scoped Team Workflow Permissions ({scopedList.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {scopedList.length === 0 ? 'No custom overrides' : `${scopedList.length} Active Override Rules`}
                  </span>
                </div>

                {scopedList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No individual team workflow overrides assigned. Your access is governed by the global team permissions above.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {scopedList.map((rule: any, idx: number) => {
                      return (
                        <div key={rule.workflowId || idx} className="p-3.5 bg-black/50 border border-white/[0.05] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-white block">{rule.workflowName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{rule.workflowId}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${rule.canView !== false ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40' : 'bg-slate-900 text-slate-600'}`}>
                              View: {rule.canView !== false ? 'YES' : 'NO'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${rule.canExecute ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-slate-900 text-slate-600'}`}>
                              Exec: {rule.canExecute ? 'YES' : 'NO'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${rule.canEdit ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' : 'bg-slate-900 text-slate-600'}`}>
                              Edit: {rule.canEdit ? 'YES' : 'NO'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${rule.canRename ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40' : 'bg-slate-900 text-slate-600'}`}>
                              Rename: {rule.canRename ? 'YES' : 'NO'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${rule.canDelete ? 'bg-red-950/60 text-red-300 border border-red-800/40' : 'bg-slate-900 text-slate-600'}`}>
                              Delete: {rule.canDelete ? 'YES' : 'NO'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${rule.canViewExecutionLogs ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40' : 'bg-slate-900 text-slate-600'}`}>
                              Logs: {rule.canViewExecutionLogs ? 'YES' : 'NO'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </main>
    </div>
  );
}
