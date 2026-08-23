// frontend/app/document/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '../../utils/config';

interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  source: string;
  createdAt: string;
  _count: {
    chunks: number;
  };
}

interface TestQueryResult {
  answer: string;
  retrievedCount: number;
  latencyMs: number;
  context: {
    contextText: string;
    citations: Array<{
      index: number;
      documentTitle: string;
      score: number;
      snippet: string;
    }>;
  };
}

export default function DocumentKnowledgePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Playground test state
  const [testQuery, setTestQuery] = useState('');
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

  // 1. Fetch Documents from Backend
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/rag/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    fetchDocuments();
  }, []);

  // 2. Handle File Upload (converts file to Base64 and POSTs to /api/rag/ingest)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Buffer = (reader.result as string).split(',')[1];
        const token = getAuthToken();

        const res = await fetch(`${API_URL}/api/rag/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || 'text/plain',
            source: file.name,
            base64Buffer,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setUploadSuccess(`Successfully indexed "${file.name}"!`);
        fetchDocuments();
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  // 3. Delete Document
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document and all its chunks?')) return;

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
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 4. Test Search Playground
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

  return (
    <div className="min-h-screen bg-[#030617] text-white flex flex-col">
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
              <h1 className="text-sm font-bold tracking-tight">Knowledge Base & RAG Index</h1>
              <p className="text-[10px] text-[#687493]">Upload documents and test semantic retrieval</p>
            </div>
          </div>
        </div>

        <Link
          href="/workflow"
          className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition"
        >
          Go to Canvas &rarr;
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload & Documents List (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Upload Card */}
          <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Ingest Knowledge</h2>
              <span className="text-[10px] text-purple-400 font-mono">bge-m3 1024d</span>
            </div>

            <label className="border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-black/30 hover:bg-purple-950/10 transition group">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center text-purple-400 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-200 block">
                  {isUploading ? 'Ingesting and Generating Embeddings...' : 'Click to Upload Document'}
                </span>
                <span className="text-[10px] text-[#687493] mt-1 block">
                  Supports PDF, DOCX, Markdown, Text, PPTX, XLSX
                </span>
              </div>
              <input
                type="file"
                disabled={isUploading}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.pptx"
              />
            </label>

            {uploadError && (
              <div className="mt-3 text-xs text-red-400 bg-red-950/30 border border-red-800/30 p-2.5 rounded-xl">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-3 text-xs text-green-400 bg-green-950/30 border border-green-800/30 p-2.5 rounded-xl">
                {uploadSuccess}
              </div>
            )}
          </div>

          {/* Documents Table Card */}
          <div className="bg-[#080D1D]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-3">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                Indexed Documents ({documents.length})
              </h2>
              <button
                onClick={fetchDocuments}
                className="text-[10px] text-slate-400 hover:text-white transition font-mono"
              >
                Refresh ⟳
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">Loading knowledge base...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No documents uploaded yet. Upload a document above to get started.
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
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
                          <span className="text-[9px] text-slate-500">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 hover:bg-red-950/30 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                        title="Delete Document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
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

            <form onSubmit={handleTestSearch} className="space-y-3">
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

              <button
                type="submit"
                disabled={isTesting}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'Searching & Synthesizing...' : 'Test Retrieval & Answer'}
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
                      Retrieved Chunks ({queryResult.context.citations.length})
                    </span>
                    <div className="space-y-2">
                      {queryResult.context.citations.map((cit) => (
                        <div
                          key={cit.index}
                          className="bg-black/30 border border-white/[0.04] p-3 rounded-xl space-y-1 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-200">
                              [{cit.index}] {cit.documentTitle}
                            </span>
                            <span className="text-[9px] font-mono text-purple-400">
                              Score: {cit.score}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
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
      </main>
    </div>
  );
}
