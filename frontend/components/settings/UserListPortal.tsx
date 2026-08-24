// frontend/components/settings/UserListPortal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/config';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'SINGLE';
  permissions: any;
  createdAt: string;
}

interface Workflow {
  id: string;
  name: string;
}

interface UserListPortalProps {
  onBack: () => void;
}

export default function UserListPortal({ onBack }: UserListPortalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Permissions Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permCanCreate, setPermCanCreate] = useState(true);
  const [permCanViewWorkflows, setPermCanViewWorkflows] = useState(true);
  const [permCanDeleteWorkflows, setPermCanDeleteWorkflows] = useState(false);
  const [permCanExecuteWorkflows, setPermCanExecuteWorkflows] = useState(true);
  const [permCanViewExecutions, setPermCanViewExecutions] = useState(false);
  const [permCanViewFailed, setPermCanViewFailed] = useState(false);
  const [permAllowedIds, setPermAllowedIds] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const usersRes = await fetch(`${API_URL}/api/org/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) setUsers(usersData || []);

      const wfRes = await fetch(`${API_URL}/api/workflows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const wfData = await wfRes.json();
      if (wfRes.ok) setWorkflows(wfData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleToggle = async (userId: string, currentRole: 'ADMIN' | 'MEMBER' | 'SINGLE') => {
    if (currentRole === 'SINGLE') return;
    setError('');
    setSuccess('');
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/org/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.');

      setSuccess(`User role updated to ${newRole} successfully.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openPermissionsModal = (user: User) => {
    const p = typeof user.permissions === 'string' 
      ? JSON.parse(user.permissions) 
      : (user.permissions || {});

    setEditingUser(user);
    setPermCanCreate(p.canCreateWorkflow !== false);
    setPermCanViewWorkflows(p.canViewTeamWorkflows !== false);
    setPermCanDeleteWorkflows(p.canDeleteTeamWorkflows === true);
    setPermCanExecuteWorkflows(p.canExecuteTeamWorkflows !== false);
    setPermCanViewExecutions(p.canViewTeamExecutions === true);
    setPermCanViewFailed(p.canViewTeamFailedExecutions === true);
    setPermAllowedIds(p.allowedWorkflowIds || []);
  };

  const toggleWorkflowId = (wfId: string) => {
    setPermAllowedIds((prev) => 
      prev.includes(wfId) ? prev.filter(id => id !== wfId) : [...prev, wfId]
    );
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');
    setSavingPermissions(true);
    const token = localStorage.getItem('token');

    const updatedPerms = {
      canCreateWorkflow: permCanCreate,
      canViewTeamWorkflows: permCanViewWorkflows,
      canDeleteTeamWorkflows: permCanDeleteWorkflows,
      canExecuteTeamWorkflows: permCanExecuteWorkflows,
      canViewTeamExecutions: permCanViewExecutions,
      canViewTeamFailedExecutions: permCanViewFailed,
      allowedWorkflowIds: permAllowedIds
    };

    try {
      const res = await fetch(`${API_URL}/api/org/users/${editingUser.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: updatedPerms })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update permissions.');

      setSuccess(`Permissions updated successfully for ${editingUser.email}.`);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPermissions(false);
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
            <h2 className="text-xl font-bold text-white">User Permissions</h2>
            <p className="text-slate-400 text-xs font-light mt-0.5">Control dynamic role promotion and custom permission policies.</p>
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
          Mapping team identities...
        </div>
      ) : (
        <div className="bg-[#080D1D] border border-white/[0.07] p-6 md:p-8 rounded-2xl shadow-xl relative group hover:border-white/15 transition-[border-color] duration-300">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          
          <h3 className="text-sm font-bold text-white mb-1 pl-1">Teammates Directories</h3>
          <p className="text-[#98A4C2] text-xs font-light mb-6 pl-1">Configure role levels or customize security flags for members.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.04] text-[#687493] font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">User Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.01] transition-colors duration-150">
                    <td className="py-3.5 pl-2 font-medium text-slate-200">{u.email}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                        u.role === 'ADMIN' 
                          ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20' 
                          : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 space-x-2">
                      {u.role !== 'SINGLE' && (
                        <>
                          <button
                            onClick={() => handleRoleToggle(u.id, u.role)}
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-[#98A4C2] hover:text-white border border-white/5 transition cursor-pointer"
                          >
                            Toggle Role
                          </button>
                          {u.role === 'MEMBER' && (
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/10 transition cursor-pointer font-bold"
                            >
                              Permissions
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Configuration Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#080D1D] border border-white/[0.08] p-6 md:p-8 rounded-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1">Customize Member Permissions</h3>
            <p className="text-xs text-[#98A4C2] mb-6">User email: <span className="text-white font-mono">{editingUser.email}</span></p>

            <form onSubmit={handleSavePermissions} className="space-y-6">
              
              {/* Checkbox Grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanCreate}
                    onChange={(e) => setPermCanCreate(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Can Create Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">Allow building and saving new canvases.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanViewWorkflows}
                    onChange={(e) => setPermCanViewWorkflows(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">View Team Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">See workflows built by other teammates.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanExecuteWorkflows}
                    onChange={(e) => setPermCanExecuteWorkflows(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Execute Team Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">Trigger runs on team workflows.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanDeleteWorkflows}
                    onChange={(e) => setPermCanDeleteWorkflows(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Delete Team Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">Permit deleting organization workflows.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanViewExecutions}
                    onChange={(e) => setPermCanViewExecutions(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">View Team Runs</span>
                    <span className="text-[10px] text-slate-400 font-light">Monitor real-time run logs and status of others.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanViewFailed}
                    onChange={(e) => setPermCanViewFailed(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">View Dead Letter Queue</span>
                    <span className="text-[10px] text-slate-400 font-light">Inspect all organization failures in DLQ.</span>
                  </div>
                </label>
              </div>

              {/* Workflow Access Restriction */}
              <div className="space-y-2 border-t border-white/[0.04] pt-4">
                <span className="block text-xs font-bold text-white pl-1">Restrict Access to Whitelisted Workflows</span>
                <p className="text-[10px] text-slate-400 font-light pl-1">If no items checked, member retains global access inside organization.</p>

                {workflows.length === 0 ? (
                  <div className="text-slate-500 text-xs italic pl-1 py-2">No workflows created in this organization yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-black/20 p-4 rounded-xl border border-white/[0.03] max-h-36 overflow-y-auto">
                    {workflows.map((wf) => (
                      <label key={wf.id} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-white/[0.02] rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={permAllowedIds.includes(wf.id)}
                          onChange={() => toggleWorkflowId(wf.id)}
                          className="accent-violet-500 cursor-pointer"
                        />
                        <span className="text-slate-300 font-medium truncate">{wf.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPermissions}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition border border-white/10 hover:border-white/20 cursor-pointer disabled:opacity-50"
                >
                  {savingPermissions ? 'Saving...' : 'Save Policies'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
