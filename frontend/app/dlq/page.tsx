// frontend/app/dlq/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  AlertOctagon, 
  RefreshCw, 
  RotateCcw, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { API_URL } from '../../utils/config';
import { canAccessDLQ } from '../../utils/permissions';
import { useToast } from '../../context/ToastContext';
import UserProfileDropdown from '../../components/profile/UserProfileDropdown';

interface ExecutionLogItem {
  id: string;
  nodeId: string;
  status: string;
  outputData?: any;
  createdAt: string;
}

interface DeadLetterItem {
  executionId: string;
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  workflowStatus: string;
  triggeredBy: string;
  triggeredByUserId?: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  failedNodeId: string;
  failureReason: string;
  attemptsMade: number;
  maxAttempts: number;
  isUnrecoverable: boolean;
  logs: ExecutionLogItem[];
}

export default function DeadLetterQueuePage() {
  const router = useRouter();
  const { toast } = useToast();

  // Auth & RBAC State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Data & Pagination State
  const [items, setItems] = useState<DeadLetterItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [redisFailedCount, setRedisFailedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Interactivity
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'UNRECOVERABLE' | 'EXHAUSTED'>('ALL');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [clearingRedis, setClearingRedis] = useState(false);

  // 1. Authenticate and verify RBAC permissions
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    let parsedUser: any = null;
    if (userStr) {
      try {
        parsedUser = JSON.parse(userStr);
        setCurrentUser(parsedUser);
        setUserRole(parsedUser.role || null);
        const allowed = canAccessDLQ(parsedUser);
        setHasPermission(allowed);
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
    }

    // Refresh profile to verify fresh permissions from server
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(freshUser => {
        if (freshUser) {
          setCurrentUser(freshUser);
          setUserRole(freshUser.role);
          localStorage.setItem('user', JSON.stringify(freshUser));
          const allowed = canAccessDLQ(freshUser);
          setHasPermission(allowed);
        }
      })
      .catch(() => {});
  }, [router]);

  // 2. Fetch DLQ records from Backend
  const loadDLQ = useCallback(async (page: number = 1, search: string = '') => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const url = new URL(`${API_URL}/api/workflows/failed-jobs`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(pageSize));
      if (search.trim()) {
        url.searchParams.set('search', search.trim());
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setHasPermission(false);
        throw new Error('Access denied: You do not have permission to view the Dead Letter Queue.');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch Dead Letter Queue items.');
      }

      const data = await res.json();
      setItems(data.deadLetters || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
      setRedisFailedCount(data.redisFailedCount || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pageSize, toast]);

  useEffect(() => {
    if (hasPermission === true) {
      loadDLQ(currentPage, searchQuery);
    }
  }, [hasPermission, currentPage, pageSize, loadDLQ]);

  // Handle Search Input with debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadDLQ(1, searchQuery);
  };

  // Copy Execution ID to clipboard
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Execution ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Node Logs Accordion
  const toggleLogs = (executionId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [executionId]: !prev[executionId]
    }));
  };

  // Replay failed execution
  const handleReplay = async (item: DeadLetterItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setReplayingId(item.executionId);
    try {
      // Trigger execution replay from the failed node
      const res = await fetch(`${API_URL}/api/workflow/${item.workflowId}/replay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          executionId: item.executionId,
          targetNodeId: item.failedNodeId,
          resumeDownstream: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger replay.');

      toast.success(`🔁 Replay scheduled for workflow "${item.workflowName}".`);
      // Refresh list after brief moment
      setTimeout(() => loadDLQ(currentPage, searchQuery), 1500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReplayingId(null);
    }
  };

  // Purge dead letter cache in Redis
  const handleClearRedis = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm('Are you sure you want to purge failed jobs from Redis RAM cache? (Historical logs in Postgres will remain intact)')) {
      return;
    }

    setClearingRedis(true);
    try {
      const res = await fetch(`${API_URL}/api/workflows/failed-jobs/clear-redis`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to purge Redis cache.');

      toast.success(data.message || 'Redis dead letter cache purged.');
      loadDLQ(currentPage, searchQuery);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setClearingRedis(false);
    }
  };

  // Filter items by client-side criteria
  const filteredItems = items.filter(item => {
    if (filterType === 'UNRECOVERABLE') return item.isUnrecoverable;
    if (filterType === 'EXHAUSTED') return !item.isUnrecoverable && item.attemptsMade >= item.maxAttempts;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#04060E] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* 1. TOP NAVBAR */}
      <nav className="border-b border-white/[0.04] bg-[#050814]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold tracking-tight text-white text-base hover:text-slate-200 transition-colors duration-200">
              FlowAgent
            </Link>

            <div className="hidden sm:flex items-center gap-6">
              <Link 
                href="/workflow" 
                className="text-xs font-semibold tracking-wider uppercase text-[#98A4C2] hover:text-white transition duration-200"
              >
                Workflows
              </Link>
              <Link 
                href="/document" 
                className="text-xs font-semibold tracking-wider uppercase text-[#98A4C2] hover:text-white transition duration-200"
              >
                Knowledge Base
              </Link>
              {/* Active DLQ tab */}
              <Link 
                href="/dlq" 
                className="text-xs font-semibold tracking-wider uppercase text-[#F5F7FF] relative py-1 flex items-center gap-1.5"
              >
                <span>DLQ</span>
                {totalCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 text-[10px] rounded-full border border-red-500/30 font-mono">
                    {totalCount}
                  </span>
                )}
                <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-[#8B5CF6] rounded-full" />
              </Link>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#687493] cursor-not-allowed select-none">
                Runs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {userRole && userRole !== 'MEMBER' && (
              <Link 
                href="/setting" 
                className="text-xs font-semibold text-[#98A4C2] hover:text-white transition duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5"
              >
                {userRole === 'ADMIN' ? 'Settings' : 'Credentials'}
              </Link>
            )}
            <UserProfileDropdown />
          </div>
        </div>
      </nav>

      {/* 2. MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        
        {/* Permission Denied View */}
        {hasPermission === false && (
          <div className="max-w-2xl mx-auto my-16 p-8 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-4 backdrop-blur-xl shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Access Restricted to Dead Letter Queue</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your current account role is <span className="text-white font-semibold">MEMBER</span>. Organization members cannot inspect the Dead Letter Queue without explicit administrative clearance.
            </p>
            <div className="pt-2 text-[11px] text-slate-400">
              To request access, please contact an organization Administrator to grant you the <code className="text-violet-300 bg-white/5 px-2 py-0.5 rounded">View Dead Letter Queue</code> policy in Settings &gt; User Permissions.
            </div>
            <div className="pt-4">
              <Link
                href="/workflow"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold rounded-xl text-white transition cursor-pointer"
              >
                &larr; Return to Workflows
              </Link>
            </div>
          </div>
        )}

        {/* Authorized DLQ Interface */}
        {hasPermission === true && (
          <>
            {/* Header Ribbon */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.04]">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Dead Letter Queue
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {totalCount} Total Recorded
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                  Failed Workflow Runs
                </h1>
                <p className="text-xs text-[#98A4C2] mt-1 font-light max-w-2xl">
                  Inspect aborted executions, view fatal node stack traces, and recover jobs that failed due to permanent configuration faults or exhausted retry loops.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setRefreshing(true);
                    loadDLQ(currentPage, searchQuery);
                  }}
                  disabled={refreshing || loading}
                  className="px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-slate-200 rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Refresh failures"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-violet-400' : ''}`} />
                  <span>Refresh</span>
                </button>

                {userRole !== 'MEMBER' && (
                  <button
                    onClick={handleClearRedis}
                    disabled={clearingRedis}
                    className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-300 rounded-xl transition duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Purge failed items from Redis cache"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>{clearingRedis ? 'Purging...' : 'Purge Redis Cache'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#080D1D]/90 border border-white/[0.05] rounded-2xl backdrop-blur-md">
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Total Dead Letters (DB)</span>
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">{totalCount}</div>
                <div className="text-[10px] text-slate-500 mt-1">Permanent failure records stored in PostgreSQL</div>
              </div>

              <div className="p-4 bg-[#080D1D]/90 border border-white/[0.05] rounded-2xl backdrop-blur-md">
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Redis In-Memory Queue</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-300 mt-1.5">{redisFailedCount}</div>
                <div className="text-[10px] text-slate-500 mt-1">Recent failed jobs cached in BullMQ RAM (Auto-expiring)</div>
              </div>

              <div className="p-4 bg-[#080D1D]/90 border border-white/[0.05] rounded-2xl backdrop-blur-md">
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Pagination Status</span>
                  <SlidersHorizontal className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  Page {currentPage} <span className="text-xs text-slate-500 font-normal">of {totalPages}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Showing {items.length} records per page</div>
              </div>
            </div>

            {/* Search and Filters Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by workflow name or execution ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-xs text-white placeholder-slate-500 transition outline-none"
                />
              </form>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 bg-white/[0.02] p-1 rounded-xl border border-white/[0.05] self-start sm:self-auto">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterType === 'ALL'
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  onClick={() => setFilterType('UNRECOVERABLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterType === 'UNRECOVERABLE'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unrecoverable
                </button>
                <button
                  onClick={() => setFilterType('EXHAUSTED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterType === 'EXHAUSTED'
                      ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Exhausted (3/3)
                </button>
              </div>
            </div>

            {/* 3. LIST OF FAILED WORKFLOW RUNS */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-36 bg-white/[0.02] border border-white/[0.04] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 text-center space-y-3 bg-[#080D1D]/50 border border-white/[0.04] rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                <h3 className="text-base font-bold text-white">No Failed Workflows Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery 
                    ? `No dead letter jobs matched "${searchQuery}". Try clearing your search.`
                    : 'The Dead Letter Queue is currently empty. All workflow runs executed successfully!'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      loadDLQ(1, '');
                    }}
                    className="mt-2 text-xs text-violet-400 hover:text-violet-300 underline cursor-pointer"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const isExpanded = !!expandedLogs[item.executionId];
                  const formattedDate = new Date(item.startedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <div
                      key={item.executionId}
                      className="bg-[#080D1D]/90 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 backdrop-blur-md transition shadow-xl space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/workflow/${item.workflowId}`}
                                className="text-sm font-bold text-white hover:text-violet-300 transition flex items-center gap-1.5"
                              >
                                <span>{item.workflowName}</span>
                                <ExternalLink className="w-3 h-3 text-slate-500 hover:text-white" />
                              </Link>
                              
                              {item.isUnrecoverable ? (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  Unrecoverable Error (0ms Retry)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-red-500/10 text-red-300 border border-red-500/20">
                                  Exhausted ({item.attemptsMade}/{item.maxAttempts} Retries)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">ID: {item.executionId}</span>
                              <button
                                onClick={() => handleCopyId(item.executionId)}
                                className="text-slate-500 hover:text-white transition p-0.5 cursor-pointer"
                                title="Copy execution ID"
                              >
                                {copiedId === item.executionId ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReplay(item)}
                            disabled={replayingId === item.executionId}
                            className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Replay this execution starting from the failed node"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${replayingId === item.executionId ? 'animate-spin text-violet-400' : ''}`} />
                            <span>{replayingId === item.executionId ? 'Replaying...' : 'Replay Run'}</span>
                          </button>

                          <Link
                            href={`/workflow/${item.workflowId}`}
                            className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Open Canvas</span>
                          </Link>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-black/20 p-3 rounded-xl border border-white/[0.03]">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Failed Step (Node ID)</span>
                          <span className="font-mono text-slate-200 font-medium text-[11px] truncate block" title={item.failedNodeId}>
                            {item.failedNodeId}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Run At</span>
                          <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formattedDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Duration</span>
                          <span className="text-slate-300 font-medium text-[11px]">
                            {item.durationMs > 1000 ? `${(item.durationMs / 1000).toFixed(2)}s` : `${item.durationMs}ms`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Triggered By</span>
                          <span className="text-slate-300 font-medium text-[11px] truncate block flex items-center gap-1" title={item.triggeredBy}>
                            <User className="w-3 h-3 text-slate-500" />
                            {item.triggeredBy}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Failure Reason Callout */}
                      <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl space-y-1">
                        <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Failure Reason</span>
                        </div>
                        <p className="text-xs font-mono text-red-200 break-words leading-relaxed whitespace-pre-wrap">
                          {item.failureReason}
                        </p>
                      </div>

                      {/* Step Execution Logs Accordion */}
                      {item.logs && item.logs.length > 0 && (
                        <div className="border-t border-white/[0.04] pt-3">
                          <button
                            onClick={() => toggleLogs(item.executionId)}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'} Node Execution Logs ({item.logs.length} recorded steps)</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                              {item.logs.map((log) => {
                                const isFail = log.status === 'FAILED';
                                return (
                                  <div
                                    key={log.id}
                                    className={`p-2.5 rounded-lg border text-xs font-mono transition ${
                                      isFail 
                                        ? 'bg-red-950/30 border-red-500/30 text-red-200' 
                                        : 'bg-black/30 border-white/[0.04] text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                      <span className="font-bold flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isFail ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                        Step: {log.nodeId}
                                      </span>
                                      <span className="text-[10px] opacity-60">
                                        {new Date(log.createdAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    {log.outputData && (
                                      <pre className="text-[10px] text-slate-400 overflow-x-auto p-1.5 bg-black/40 rounded border border-white/[0.02]">
                                        {JSON.stringify(log.outputData, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. PAGINATION FOOTER */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.04]">
                <div className="text-xs text-slate-400">
                  Showing <span className="text-white font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="text-white font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                  <span className="text-white font-medium">{totalCount}</span> failed workflows
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((pageNum, index, arr) => {
                        const showEllipsis = index > 0 && pageNum - arr[index - 1] > 1;
                        return (
                          <React.Fragment key={pageNum}>
                            {showEllipsis && <span className="px-1 text-slate-600 text-xs">...</span>}
                            <button
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                                currentPage === pageNum
                                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white'
                              }`}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
