// frontend/app/document/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Zap, Network, GitFork, ArrowRight, Layers, Workflow, Search, CheckCircle2, AlertCircle, Lock, ShieldAlert, Loader2, User, Building2, ChevronDown } from 'lucide-react';
import { API_URL } from '../../utils/config';
import { Loader } from '../../components/Loader';
import Swal from 'sweetalert2';
import UserProfileDropdown from '../../components/profile/UserProfileDropdown';
import { useToast } from '@/context/ToastContext';

interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  source: string;
  knowledgeSourceId?: string;
  createdAt: string;
  _count: {
    chunks: number;
  };
}

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  scope: 'ORGANIZATION' | 'PERSONAL';
  createdByUserId?: string;
  _count?: {
    documents: number;
  };
  createdAt: string;
}

interface TestQueryResult {
  answer: string;
  retrievedCount: number;
  fusedCount?: number;
  rerankedCount?: number;
  hasGraphContext?: boolean;
  latencyMs: number;
  generationEnabled?: boolean;
  context: {
    contextText: string;
    citations: Array<{
      index: number;
      documentTitle: string;
      score: number;
      snippet: string;
      initialRank?: number;
      isParentExpanded?: boolean;
      isNeighborStitched?: boolean;
    }>;
  };
}

/**
 * Custom Knowledge Base selector displaying dedicated SVG icons (Person vs Organization)
 * instead of raw text brackets like [Personal] or [ORGANIZATION].
 */
function KnowledgeBaseDropdown({
  value,
  onChange,
  knowledgeBases,
  disabled = false,
  placeholder = '-- Select a Knowledge Base --',
  allowAll = false,
  className = '',
}: {
  value: string;
  onChange: (id: string) => void;
  knowledgeBases: KnowledgeBase[];
  disabled?: boolean;
  placeholder?: string;
  allowAll?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedKb = knowledgeBases.find((kb) => kb.id === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled || (knowledgeBases.length === 0 && !allowAll)}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 flex items-center justify-between gap-2 focus:outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-left"
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {value === '' && allowAll ? (
            <>
              <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate text-slate-300 font-medium">All Accessible Knowledge Bases</span>
            </>
          ) : selectedKb ? (
            <>
              {selectedKb.scope === 'PERSONAL' ? (
                <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <span className="truncate text-slate-200 font-medium">{selectedKb.name}</span>
            </>
          ) : (
            <span className="text-slate-400 truncate">
              {knowledgeBases.length === 0 ? '-- No Knowledge Bases Created --' : placeholder}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#080D1D] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1 divide-y divide-white/[0.04] backdrop-blur-md">
          {allowAll && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-[11px] flex items-center gap-2 transition cursor-pointer ${
                !value ? 'bg-purple-600/20 text-purple-200 font-semibold' : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">All Accessible Knowledge Bases</span>
            </button>
          )}
          {knowledgeBases.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-slate-500 italic">No Knowledge Bases Created</div>
          ) : (
            knowledgeBases.map((kb) => (
              <button
                key={kb.id}
                type="button"
                onClick={() => {
                  onChange(kb.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-[11px] flex items-center gap-2 transition cursor-pointer ${
                  value === kb.id ? 'bg-purple-600/20 text-purple-200 font-semibold' : 'text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                {kb.scope === 'PERSONAL' ? (
                  <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}
                <span className="truncate">{kb.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentKnowledgePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [activeKbScopeTab, setActiveKbScopeTab] = useState<'ALL' | 'ORGANIZATION' | 'PERSONAL'>('ALL');
  const [selectedKbFilter, setSelectedKbFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Search filter states
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  
  // Create Knowledge Base Modal State
  const [isCreateKbModalOpen, setIsCreateKbModalOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDescription, setNewKbDescription] = useState('');
  const [newKbScope, setNewKbScope] = useState<'ORGANIZATION' | 'PERSONAL'>('ORGANIZATION');
  const [isCreatingKb, setIsCreatingKb] = useState(false);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetUploadKbId, setTargetUploadKbId] = useState<string>('');
  const [uploadChunkStrategy, setUploadChunkStrategy] = useState<'recursive' | 'hierarchical'>('hierarchical');
  const [isUploading, setIsUploading] = useState(false);

  // Deletion loading states
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [deletingKbId, setDeletingKbId] = useState<string | null>(null);

  // Playground test state
  const [testQuery, setTestQuery] = useState('');
  const [testTargetKbId, setTestTargetKbId] = useState<string>('');
  const [queryAnalysisChoice, setQueryAnalysisChoice] = useState<'rule' | 'llm'>('rule');
  const [rerankerChoice, setRerankerChoice] = useState<'none' | 'local_cross_encoder' | 'simple_lexical'>('simple_lexical');
  const [contextStrategyChoice, setContextStrategyChoice] = useState<'top_chunks' | 'parent_child' | 'neighbors'>('parent_child');
  const [isGenerationEnabled, setIsGenerationEnabled] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState(false);
  const [queryResult, setQueryResult] = useState<TestQueryResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // User Role & Permissions State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);

  const canManageOrgKb =
    userRole === 'ADMIN' ||
    userRole === 'SINGLE' ||
    userPermissions?.canChangeOrgKnowledgeBase === true;

  // Helper for friendly permission error modal & toast
  const showPermissionAlert = (title: string, message: string, contextAdvice?: string) => {
    Swal.fire({
      title: `<span class="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
        <svg class="w-5 h-5 text-amber-400 inline-block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        ${title}
      </span>`,
      html: `
        <div class="text-left space-y-3 font-sans pt-1">
          <p class="text-xs text-slate-200 leading-relaxed font-medium">${message}</p>
          <div class="p-3 bg-white/[0.04] border border-white/10 rounded-xl text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
            <span class="font-semibold text-purple-300 block">Why am I seeing this?</span>
            <p>${contextAdvice || 'Organization knowledge bases and their documents are shared across your entire team. Only organization administrators or members with explicit management permissions can modify them.'}</p>
          </div>
          <p class="text-[11px] text-slate-400">💡 <em>Contact your organization administrator if you need this document or knowledge base modified.</em></p>
        </div>
      `,
      confirmButtonText: 'Understood',
      confirmButtonColor: '#8B5CF6',
      background: '#080D1D',
      color: '#F5F7FF',
      customClass: {
        popup: 'border border-white/10 rounded-2xl shadow-2xl',
      },
    });
  };

  const handleActionError = (err: any, fallbackTitle: string) => {
    const rawMsg = err?.message || String(err);
    const isPermissionError =
      rawMsg.includes('Access Denied') ||
      rawMsg.includes('permission') ||
      rawMsg.includes('Only administrators') ||
      rawMsg.includes('cannot delete') ||
      rawMsg.includes('cannot upload');

    if (isPermissionError) {
      showPermissionAlert('Permission Required', rawMsg);
      toast.error('🔒 Access Restricted: Administrator permissions required.');
    } else {
      toast.error(`${fallbackTitle}: ${rawMsg}`);
    }
  };

  // Auth helper
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  };

  // 1. Fetch Knowledge Bases from Backend
  const fetchKnowledgeBases = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/rag/knowledge-bases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setKnowledgeBases(list);
        setTargetUploadKbId((prev) => {
          if (!prev && list.length > 0) return list[0].id;
          return prev;
        });
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err: any) {
      console.warn('Could not fetch knowledge bases:', err?.message || err);
    }
  };

  // 2. Fetch Documents from Backend
  const fetchDocuments = async (overrideKbId?: string) => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const targetKbId = overrideKbId !== undefined ? overrideKbId : selectedKbFilter;
    if (!targetKbId) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_URL}/api/rag/documents?knowledgeSourceId=${targetKbId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch documents (${res.status})`);
      }

      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.warn('Could not fetch documents:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser(parsed);
        setUserRole(parsed.role || null);
        if (parsed.role === 'SINGLE') {
          setNewKbScope('PERSONAL');
        }
        setCurrentUserId(parsed.id || parsed.userId || null);
        if (parsed.permissions) {
          setUserPermissions(typeof parsed.permissions === 'string' ? JSON.parse(parsed.permissions) : parsed.permissions);
        }
      } catch (e) {
        console.warn('Failed to parse user session:', e);
      }
    }

    // Refresh live profile & permissions
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.role) {
            setUserRole(data.role);
            if (data.role === 'SINGLE') setNewKbScope('PERSONAL');
          }
          if (data.id) setCurrentUserId(data.id);
          if (data.permissions) {
            setUserPermissions(typeof data.permissions === 'string' ? JSON.parse(data.permissions) : data.permissions);
          }
        }
      })
      .catch(() => {});

    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (token && selectedKbFilter) {
      fetchDocuments();
    } else if (!selectedKbFilter) {
      setDocuments([]);
      setIsLoading(false);
    }
  }, [selectedKbFilter]);

  // 3. Handle Create Knowledge Base
  const handleCreateKnowledgeBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim()) return;

    setIsCreatingKb(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/knowledge-bases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newKbName.trim(),
          description: newKbDescription.trim() || undefined,
          scope: userRole === 'SINGLE' ? 'PERSONAL' : newKbScope,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create knowledge base.');
      }

      toast.success(`Knowledge Base "${newKbName}" established successfully.`);
      setNewKbName('');
      setNewKbDescription('');
      setIsCreateKbModalOpen(false);
      fetchKnowledgeBases();
    } catch (err: any) {
      handleActionError(err, 'Creation Failed');
    } finally {
      setIsCreatingKb(false);
    }
  };

  // 4. Handle Delete Knowledge Base
  const handleDeleteKnowledgeBase = async (
    kbId: string,
    kbName: string,
    kbScope?: string,
    createdByUserId?: string
  ) => {
    if (kbScope === 'ORGANIZATION' && userRole === 'MEMBER') {
      showPermissionAlert(
        'Admin Permission Required',
        'Only Organization Administrators can delete organization-level knowledge bases.',
        'Deleting an entire organization knowledge base permanently erases all contained documents and embeddings for all team members. To prevent accidental data loss, this action is restricted to administrators.'
      );
      return;
    }

    if (
      kbScope === 'PERSONAL' &&
      userRole === 'MEMBER' &&
      createdByUserId &&
      currentUserId &&
      createdByUserId !== currentUserId
    ) {
      showPermissionAlert(
        'Permission Required',
        'You can only delete your own personal knowledge bases.',
        'This knowledge base belongs to another member and cannot be deleted by other users.'
      );
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Knowledge Base?',
      text: `Are you sure you want to delete "${kbName}"? All contained documents and chunks will be deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#1E293B',
      background: '#080D1D',
      color: '#F5F7FF',
      customClass: {
        popup: 'border border-white/10 rounded-2xl shadow-2xl',
      },
    });

    if (!result.isConfirmed) return;

    setDeletingKbId(kbId);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/knowledge-bases/${kbId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete knowledge base.');
      }

      toast.success(`Knowledge base "${kbName}" removed.`);
      if (selectedKbFilter === kbId) setSelectedKbFilter('');
      if (targetUploadKbId === kbId) setTargetUploadKbId('');
      fetchKnowledgeBases();
      fetchDocuments();
    } catch (err: any) {
      handleActionError(err, 'Delete Failed');
    } finally {
      setDeletingKbId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!targetUploadKbId) {
      toast.error('Please select or create a destination Knowledge Base first.');
      return;
    }

    const targetKb = knowledgeBases.find((k) => k.id === targetUploadKbId);
    if (targetKb?.scope === 'ORGANIZATION' && userRole === 'MEMBER' && !canManageOrgKb) {
      showPermissionAlert(
        'Upload Permission Required',
        'You do not have permission to upload documents to organization knowledge bases.',
        'Adding documents to organization-wide knowledge bases requires Administrator privileges or explicit "Manage Knowledge Base" permission.'
      );
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Buffer = (reader.result as string).split(',')[1];
          const token = getAuthToken();

          const res = await fetch(`${API_URL}/api/rag/ingest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: selectedFile.name,
              mimeType: selectedFile.type || 'text/plain',
              source: selectedFile.name,
              knowledgeSourceId: targetUploadKbId,
              base64Buffer,
              config: {
                ingestion: {
                  chunkStrategy: uploadChunkStrategy,
                  chunkSize: 800,
                  chunkOverlap: 100,
                },
              },
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || 'Upload failed');
          }

          toast.success(`"${selectedFile.name}" indexed into knowledge base.`);
          setSelectedFile(null);
          if (selectedKbFilter !== targetUploadKbId) {
            setSelectedKbFilter(targetUploadKbId);
          } else {
            fetchDocuments();
          }
          fetchKnowledgeBases();
        } catch (postErr: any) {
          handleActionError(postErr, 'Ingestion Failed');
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      handleActionError(err, 'Upload Failed');
      setIsUploading(false);
    }
  };

  // 3. Delete Document
  const handleDeleteDocument = async (id: string, name: string, docKbScope?: string) => {
    if (docKbScope === 'ORGANIZATION' && userRole === 'MEMBER' && !canManageOrgKb) {
      showPermissionAlert(
        'Permission Required',
        'You do not have permission to delete documents from organization knowledge bases.',
        'Organization-wide documents are shared with your team. Only organization administrators or members with explicit "Manage Knowledge Base" permissions can remove them.'
      );
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Document?',
      text: `Are you sure you want to delete "${name}"? All vector chunks and embeddings will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#1E293B',
      background: '#080D1D',
      color: '#F5F7FF',
      customClass: {
        popup: 'border border-white/10 rounded-2xl shadow-2xl',
      },
    });

    if (!result.isConfirmed) return;

    setDeletingDocId(id);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/documents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete document');
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success(`Document "${name}" removed from knowledge base.`);
      fetchKnowledgeBases();
    } catch (err: any) {
      handleActionError(err, 'Delete Failed');
    } finally {
      setDeletingDocId(null);
    }
  };

  // 4. Test Search Playground with Phase 2 Reranker Config
  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsTesting(true);
    setTestError(null);
    setQueryResult(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: testQuery,
          metadataFilters: testTargetKbId ? { knowledgeSourceId: testTargetKbId } : undefined,
          config: {
            queryAnalysis: {
              strategy: queryAnalysisChoice,
            },
            retrieval: {
              mode: 'hybrid',
              topK: 10,
              vectorWeight: 0.7,
              keywordWeight: 0.3,
              minScore: 0.2,
            },
            reranker: {
              provider: rerankerChoice,
              topN: 5,
            },
            context: {
              strategy: contextStrategyChoice,
              maxTokens: 4000,
              citationMode: 'inline',
            },
            generation: {
              enabled: isGenerationEnabled,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setQueryResult(data);
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const filteredKnowledgeBases = useMemo(() => {
    return knowledgeBases.filter((kb) => {
      const matchesScope = userRole === 'SINGLE' || activeKbScopeTab === 'ALL' || kb.scope === activeKbScopeTab;
      const q = kbSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || kb.name.toLowerCase().includes(q) || (kb.description && kb.description.toLowerCase().includes(q));
      return matchesScope && matchesSearch;
    });
  }, [knowledgeBases, activeKbScopeTab, kbSearchQuery, userRole]);

  const filteredDocuments = useMemo(() => {
    if (!selectedKbFilter) return [];
    return documents.filter((doc) => {
      const matchesKb = doc.knowledgeSourceId === selectedKbFilter;
      const q = docSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || doc.name.toLowerCase().includes(q);
      return matchesKb && matchesSearch;
    });
  }, [documents, selectedKbFilter, docSearchQuery]);

  return (
    <div className="min-h-screen bg-[#030617] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/[0.06] bg-black/40 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/workflow"
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Back to Workflows"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-600/20">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">Knowledge Base & RAG Index</h1>
              <p className="text-[10px] text-[#687493]">Upload documents and test parent-child semantic retrieval</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateKbModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+ New Knowledge Base</span>
          </button>

          <UserProfileDropdown />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Knowledge Base Containers Section */}
        <section className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-white">Knowledge Bases</h2>
                <span className="text-[10px] text-purple-300 font-mono bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded-full">
                  {filteredKnowledgeBases.length} found
                </span>
                {selectedKbFilter && (
                  <button
                    onClick={() => setSelectedKbFilter('')}
                    className="text-[10px] text-violet-400 hover:text-violet-300 underline cursor-pointer ml-2"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#98A4C2]">Click a Knowledge Base to filter its documents below and target uploads</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Knowledge Bases by Name */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search KB by name..."
                  value={kbSearchQuery}
                  onChange={(e) => setKbSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Scope Filter Tabs - Only shown when user is in an organization (not SINGLE) */}
              {userRole !== 'SINGLE' && (
                <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl text-xs shrink-0">
                  {(['ALL', 'ORGANIZATION', 'PERSONAL'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveKbScopeTab(tab)}
                      className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                        activeKbScopeTab === tab
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab === 'ALL' ? 'All' : tab === 'ORGANIZATION' ? 'Organization' : 'Personal'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Knowledge Base Cards Grid with Scrollbar */}
          {filteredKnowledgeBases.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 italic">
              {kbSearchQuery ? 'No knowledge bases match your search.' : 'No knowledge bases found for this view. Create one to organize documents.'}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-1.5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredKnowledgeBases.map((kb) => {
                  const isSelected = selectedKbFilter === kb.id;
                  return (
                    <div
                      key={kb.id}
                      onClick={() => {
                        const nextId = isSelected ? '' : kb.id;
                        setSelectedKbFilter(nextId);
                        if (nextId) {
                          setTargetUploadKbId(nextId);
                          setTestTargetKbId(nextId);
                        }
                      }}
                      className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/15'
                          : 'bg-black/30 border-white/[0.04] hover:border-white/15'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">{kb.name}</span>
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                              </span>
                            )}
                            {userRole !== 'SINGLE' && (
                              <span
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                                  kb.scope === 'ORGANIZATION'
                                    ? 'bg-blue-950/40 text-blue-300 border-blue-800/30'
                                    : 'bg-purple-950/40 text-purple-300 border-purple-800/30'
                                }`}
                              >
                                {kb.scope}
                              </span>
                            )}
                          </div>
                        </div>
                        {kb.description && (
                          <p className="text-[11px] text-[#98A4C2] line-clamp-2">{kb.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04] text-[10px] text-slate-400">
                        <span className={isSelected ? 'text-violet-300 font-semibold' : ''}>
                          {kb._count?.documents || 0} documents
                        </span>
                        {(() => {
                          const canDeleteKb =
                            userRole === 'ADMIN' ||
                            userRole === 'SINGLE' ||
                            (userRole === 'MEMBER' && kb.scope === 'PERSONAL' && (!kb.createdByUserId || kb.createdByUserId === currentUserId));

                          return canDeleteKb ? (
                            <button
                              disabled={deletingKbId === kb.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteKnowledgeBase(kb.id, kb.name, kb.scope, kb.createdByUserId);
                              }}
                              className="text-slate-400 hover:text-red-400 p-1 transition cursor-pointer flex items-center gap-1 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Knowledge Base"
                            >
                              {deletingKbId === kb.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                'Delete'
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (kb.scope === 'ORGANIZATION') {
                                  showPermissionAlert(
                                    'Admin Permission Required',
                                    'Only Organization Administrators can delete organization-level knowledge bases.',
                                    'Deleting an entire organization knowledge base permanently erases all contained documents and embeddings for all team members. To prevent accidental data loss, this action is restricted to administrators.'
                                  );
                                } else {
                                  showPermissionAlert(
                                    'Permission Required',
                                    'You can only delete your own personal knowledge bases.',
                                    'This knowledge base belongs to another member and cannot be deleted by other users.'
                                  );
                                }
                              }}
                              className="text-slate-500 hover:text-amber-400 p-1 transition cursor-pointer flex items-center gap-1 text-[10px]"
                              title="Permission Required to Delete"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Protected</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Two Columns: Upload & Table (Left) + Test Playground (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Card & Documents Table (7 cols) */}
          <section className="lg:col-span-7 space-y-6">
            {/* Ingest Knowledge Sources Card */}
            <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="mb-5 flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-2.5 text-purple-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-white">Upload Knowledge Sources</h2>
                    <p className="text-[11px] text-[#98A4C2]">Supported: PDF, DOCX, XLSX, TXT, Markdown, PPTX</p>
                  </div>
                </div>
              </div>

              {/* Grid: Upload & Status */}
              <div className="grid gap-5 md:grid-cols-[1.3fr_1fr] items-stretch">
                <div className="flex flex-col justify-between rounded-xl border border-dashed border-purple-500/20 hover:border-purple-500/40 bg-black/30 p-5 min-h-[240px] transition">
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.pptx"
                      disabled={isUploading || knowledgeBases.length === 0}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-[#98A4C2] file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/35 transition file:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />

                    {/* Target Knowledge Base Selector */}
                    <div>
                      <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                        Destination Knowledge Base (Required)
                      </label>
                      <KnowledgeBaseDropdown
                        value={targetUploadKbId}
                        onChange={(id) => setTargetUploadKbId(id)}
                        knowledgeBases={knowledgeBases}
                        disabled={isUploading}
                        placeholder="-- Select a Knowledge Base --"
                      />
                    </div>

                    {knowledgeBases.length === 0 && (
                      <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-200/90 leading-relaxed">
                          Please create a Knowledge Base first using the <strong>+ New Knowledge Base</strong> button before uploading documents.
                        </p>
                      </div>
                    )}
                    
                    {/* Chunking Strategy Option */}
                    <div>
                      <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                        Chunking Architecture
                      </label>
                      <select
                        value={uploadChunkStrategy}
                        onChange={(e) => setUploadChunkStrategy(e.target.value as any)}
                        disabled={isUploading}
                        className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 focus:outline-none focus:border-purple-500/50 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="hierarchical" className="bg-[#080D1D] text-slate-200 py-1.5">Hierarchical (Parent ~3000ch + Child ~600ch)</option>
                        <option value="recursive" className="bg-[#080D1D] text-slate-200 py-1.5">Recursive Paragraph Split (~800ch)</option>
                      </select>
                    </div>

                    <div className="text-xs text-[#98A4C2]">
                      {selectedFile ? (
                        <span className="font-medium text-purple-300 bg-purple-950/40 border border-purple-800/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">{selectedFile.name}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#687493]">Choose a document from your computer</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading || !targetUploadKbId || knowledgeBases.length === 0}
                    className="w-full sm:w-auto mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Ingesting Document...</span>
                      </>
                    ) : (
                      <>
                        <span>Upload and Ingest</span>
                        <Upload className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center p-5 border border-white/[0.06] rounded-xl bg-black/40 min-h-[190px] text-center">
                  {isUploading ? (
                    <div className="scale-90 transition-all duration-300">
                      <Loader />
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-[180px]">
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        System Ready
                      </div>
                      <p className="text-[10px] text-[#687493] leading-relaxed">
                        {knowledgeBases.length === 0
                          ? 'Create a Knowledge Base to enable document ingestion.'
                          : 'Select a file to begin vector indexing into the chosen Knowledge Base.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documents Table Card */}
            <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/[0.05] pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                    Indexed Documents ({filteredDocuments.length})
                  </h2>
                  {selectedKbFilter && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono flex items-center gap-1">
                      <span>Selected KB:</span>
                      <span className="font-bold text-white truncate max-w-[140px]">
                        {knowledgeBases.find((k) => k.id === selectedKbFilter)?.name || 'KB'}
                      </span>
                      <button
                        onClick={() => setSelectedKbFilter('')}
                        className="ml-1 text-slate-400 hover:text-white cursor-pointer"
                        title="Clear Selection"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Search Ingested Documents */}
                  <div className="relative w-full sm:w-44">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search docs..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <button
                    onClick={() => fetchDocuments()}
                    disabled={!selectedKbFilter || isLoading}
                    className="text-[10px] text-purple-400 hover:text-purple-300 transition font-mono cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <span>Refresh ⟳</span>
                    )}
                  </button>
                </div>
              </div>

              {!selectedKbFilter ? (
                <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-xl bg-black/20 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200">No Knowledge Base Selected</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Select a Knowledge Base from the collection above to view its ingested documents.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">Loading documents...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  {docSearchQuery
                    ? 'No documents match your search query.'
                    : 'No documents found in this Knowledge Base. Upload a document to begin.'}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {filteredDocuments.map((doc) => {
                    const kb = knowledgeBases.find((k) => k.id === doc.knowledgeSourceId);
                    const isOrgDoc = kb?.scope === 'ORGANIZATION';
                    const isOtherMemberPersonalDoc =
                      kb?.scope === 'PERSONAL' &&
                      Boolean(kb?.createdByUserId && currentUserId && kb.createdByUserId !== currentUserId);
                    const canDeleteDoc =
                      userRole === 'ADMIN' ||
                      userRole === 'SINGLE' ||
                      (userRole === 'MEMBER' && (isOrgDoc ? canManageOrgKb : !isOtherMemberPersonalDoc));

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3.5 bg-black/40 border border-white/[0.04] hover:border-purple-500/30 rounded-xl transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 text-xs font-bold font-mono">
                            DOC
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{doc.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-mono text-purple-300 bg-purple-950/30 px-1.5 py-0.2 rounded border border-purple-800/30">
                                {doc._count.chunks} chunks
                              </span>
                              {kb && (
                                <span className="text-[9px] text-violet-300 bg-violet-950/30 border border-violet-800/30 px-1.5 py-0.2 rounded">
                                  {kb.name}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canDeleteDoc ? (
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.name, kb?.scope)}
                              disabled={deletingDocId === doc.id}
                              className="p-1.5 hover:bg-red-950/30 text-slate-400 hover:text-red-400 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title={deletingDocId === doc.id ? "Deleting..." : "Delete Document"}
                            >
                              {deletingDocId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                showPermissionAlert(
                                  'Permission Required',
                                  isOrgDoc
                                    ? 'You do not have permission to delete documents from organization knowledge bases.'
                                    : 'You do not have permission to delete documents from another member\'s personal knowledge base.',
                                  isOrgDoc
                                    ? 'Organization-wide documents are shared across your entire team. Only organization administrators or members with explicit "Manage Knowledge Base" permissions can remove them.'
                                    : 'This document belongs to another member\'s private personal knowledge base and cannot be deleted by other users.'
                                )
                              }
                              className="p-1.5 bg-white/[0.03] hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 border border-white/5 rounded-lg transition cursor-pointer"
                              title="Permission Required to Delete"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Search & Test Playground (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-3">
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">RAG Playground</h2>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-2 py-0.5 rounded">
                  Live Test
                </span>
              </div>

              <form onSubmit={handleTestSearch} className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1.5">
                    Target Knowledge Base
                  </label>
                  <KnowledgeBaseDropdown
                    value={testTargetKbId}
                    onChange={(id) => setTestTargetKbId(id)}
                    knowledgeBases={knowledgeBases}
                    allowAll={true}
                    placeholder="-- All Accessible Knowledge Bases --"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1.5">
                    Ask a Question
                  </label>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="e.g. What is the database timeout error code?"
                    className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                  />
                </div>

                {/* Query Controls Grid: Analysis, Reranker, Context */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                      Query Analysis
                    </label>
                    <select
                      value={queryAnalysisChoice}
                      onChange={(e) => setQueryAnalysisChoice(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="rule" className="bg-[#080D1D] text-slate-200 py-1.5">Rule-Based (~1ms)</option>
                      <option value="llm" className="bg-[#080D1D] text-slate-200 py-1.5">LLM Gemini (~1.5s)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                      Reranker
                    </label>
                    <select
                      value={rerankerChoice}
                      onChange={(e) => setRerankerChoice(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="simple_lexical" className="bg-[#080D1D] text-slate-200 py-1.5">Simple Lexical (Fast)</option>
                      <option value="local_cross_encoder" className="bg-[#080D1D] text-slate-200 py-1.5">Cross-Encoder (Neural)</option>
                      <option value="none" className="bg-[#080D1D] text-slate-200 py-1.5">None (RRF Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                      Context Expansion
                    </label>
                    <select
                      value={contextStrategyChoice}
                      onChange={(e) => setContextStrategyChoice(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="parent_child" className="bg-[#080D1D] text-slate-200 py-1.5">Parent-Child</option>
                      <option value="neighbors" className="bg-[#080D1D] text-slate-200 py-1.5">Neighbor Window</option>
                      <option value="top_chunks" className="bg-[#080D1D] text-slate-200 py-1.5">Top Chunks</option>
                    </select>
                  </div>
                </div>

                {/* Generative AI Answer Toggle */}
                <div className="p-3 bg-black/40 border border-white/[0.06] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                        Generate AI Answer (Gemini)
                      </span>
                      {isGenerationEnabled ? (
                        <span className="text-[8px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-700/40 px-1.5 py-0.5 rounded">
                          LLM Active
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-900/60 border border-slate-700/40 px-1.5 py-0.5 rounded">
                          Retrieval Only
                        </span>
                      )}
                    </div>

                    {/* Modern Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isGenerationEnabled}
                      onClick={() => setIsGenerationEnabled(!isGenerationEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isGenerationEnabled ? 'bg-purple-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isGenerationEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[9px] text-[#8492B4] leading-relaxed">
                    {isGenerationEnabled
                      ? '⚡ Generates a grounded response synthesized by Gemini (requires GEMINI_API_KEY in Settings).'
                      : '📄 Retrieval-only: returns ranked document chunks and citation resources without calling Gemini.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isGenerationEnabled ? 'Searching, Reranking & Generating Answer...' : 'Searching & Ranking Chunks...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isGenerationEnabled ? 'Test Retrieval & Answer' : 'Test Document Retrieval'}</span>
                      <Zap className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {testError && (
                <div className="mt-4 text-xs text-red-400 bg-red-950/30 border border-red-800/30 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>Query Execution Failed</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{testError}</p>
                  {testError.includes('GEMINI_API_KEY') && (
                    <div className="pt-1">
                      <Link
                        href="/setting"
                        className="inline-flex items-center gap-1 text-[10px] text-purple-300 hover:text-purple-200 underline font-medium"
                      >
                        Go to Settings &rarr; Configure Gemini API Key
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Test Result Display */}
              {queryResult && (
                <div className="mt-4 space-y-3.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
                  {/* If generative answer enabled and answer exists */}
                  {queryResult.answer ? (
                    <div className="bg-black/50 border border-purple-500/30 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Synthesized Answer
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">{queryResult.latencyMs}ms</span>
                      </div>
                      <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                        {queryResult.answer}
                      </p>
                    </div>
                  ) : (
                    /* Retrieval-only notification banner when generative answer is disabled */
                    <div className="bg-slate-900/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Retrieval-Only Mode Active
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">{queryResult.latencyMs}ms</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Retrieved <strong className="text-white">{queryResult.retrievedCount} chunks</strong> across <strong className="text-white">{queryResult.context.citations.length} sources</strong>. Generative synthesis is disabled.
                      </p>
                      <p className="text-[9px] text-[#8492B4]">
                        Need an AI-synthesized answer? Enable &quot;Generate AI Answer&quot; above and ensure your <code className="bg-black/40 px-1 py-0.5 rounded text-purple-300 font-mono">GEMINI_API_KEY</code> is configured in <Link href="/setting" className="text-purple-400 hover:underline">Settings</Link>.
                      </p>
                    </div>
                  )}

                  {/* Citations & Chunks */}
                  {queryResult.context.citations.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                        Matched Resources & Chunks ({queryResult.context.citations.length})
                      </span>

                      <div className="space-y-2">
                        {queryResult.context.citations.map((cit) => (
                          <div
                            key={cit.index}
                            className="bg-black/30 border border-white/[0.04] p-3 rounded-xl space-y-1.5 text-left"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="text-[10px] font-bold text-slate-200">
                                [{cit.index}] {cit.documentTitle}
                              </span>
                              <span className="text-[9px] font-mono text-purple-400">
                                Score: {cit.score}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">
                              {cit.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 p-3 text-center border border-white/[0.04] rounded-xl">
                      No matching documents found for this query.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Create Knowledge Base Modal */}
      {isCreateKbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#080D1D] border border-white/[0.08] p-6 rounded-2xl shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">Create Knowledge Base</h3>
            <p className="text-xs text-[#98A4C2] mb-5">Establish a dedicated vector collection for documents.</p>

            <form onSubmit={handleCreateKnowledgeBase} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Knowledge Base Name
                </label>
                <input
                  type="text"
                  required
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder="e.g. Engineering Manuals"
                  className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newKbDescription}
                  onChange={(e) => setNewKbDescription(e.target.value)}
                  placeholder="Brief summary of document topic..."
                  className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                />
              </div>

              {userRole !== 'SINGLE' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewKbScope('ORGANIZATION')}
                      className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                        newKbScope === 'ORGANIZATION'
                          ? 'bg-violet-950/50 border-violet-500/50 text-violet-200'
                          : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Organization
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewKbScope('PERSONAL')}
                      className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                        newKbScope === 'PERSONAL'
                          ? 'bg-violet-950/50 border-violet-500/50 text-violet-200'
                          : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Personal
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setIsCreateKbModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingKb || !newKbName.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingKb ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
