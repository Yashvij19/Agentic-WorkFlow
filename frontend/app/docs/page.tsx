// frontend/app/docs/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AetherFlowLogo from '@/components/AetherFlowLogo';
import { 
  Search, 
  Copy, 
  Check, 
  BookOpen, 
  Cpu, 
  Boxes, 
  ShieldCheck, 
  RefreshCw, 
  Compass, 
  ChevronRight, 
  ChevronLeft,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { 
  DOCUMENTATION_CATEGORIES, 
  DocCategory, 
  DocArticle, 
  DocSection 
} from '../../data/documentationData';

export default function DocumentationPage() {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    DOCUMENTATION_CATEGORIES[0]?.articles[0]?.id || 'introduction'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Flatten all articles for search & pagination
  const allArticles = useMemo(() => {
    return DOCUMENTATION_CATEGORIES.flatMap(cat => cat.articles);
  }, []);

  // Filtered categories based on search input
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DOCUMENTATION_CATEGORIES;
    const q = searchQuery.toLowerCase();

    return DOCUMENTATION_CATEGORIES.map(cat => {
      const matchingArticles = cat.articles.filter(
        art =>
          art.title.toLowerCase().includes(q) ||
          art.description.toLowerCase().includes(q) ||
          art.sections.some(
            sec =>
              sec.title.toLowerCase().includes(q) ||
              sec.content.toLowerCase().includes(q)
          )
      );
      return { ...cat, articles: matchingArticles };
    }).filter(cat => cat.articles.length > 0);
  }, [searchQuery]);

  // Current active article
  const activeArticle = useMemo(() => {
    return allArticles.find(a => a.id === selectedArticleId) || allArticles[0];
  }, [allArticles, selectedArticleId]);

  // Previous and Next article navigation
  const currentIndex = allArticles.findIndex(a => a.id === activeArticle.id);
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

  // Handle Copy to Clipboard for code blocks
  const handleCopyCode = (code: string, snippetId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(snippetId);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Icon selector helper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass': return <Compass className="w-4 h-4 text-cyan-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-violet-400" />;
      case 'Boxes': return <Boxes className="w-4 h-4 text-indigo-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'RefreshCw': return <RefreshCw className="w-4 h-4 text-amber-400" />;
      default: return <BookOpen className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. TOP HEADER & SEARCH BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#050814]/90 backdrop-blur-xl">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand & Docs Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <AetherFlowLogo size={28} showText textSize="text-base" />
            </Link>
            <span className="text-slate-600 text-xs">/</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono font-semibold uppercase tracking-wider">
              Docs & Manual
            </span>
          </div>

          {/* Centered Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search concepts, nodes, RBAC, self-correction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/[0.08] focus:border-cyan-500/50 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-white px-1.5 py-0.5 rounded bg-white/10"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/workflow"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-cyan-500/15 transition duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. THREE-COLUMN DOCUMENTATION LAYOUT */}
      <div className="max-w-[90rem] mx-auto px-4 sm:px-8 py-8 flex gap-8">

        {/* LEFT COLUMN: NAVIGATION SIDEBAR */}
        <aside className="w-64 shrink-0 hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-3 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {filteredCategories.map((category) => (
            <div key={category.id} className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {getCategoryIcon(category.iconName)}
                <span>{category.title}</span>
              </div>

              <div className="space-y-0.5 border-l border-white/[0.06] ml-4 pl-2">
                {category.articles.map((art) => {
                  const isActive = selectedArticleId === art.id;
                  return (
                    <button
                      key={art.id}
                      onClick={() => {
                        setSelectedArticleId(art.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition duration-200 flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-300 font-semibold border-l-2 -ml-[9px] border-cyan-400 pl-[17px]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="truncate">{art.title}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* CENTER COLUMN: ARTICLE CONTENT VIEWER */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-12 pb-24">
          
          {/* Article Header */}
          <div className="space-y-3 pb-8 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-cyan-400">
                {activeArticle.category}
              </span>
              {activeArticle.badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-white/[0.04] border border-white/[0.08] text-slate-300">
                  {activeArticle.badge}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {activeArticle.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed">
              {activeArticle.description}
            </p>
          </div>

          {/* Article Sections */}
          <div className="space-y-10">
            {activeArticle.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-4 scroll-mt-24">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{section.title}</span>
                </h2>

                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light whitespace-pre-line space-y-2">
                  {section.content}
                </div>

                {/* Callout Alert Box */}
                {section.callout && (
                  <div
                    className={`p-4 rounded-2xl border flex items-start gap-3.5 my-4 ${
                      section.callout.type === 'important'
                        ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
                        : section.callout.type === 'warning'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : section.callout.type === 'tip'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-violet-950/20 border-violet-500/30 text-violet-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {section.callout.type === 'important' && <Sparkles className="w-4 h-4 text-cyan-400" />}
                      {section.callout.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {section.callout.type === 'tip' && <Lightbulb className="w-4 h-4 text-emerald-400" />}
                      {section.callout.type === 'note' && <Info className="w-4 h-4 text-violet-400" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {section.callout.title}
                      </h4>
                      <p className="text-xs font-light leading-relaxed">
                        {section.callout.text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Code Snippet */}
                {section.codeSnippet && (
                  <div className="relative my-4 rounded-2xl overflow-hidden border border-white/[0.08] bg-black/50 shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] text-xs text-slate-400 font-mono">
                      <span className="uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                        {section.codeSnippet.language}
                      </span>
                      <button
                        onClick={() => handleCopyCode(section.codeSnippet!.code, section.id)}
                        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/[0.05] cursor-pointer"
                        title="Copy code to clipboard"
                      >
                        {copiedSnippetId === section.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed bg-[#030611]/80">
                      <code>{section.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Article Footer Pagination */}
          <div className="pt-8 border-t border-white/[0.06] flex items-center justify-between gap-4">
            {prevArticle ? (
              <button
                onClick={() => {
                  setSelectedArticleId(prevArticle.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-left transition cursor-pointer max-w-[45%]"
              >
                <ChevronLeft className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Previous Article</span>
                  <span className="text-xs font-bold text-white truncate block">{prevArticle.title}</span>
                </div>
              </button>
            ) : <div />}

            {nextArticle && (
              <button
                onClick={() => {
                  setSelectedArticleId(nextArticle.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-right transition cursor-pointer max-w-[45%] ml-auto"
              >
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Next Article</span>
                  <span className="text-xs font-bold text-white truncate block">{nextArticle.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: ON THIS PAGE (TABLE OF CONTENTS) */}
        <aside className="w-60 shrink-0 hidden xl:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pl-2 space-y-4">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            On This Page
          </div>
          <ul className="space-y-2 border-l border-white/[0.06] pl-3">
            {activeArticle.sections.map((sec) => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition-colors duration-150 block py-0.5 leading-snug truncate"
                >
                  {sec.title}
                </a>
              </li>
            ))}
          </ul>

          {/* Quick Support Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 mt-8">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">
              Explore Live System
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-light">
              Try executing autonomous self-healing guardrails and hybrid vector RAG in the canvas.
            </p>
            <Link
              href="/workflow"
              className="inline-flex items-center gap-1.5 text-xs text-white hover:text-cyan-300 font-semibold transition"
            >
              <span>Open Visual Builder &rarr;</span>
            </Link>
          </div>
        </aside>

      </div>
    </div>
  );
}
