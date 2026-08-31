// frontend/app/document/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Upload, Zap, Network, GitFork, ArrowRight, Layers, Workflow } from 'lucide-react';
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

export default function DocumentKnowledgePage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [activeKbScopeTab, setActiveKbScopeTab] = useState<'ALL' | 'ORGANIZATION' | 'PERSONAL'>('ALL');
  const [selectedKbFilter, setSelectedKbFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Playground test state
  const [testQuery, setTestQuery] = useState('');
  const [testTargetKbId, setTestTargetKbId] = useState<string>('');
  const [rerankerChoice, setRerankerChoice] = useState<'none' | 'local_cross_encoder' | 'simple_lexical'>('local_cross_encoder');
  const [contextStrategyChoice, setContextStrategyChoice] = useState<'top_chunks' | 'parent_child' | 'neighbors'>('parent_child');
  const [isTesting, setIsTesting] = useState(false);
  const [queryResult, setQueryResult] = useState<TestQueryResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

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
      const res = await fetch(`${API_URL}/api/rag/knowledge-bases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBases(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // 2. Fetch Documents from Backend
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const url = selectedKbFilter && selectedKbFilter !== 'ALL'
        ? `${API_URL}/api/rag/documents?knowledgeSourceId=${selectedKbFilter}`
        : `${API_URL}/api/rag/documents`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    fetchDocuments();
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
          scope: newKbScope,
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
      toast.error(`Creation Failed: ${err.message}`);
    } finally {
      setIsCreatingKb(false);
    }
  };

  // 4. Handle Delete Knowledge Base
  const handleDeleteKnowledgeBase = async (kbId: string, kbName: string) => {
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
    });

    if (!result.isConfirmed) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/knowledge-bases/${kbId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete knowledge base.');
      }

      toast.success(`Knowledge base "${kbName}" removed.`);
      if (selectedKbFilter === kbId) setSelectedKbFilter('ALL');
      if (targetUploadKbId === kbId) setTargetUploadKbId('');
      fetchKnowledgeBases();
      fetchDocuments();
    } catch (err: any) {
      toast.error(`Delete Failed: ${err.message}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
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
              knowledgeSourceId: targetUploadKbId || undefined,
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

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Upload failed');
          }

          toast.success(`"${selectedFile.name}" indexed into knowledge base.`);
          setSelectedFile(null);
          fetchDocuments();
          fetchKnowledgeBases();
        } catch (postErr: any) {
          toast.error(`Ingestion Failed: ${postErr.message}`);
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
      setIsUploading(false);
    }
  };

  // 3. Delete Document
  const handleDeleteDocument = async (id: string, name: string) => {
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
    });

    if (!result.isConfirmed) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/documents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success(`Document "${name}" removed from knowledge base.`);
      fetchKnowledgeBases();
    } catch (err: any) {
      toast.error(`Delete Failed: ${err.message}`);
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

  const filteredKnowledgeBases = knowledgeBases.filter((kb) => {
    if (activeKbScopeTab === 'ALL') return true;
    return kb.scope === activeKbScopeTab;
  });

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

          <Link
            href="/workflow"
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition"
          >
            Go to Canvas &rarr;
          </Link>

          <UserProfileDropdown />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Knowledge Base Containers Section */}
        <section className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
            <div>
              <h2 className="font-semibold text-sm text-white">Knowledge Bases</h2>
              <p className="text-[11px] text-[#98A4C2]">Isolated document collections powering your RAG AI Agents</p>
            </div>

            {/* Scope Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl text-xs">
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
          </div>

          {/* Knowledge Base Cards Grid */}
          {filteredKnowledgeBases.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 italic">
              No knowledge bases found for this view. Create one to organize documents.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredKnowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => setSelectedKbFilter(selectedKbFilter === kb.id ? 'ALL' : kb.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                    selectedKbFilter === kb.id
                      ? 'bg-violet-950/25 border-violet-500/50 shadow-md shadow-violet-500/10'
                      : 'bg-black/30 border-white/[0.04] hover:border-white/15'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{kb.name}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                          kb.scope === 'ORGANIZATION'
                            ? 'bg-blue-950/40 text-blue-300 border-blue-800/30'
                            : 'bg-purple-950/40 text-purple-300 border-purple-800/30'
                        }`}
                      >
                        {kb.scope}
                      </span>
                    </div>
                    {kb.description && (
                      <p className="text-[11px] text-[#98A4C2] line-clamp-2">{kb.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04] text-[10px] text-slate-400">
                    <span>{kb._count?.documents || 0} documents</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteKnowledgeBase(kb.id, kb.name);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                      title="Delete Knowledge Base"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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
                      disabled={isUploading}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-[#98A4C2] file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/35 transition file:cursor-pointer"
                    />

                    {/* Target Knowledge Base Selector */}
                    <div>
                      <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                        Destination Knowledge Base
                      </label>
                      <select
                        value={targetUploadKbId}
                        onChange={(e) => setTargetUploadKbId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 focus:outline-none"
                      >
                        <option value="">-- General / Default --</option>
                        {knowledgeBases.map((kb) => (
                          <option key={kb.id} value={kb.id} className="bg-[#080D1D] text-slate-200">
                            [{kb.scope}] {kb.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Chunking Strategy Option */}
                    <div>
                      <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                        Chunking Architecture
                      </label>
                      <select
                        value={uploadChunkStrategy}
                        onChange={(e) => setUploadChunkStrategy(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[11px] text-purple-200 focus:outline-none"
                      >
                        <option value="hierarchical">Hierarchical (Parent ~3000ch + Child ~600ch)</option>
                        <option value="recursive">Recursive Paragraph Split (~800ch)</option>
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
                    disabled={!selectedFile || isUploading}
                    className="w-full sm:w-auto mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      'Ingesting Document...'
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
                        Select a file to begin vector indexing into the chosen Knowledge Base.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documents Table Card */}
            <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                    Indexed Documents ({documents.length})
                  </h2>
                  {selectedKbFilter !== 'ALL' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                      Filtered
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchDocuments}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition font-mono cursor-pointer"
                >
                  Refresh ⟳
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">Loading knowledge base...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No documents found for this filter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => {
                    const kb = knowledgeBases.find((k) => k.id === doc.knowledgeSourceId);
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
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.name)}
                            className="p-1.5 hover:bg-red-950/30 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                            title="Delete Document"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
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
                  <select
                    value={testTargetKbId}
                    onChange={(e) => setTestTargetKbId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/45 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500/50 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- All Accessible Knowledge Bases --</option>
                    {knowledgeBases.map((kb) => (
                      <option key={kb.id} value={kb.id} className="bg-[#080D1D] text-slate-200">
                        [{kb.scope}] {kb.name}
                      </option>
                    ))}
                  </select>
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

                {/* Reranker & Context Expansion Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                      Reranker
                    </label>
                    <select
                      value={rerankerChoice}
                      onChange={(e) => setRerankerChoice(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-black/45 border border-white/10 rounded-xl text-[11px] text-white focus:border-purple-500/50 focus:outline-none cursor-pointer"
                    >
                      <option value="local_cross_encoder">Cross-Encoder (Neural)</option>
                      <option value="simple_lexical">Simple Lexical</option>
                      <option value="none">None (RRF)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-[#98A4C2] uppercase tracking-widest mb-1">
                      Context Expansion
                    </label>
                    <select
                      value={contextStrategyChoice}
                      onChange={(e) => setContextStrategyChoice(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-black/45 border border-white/10 rounded-xl text-[11px] text-white focus:border-purple-500/50 focus:outline-none cursor-pointer"
                    >
                      <option value="parent_child">Parent-Child (Full Context)</option>
                      <option value="neighbors">Neighbor Window (Stitched)</option>
                      <option value="top_chunks">Top Chunks (Default)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isTesting ? (
                    'Searching, Reranking & Expanding...'
                  ) : (
                    <>
                      <span>Test Retrieval & Answer</span>
                      <Zap className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {testError && (
                <div className="mt-4 text-xs text-red-400 bg-red-950/30 border border-red-800/30 p-3 rounded-xl">
                  {testError}
                </div>
              )}

              {/* Test Result Display */}
              {queryResult && (
                <div className="mt-4 space-y-3.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
                  {/* Answer Box */}
                  <div className="bg-black/50 border border-purple-500/30 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider">
                        Synthesized Answer
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">{queryResult.latencyMs}ms</span>
                    </div>
                    <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {queryResult.answer}
                    </p>
                  </div>

                  {/* Citations & Chunks */}
                  {queryResult.context.citations.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                        Final Context Chunks ({queryResult.context.citations.length})
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
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isCreatingKb ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
