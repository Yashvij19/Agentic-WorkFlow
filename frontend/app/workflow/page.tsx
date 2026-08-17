// frontend/app/workflow/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../utils/config';

export default function WorkflowsDashboard() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [createError, setCreateError] = useState('');

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');

  // Rename Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED'>('ALL');
  
  // Card Actions Menu State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUserRole(parsed.role);
      } catch (err) {
        console.error(err);
      }
    }

    fetch(`${API_URL}/api/workflows`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load workflows.');
        return res.json();
      })
      .then((data) => {
        // Enforce fallback structure
        const mapped = data.map((wf: any) => ({
          ...wf,
          description: wf.description || 'Automated multi-agent execution pipeline.',
          status: wf.status || 'ACTIVE',
        }));
        setWorkflows(mapped);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  // Click outside menu close handler
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const token = localStorage.getItem('token');

    const defaultNodes = [
      { id: 'node_1', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Webhook Trigger ⚡', output: 'explain the docker hub' } },
      { id: 'node_2', type: 'agent', position: { x: 250, y: 200 }, data: { prompt: 'Summarize the input: {{node_1.output}}' } }
    ];
    const defaultEdges = [
      { id: 'e1-2', source: 'node_1', target: 'node_2', animated: true }
    ];

    try {
      const res = await fetch(`${API_URL}/api/workflow`, {
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
      setCreateError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Backend integrated Delete
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/workflow/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete workflow.');

      setWorkflows((prev) => prev.filter((wf) => wf.id !== deletingId));
      setDeletingId(null);
      setDeletingName('');
      setShowDeleteModal(false);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleDuplicate = (wf: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated = {
      ...wf,
      id: `dup-${Math.random().toString(36).substr(2, 9)}`,
      name: `${wf.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkflows((prev) => [duplicated, ...prev]);
    setOpenMenuId(null);
  };

  const handleRenameTrigger = (wf: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameId(wf.id);
    setRenameName(wf.name);
    setShowRenameModal(true);
    setOpenMenuId(null);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameId || !renameName.trim()) return;
    setWorkflows((prev) =>
      prev.map((wf) => (wf.id === renameId ? { ...wf, name: renameName } : wf))
    );
    setRenameId(null);
    setRenameName('');
    setShowRenameModal(false);
  };

  // Render miniature workflow previews
  // const renderPreview = (nodesJson: any) => {
  //   const nodes = Array.isArray(nodesJson) ? nodesJson : [];
  //   if (nodes.length === 0) {
  //     // Default placeholder preview
  //     return (
  //       <div className="h-16 flex items-center justify-center bg-black/40 rounded-lg border border-white/5 relative overflow-hidden">
  //         <div className="flex items-center gap-4 relative z-10">
  //           <div className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-sm" />
  //           <div className="w-6 h-[1px] bg-slate-700" />
  //           <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-sm shadow-[#8B5CF6]/50 animate-pulse" />
  //           <div className="w-6 h-[1px] bg-slate-700" />
  //           <div className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-sm" />
  //         </div>
  //       </div>
  //     );
  //   }

  //   // Render tiny dots based on node types
  //   return (
  //     <div className="h-16 flex items-center justify-center bg-black/30 rounded-lg border border-white/[0.04] relative overflow-hidden px-4">
  //       <div className="flex items-center justify-center gap-3 relative z-10">
  //         {nodes.map((node: any, idx: number) => {
  //           const isTrigger = node.type === 'input' || node.id === 'node_1';
  //           const isAgent = node.type === 'agent' || node.id === 'node_2';
            
  //           return (
  //             <React.Fragment key={node.id || idx}>
  //               {idx > 0 && <div className="w-4 h-[1px] bg-slate-800" />}
  //               <div 
  //                 className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
  //                   isTrigger ? 'bg-slate-400' : isAgent ? 'bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-slate-600'
  //                 }`}
  //                 title={node.data?.label || node.id}
  //               />
  //             </React.Fragment>
  //           );
  //         })}
  //       </div>
  //     </div>
  //   );
  // };

  // Filter workflows list
  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch = wf.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'ACTIVE' && wf.status === 'ACTIVE') ||
      (activeTab === 'DRAFT' && wf.status === 'DRAFT') ||
      (activeTab === 'PAUSED' && wf.status === 'PAUSED');
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030617] text-[#98A4C2] flex items-center justify-center font-semibold text-xs tracking-wider uppercase">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
          Synchronizing Workspace Environment...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030617] text-[#F5F7FF] font-sans selection:bg-[#8B5CF6]/30 selection:text-white pb-20">
      
      {/* 1. COMPACT APPLICATION NAVIGATION */}
      <nav className="border-b border-white/[0.05] bg-[#030617]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-10">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <Link href="/" className="font-bold tracking-tight text-white text-base hover:text-slate-200 transition-colors duration-200">
                FlowAgent
              </Link>
            </div>
            
            {/* Nav anchors */}
            <div className="hidden sm:flex items-center gap-6">
              <Link 
                href="/workflow" 
                className="text-xs font-semibold tracking-wider uppercase text-[#F5F7FF] relative py-1"
              >
                Workflows
                <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-[#8B5CF6] rounded-full" />
              </Link>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#687493] cursor-not-allowed select-none">
                Agents
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#687493] cursor-not-allowed select-none">
                Runs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {userRole && userRole !== 'MEMBER' && (
              <Link 
                href="/setting" 
                className="text-xs font-semibold text-[#98A4C2] hover:text-white transition duration-200 flex items-center gap-1.5"
              >
                {userRole === 'ADMIN' ? 'Organization Settings' : 'Credentials Setup'}
              </Link>
            )}
            <button 
              onClick={handleLogout} 
              className="text-xs font-bold tracking-wider uppercase text-[#EF4444] hover:text-red-300 transition duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-12">
        
        {/* 2. PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/[0.04]">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Workflows
            </h1>
            <p className="text-[#98A4C2] text-xs mt-1.5 font-light">
              Build, manage, and monitor your autonomous agent workflows.
            </p>
          </div>
          <button
            onClick={() => {
              setNewWorkflowName('');
              setCreateError('');
              setShowCreateModal(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-xs font-bold tracking-wider uppercase rounded-xl transition duration-300 shadow-md shadow-[#8B5CF6]/15 hover:shadow-[#8B5CF6]/25 cursor-pointer text-white"
          >
            + New Workflow
          </button>
        </div>

        {/* 3. WORKFLOW TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Tab filters */}
          <div className="flex items-center gap-1.5 border-b border-white/[0.04] md:border-b-0 pb-2 md:pb-0">
            {(['ALL', 'ACTIVE', 'DRAFT', 'PAUSED'] as const).map((tab) => {
              const label = tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'Active' : tab === 'DRAFT' ? 'Drafts' : 'Paused';
              const isActive = activeTab === tab;
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-white/[0.04] text-white border border-white/10' 
                      : 'text-[#687493] hover:text-[#98A4C2]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search and Sort controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="w-48 sm:w-64 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#8B5CF6]/50 focus:ring-1 focus:ring-[#8B5CF6]/25 transition"
              />
            </div>
            <select className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-semibold text-[#98A4C2] uppercase tracking-wider focus:outline-none cursor-pointer">
              <option>Recently Updated</option>
              <option>Name A-Z</option>
            </select>
          </div>
        </div>

        {/* 4. WORKFLOW GRID & CARDS */}
        {filteredWorkflows.length === 0 ? (
          /* Empty state */
          <div className="border border-dashed border-white/10 rounded-2xl p-20 text-center bg-[#050918]">
            <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-xl">🕸️</span>
            </div>
            <h3 className="text-lg font-bold text-[#F5F7FF]">Create your first workflow</h3>
            <p className="text-[#98A4C2] text-xs max-w-sm mx-auto mt-2 leading-relaxed font-light">
              Connect agents, triggers, and action nodes together into a production automation graph.
            </p>
            <button
              onClick={() => {
                setNewWorkflowName('');
                setCreateError('');
                setShowCreateModal(true);
              }}
              className="mt-6 px-4 py-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-xs font-bold tracking-wider uppercase rounded-xl transition duration-200 cursor-pointer"
            >
              + Create Workflow
            </button>
          </div>
        ) : (
          /* Cards grid */
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredWorkflows.map((wf) => {
              const nodes = Array.isArray(wf.nodesJson) ? wf.nodesJson : [];
              const agentsCount = nodes.filter((n: any) => n.type === 'agent').length;
              const totalNodes = nodes.length;
              const isMenuOpen = openMenuId === wf.id;

              return (
                <div
                  key={wf.id}
                  className="bg-[#080D1D] border border-white/[0.07] p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:border-white/15 hover:-translate-y-[2px] shadow-lg hover:shadow-xl group relative"
                >
                  <div>
                    {/* Top Row: status and three-dot trigger */}
                    <div className="flex justify-between items-center mb-5 relative">
                      <div className="flex items-center gap-1.5 text-xs text-[#98A4C2]">
                        <span 
                          className={`h-1.5 w-1.5 rounded-full ${
                            wf.status === 'ACTIVE' 
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' 
                              : wf.status === 'PAUSED' 
                              ? 'bg-amber-500' 
                              : 'bg-slate-500'
                          }`} 
                        />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">
                          {wf.status}
                        </span>
                      </div>
                      
                      {/* Menu trigger button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : wf.id);
                        }}
                        className="p-1 hover:bg-white/[0.04] rounded-lg text-[#687493] hover:text-[#98A4C2] transition cursor-pointer"
                      >
                        ⋮
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-7 w-40 bg-[#080D1D] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                          <Link 
                            href={`/workflow/${wf.id}`}
                            className="block w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition"
                          >
                            Open Workflow
                          </Link>
                          <button
                            onClick={(e) => handleRenameTrigger(wf, e)}
                            className="block w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition cursor-pointer"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(wf, e)}
                            className="block w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition cursor-pointer"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(wf.id);
                              setDeletingName(wf.name);
                              setShowDeleteModal(true);
                              setOpenMenuId(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Workflow Title & description */}
                    <h3 className="text-lg font-bold text-white mb-1.5">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-[#98A4C2] font-light leading-relaxed mb-6">
                      {wf.description}
                    </p>

                    {/* Node Preview Graph */}
                    {/* <div className="mb-6 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                      {renderPreview(wf.nodesJson)}
                    </div> */}
                  </div>

                  {/* Footer stats and CTA link */}
                  <div className="pt-4 border-t border-white/[0.04] flex flex-col gap-4">
                    <div className="flex items-center justify-between text-[10px] text-[#687493] font-mono">
                      <span>{agentsCount} agent{agentsCount !== 1 && 's'} · {totalNodes} node{totalNodes !== 1 && 's'}</span>
                      <span>{new Date(wf.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/workflow/${wf.id}`}
                        className="flex-1 text-center py-2 bg-slate-900 border border-white/5 group-hover:border-white/10 hover:bg-slate-800 text-xs font-semibold rounded-xl transition duration-200 text-white"
                      >
                        Open Workflow
                      </Link>
                      
                      {/* Subtly positioned Red Delete Icon on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(wf.id);
                          setDeletingName(wf.name);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 bg-white/[0.01] hover:bg-[#EF4444]/10 border border-white/5 hover:border-[#EF4444]/20 rounded-xl text-[#687493] hover:text-[#EF4444] transition-all duration-200 cursor-pointer"
                        title="Delete Workflow"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. CREATE BLUEPRINT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#080D1D] border border-white/[0.08] rounded-2xl p-6 relative shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">New Agentic Workflow</h2>
            <p className="text-xs text-[#98A4C2] font-light mb-4">Set a name to initialize your node graph canvas.</p>
            
            {createError && (
              <div className="text-[#EF4444] text-xs bg-[#EF4444]/10 border border-[#EF4444]/20 px-3.5 py-2.5 rounded-xl mb-4">
                ⚠️ {createError}
              </div>
            )}
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-[#8B5CF6]/50 focus:outline-none transition text-sm text-white"
                  placeholder="Data Aggregator Swarm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-transparent border border-white/10 hover:bg-white/[0.02] text-xs font-bold tracking-wider uppercase rounded-xl text-[#98A4C2] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold tracking-wider uppercase rounded-xl transition text-white"
                >
                  Create Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#080D1D] border border-white/[0.08] rounded-2xl p-6 relative shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Delete workflow?</h2>
            <p className="text-xs text-[#98A4C2] font-light leading-relaxed mb-6">
              &ldquo;{deletingName}&rdquo; will be permanently deleted from this workspace and can not be recovered.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingId(null);
                  setDeletingName('');
                }}
                className="px-4 py-2.5 bg-transparent border border-white/10 hover:bg-white/[0.02] text-xs font-bold tracking-wider uppercase rounded-xl text-[#98A4C2] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-[#EF4444]/15 hover:bg-[#EF4444] border border-[#EF4444]/35 hover:border-transparent text-xs font-bold tracking-wider uppercase rounded-xl text-[#EF4444] hover:text-white transition duration-200 cursor-pointer"
              >
                Delete Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. RENAME MODAL */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#080D1D] border border-white/[0.08] rounded-2xl p-6 relative shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Rename Workflow</h2>
            <p className="text-xs text-[#98A4C2] font-light mb-4">Set a new name for this agent graph blueprint.</p>
            
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#98A4C2] uppercase tracking-widest mb-2">
                  New Name
                </label>
                <input
                  type="text"
                  required
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-[#8B5CF6]/50 focus:outline-none transition text-sm text-white"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameId(null);
                    setRenameName('');
                  }}
                  className="px-4 py-2.5 bg-transparent border border-white/10 hover:bg-white/[0.02] text-xs font-bold tracking-wider uppercase rounded-xl text-[#98A4C2] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold tracking-wider uppercase rounded-xl transition text-white"
                >
                  Apply Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
