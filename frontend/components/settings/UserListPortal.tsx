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
  createdByUserId?: string;
}

export interface WorkflowPermissionRule {
  workflowId: string;
  canView: boolean;
  canEdit: boolean;
  canRename: boolean;
  canDelete: boolean;
  canExecute: boolean;
  canViewExecutionLogs: boolean;
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
  const [permCanViewWorkflows, setPermCanViewWorkflows] = useState(false);
  const [permCanEditWorkflows, setPermCanEditWorkflows] = useState(false);
  const [permCanRenameWorkflows, setPermCanRenameWorkflows] = useState(false);
  const [permCanDeleteWorkflows, setPermCanDeleteWorkflows] = useState(false);
  const [permCanExecuteWorkflows, setPermCanExecuteWorkflows] = useState(false);
  const [permCanViewExecutions, setPermCanViewExecutions] = useState(false);
  const [permCanViewFailed, setPermCanViewFailed] = useState(false);
  const [permCanCreatePersonalKB, setPermCanCreatePersonalKB] = useState(false);
  const [permCanChangeOrgKB, setPermCanChangeOrgKB] = useState(false);
  const [permAllowedRules, setPermAllowedRules] = useState<WorkflowPermissionRule[]>([]);
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
    setPermCanViewWorkflows(p.canViewTeamWorkflows === true);
    setPermCanEditWorkflows(p.canEditTeamWorkflows === true);
    setPermCanRenameWorkflows(p.canRenameTeamWorkflows === true);
    setPermCanDeleteWorkflows(p.canDeleteTeamWorkflows === true);
    setPermCanExecuteWorkflows(p.canExecuteTeamWorkflows === true);
    setPermCanViewExecutions(p.canViewTeamExecutions === true);
    setPermCanViewFailed(p.canViewTeamFailedExecutions === true);
    setPermCanCreatePersonalKB(p.canCreatePersonalKnowledgeBase === true);
    setPermCanChangeOrgKB(p.canChangeOrgKnowledgeBase === true);

    // Normalize allowedWorkflowIds into WorkflowPermissionRule objects
    const rawAllowed = Array.isArray(p.allowedWorkflowIds) ? p.allowedWorkflowIds : [];
    const normalized: WorkflowPermissionRule[] = rawAllowed.map((item: any) => {
      if (typeof item === 'string') {
        return {
          workflowId: item,
          canView: true,
          canEdit: false,
          canRename: false,
          canDelete: false,
          canExecute: true,
          canViewExecutionLogs: true,
        };
      }
      return {
        workflowId: item.workflowId,
        canView: item.canView !== false,
        canEdit: item.canEdit === true,
        canRename: item.canRename === true,
        canDelete: item.canDelete === true,
        canExecute: item.canExecute !== false,
        canViewExecutionLogs: item.canViewExecutionLogs !== false,
      };
    });
    setPermAllowedRules(normalized);
  };

  const toggleWorkflowWhitelist = (wfId: string) => {
    setPermAllowedRules((prev) => {
      const exists = prev.find((r) => r.workflowId === wfId);
      if (exists) {
        return prev.filter((r) => r.workflowId !== wfId);
      }
      return [
        ...prev,
        {
          workflowId: wfId,
          canView: true,
          canEdit: false,
          canRename: false,
          canDelete: false,
          canExecute: true,
          canViewExecutionLogs: true,
        },
      ];
    });
  };

  const updateWorkflowRule = (wfId: string, field: keyof WorkflowPermissionRule, value: boolean) => {
    setPermAllowedRules((prev) =>
      prev.map((r) => (r.workflowId === wfId ? { ...r, [field]: value } : r))
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
      canEditTeamWorkflows: permCanEditWorkflows,
      canRenameTeamWorkflows: permCanRenameWorkflows,
      canDeleteTeamWorkflows: permCanDeleteWorkflows,
      canExecuteTeamWorkflows: permCanExecuteWorkflows,
      canViewTeamExecutions: permCanViewExecutions,
      canViewTeamFailedExecutions: permCanViewFailed,
      canCreatePersonalKnowledgeBase: permCanCreatePersonalKB,
      canChangeOrgKnowledgeBase: permCanChangeOrgKB,
      allowedWorkflowIds: permAllowedRules,
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
              
              {/* Global Permissions Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanCreate}
                    onChange={(e) => setPermCanCreate(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Can Create Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">Build and save personal workflows.</span>
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
                    <span className="block text-xs font-bold text-white">View All Team Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">See workflows built by all teammates.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanEditWorkflows}
                    onChange={(e) => setPermCanEditWorkflows(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Edit Team Blueprints</span>
                    <span className="text-[10px] text-slate-400 font-light">Modify canvas schemas of other members.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanRenameWorkflows}
                    onChange={(e) => setPermCanRenameWorkflows(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Rename Team Workflows</span>
                    <span className="text-[10px] text-slate-400 font-light">Change names of other members' workflows.</span>
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
                    <span className="text-[10px] text-slate-400 font-light">Trigger runs on team workflows globally.</span>
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
                    <span className="text-[10px] text-slate-400 font-light">Delete organization workflows.</span>
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
                    <span className="block text-xs font-bold text-white">View Team Runs & Logs</span>
                    <span className="text-[10px] text-slate-400 font-light">Monitor real-time run logs of other teammates.</span>
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

                {/* Knowledge Base RBAC Flags */}
                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanCreatePersonalKB}
                    onChange={(e) => setPermCanCreatePersonalKB(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Create Personal Knowledge Bases</span>
                    <span className="text-[10px] text-slate-400 font-light">Allow creating isolated personal knowledge bases.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-black/25 rounded-xl border border-white/[0.03] hover:border-white/10 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanChangeOrgKB}
                    onChange={(e) => setPermCanChangeOrgKB(e.target.checked)}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Modify Org Knowledge Base</span>
                    <span className="text-[10px] text-slate-400 font-light">Allow uploading & deleting docs in Org KBs.</span>
                  </div>
                </label>
              </div>

              {/* Scoped Whitelist Workflow Matrix */}
              <div className="space-y-3 border-t border-white/[0.06] pt-4">
                <div>
                  <span className="block text-xs font-bold text-white">Scoped Team Workflow Permissions</span>
                  <p className="text-[10px] text-slate-400 font-light">
                    Grant granular View, Edit, Rename, Delete, Execute, and Log access on specific team workflows. (User's own workflows are already fully accessible).
                  </p>
                </div>

                {(() => {
                  const teamWorkflows = workflows.filter((wf) => wf.createdByUserId !== editingUser.id);
                  if (teamWorkflows.length === 0) {
                    return (
                      <div className="text-slate-500 text-xs italic bg-black/20 p-3.5 rounded-xl border border-white/[0.03]">
                        No other team workflows available in this organization.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {teamWorkflows.map((wf) => {
                        const rule = permAllowedRules.find((r) => r.workflowId === wf.id);
                        const isWhitelisted = !!rule;

                        return (
                          <div
                            key={wf.id}
                            className={`p-3 rounded-xl border transition ${
                              isWhitelisted
                                ? 'bg-violet-950/15 border-violet-500/25'
                                : 'bg-black/20 border-white/[0.03] hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isWhitelisted}
                                  onChange={() => toggleWorkflowWhitelist(wf.id)}
                                  className="accent-violet-500 w-4 h-4 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{wf.name}</span>
                              </label>

                              {isWhitelisted && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                                  Configured
                                </span>
                              )}
                            </div>

                            {/* Granular Action Pills */}
                            {isWhitelisted && rule && (
                              <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-white/[0.04]">
                                {[
                                  { key: 'canView', label: 'View' },
                                  { key: 'canExecute', label: 'Execute' },
                                  { key: 'canEdit', label: 'Edit' },
                                  { key: 'canRename', label: 'Rename' },
                                  { key: 'canDelete', label: 'Delete' },
                                  { key: 'canViewExecutionLogs', label: 'Logs' },
                                ].map(({ key, label }) => {
                                  const active = (rule as any)[key] === true;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => updateWorkflowRule(wf.id, key as keyof WorkflowPermissionRule, !active)}
                                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition cursor-pointer border ${
                                        active
                                          ? 'bg-violet-600/30 text-violet-200 border-violet-500/40 shadow-sm'
                                          : 'bg-black/30 text-slate-500 border-white/5 hover:text-slate-300'
                                      }`}
                                    >
                                      {active ? '✓ ' : '+ '}
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
