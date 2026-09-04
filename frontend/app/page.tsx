// frontend/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ScrollCanvasBackground from '@/components/ScrollCanvasBackground';
import InteractiveArchitectureMap from '@/components/InteractiveArchitectureMap';
import AetherFlowLogo from '@/components/AetherFlowLogo';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [aboutTab, setAboutTab] = useState<'what' | 'why' | 'how' | 'purpose'>('what');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<number>(2); // Default to Guardrail stage
  const [simulateRewind, setSimulateRewind] = useState<boolean>(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);
  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* 1. High Performance Scroll-Driven Z-Axis Background Animation */}
      <ScrollCanvasBackground 
        totalFrames={120}
        imageFolder="/frames"
        imagePrefix="ezgif-frame-"
        imageExtension="jpg"
      />

      {/* Atmospheric layout: Scroll track coordinates */}
      <div className="relative z-10 w-full flex flex-col items-center">
        
        {/* Floating Sticky Spatial Header */}
        <header className="sticky top-4 w-[calc(100%-2rem)] max-w-5xl mx-4 py-3.5 px-6 mt-4 flex items-center justify-between glass-panel rounded-2xl z-50 transition-all duration-300 hover:border-white/15">
          <Link href="/" className="flex items-center gap-2 group">
            <AetherFlowLogo size={28} showText textSize="text-lg" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wider uppercase text-slate-300">
            <a href="#about" className="hover:text-white transition-colors duration-200">About</a>
            <a href="#workers" className="hover:text-white transition-colors duration-200">Worker Fleet</a>
            <a href="#architecture" className="hover:text-white transition-colors duration-200">Architecture</a>
            <a href="#pipeline" className="hover:text-white transition-colors duration-200">Pipeline Engine</a>
            <Link 
              href="/docs" 
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors duration-200 font-bold"
            >
              <span>Docs</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono">v2.4</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {!isLoggedIn && (
              <Link 
                href="/login" 
                className="text-xs font-semibold tracking-wider uppercase text-slate-300 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
            )}
            <Link 
              href={isLoggedIn ? "/workflow" : "/register"} 
              className="px-4 py-2 glass-button glass-button-primary text-xs font-bold tracking-wider uppercase rounded-xl transition duration-300"
            >
              {isLoggedIn ? "Go to Workspace" : "Initialize Builder"}
            </Link>
          </div>
        </header>

        {/* 2. Hero Section: Spatial Frosted Deck */}
        <section className="min-h-screen w-full flex flex-col justify-center items-center px-4 relative pt-12">
          <div className="glass-panel max-w-4xl w-full p-8 md:p-16 rounded-3xl text-center flex flex-col items-center gap-6 relative transition-all duration-500 hover:border-white/15">
            {/* Fresnel edge light simulation */}
            <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
            
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold tracking-wider uppercase text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              ENTERPRISE MULTI-TENANT ARCHITECTURE ACTIVE
            </span>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-none">
              Orchestrate Autonomous <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-slate-400">
                AI Agent Swarms
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed font-light">
              Build complex multi-agent system workflows with hybrid vector RAG, Cross-Encoder reranking, Microsoft MarkItDown ingestion, and zero-latency WebSocket telemetry.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mt-6 mb-4">
              <Link 
                href={isLoggedIn ? "/workflow" : "/register"} 
                className="w-full sm:w-auto px-8 py-4 glass-button glass-button-primary text-xs font-bold tracking-wider uppercase rounded-xl"
              >
                {isLoggedIn ? "Open Workspace" : "Launch Grid Editor"}
              </Link>
              <a 
                href="#architecture" 
                className="w-full sm:w-auto px-8 py-4 glass-button text-xs font-bold tracking-wider uppercase rounded-xl text-center"
              >
                Explore Architecture
              </a>
            </div>
          </div>
          
          {/* Scroll Down Indicator - Cleanly positioned below buttons with zero collision */}
          <div className="mt-10 sm:mt-14 flex flex-col items-center gap-2 pointer-events-none animate-bounce">
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Scroll to Dive</span>
            <div className="w-5 h-8 border border-white/20 rounded-full flex justify-center p-1">
              <div className="w-1 h-2 bg-white/60 rounded-full animate-scroll-dot" />
            </div>
          </div>
        </section>

        {/* 2.5. About Section: The Core Mission, Purpose & Architecture */}
        <section id="about" className="w-full flex flex-col justify-center items-center px-4 py-24 relative scroll-mt-20">
          <div className="max-w-5xl w-full glass-panel p-6 sm:p-14 rounded-3xl relative transition-all duration-500 hover:border-white/15 space-y-10">
            <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

            {/* Header Badge & Title */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold tracking-widest uppercase text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Platform Deep Dive
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Inside AetherFlow
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-light leading-relaxed">
                Everything you need to know about our project: what we built, why we engineered it, how it transforms daily workflows, and the mission-critical enterprise problems it solves.
              </p>
            </div>

            {/* Interactive 4-Pillar Tab Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => setAboutTab('what')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  aboutTab === 'what'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">01</span>
                <span>What is AetherFlow?</span>
              </button>

              <button
                type="button"
                onClick={() => setAboutTab('why')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  aboutTab === 'why'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-lg shadow-violet-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">02</span>
                <span>Why We Built It</span>
              </button>

              <button
                type="button"
                onClick={() => setAboutTab('how')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  aboutTab === 'how'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">03</span>
                <span>How It Is Useful</span>
              </button>

              <button
                type="button"
                onClick={() => setAboutTab('purpose')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  aboutTab === 'purpose'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">04</span>
                <span>What Purpose It Solves</span>
              </button>
            </div>

            {/* Dynamic Active Pillar Deep-Dive Container */}
            <div className="relative">
              {aboutTab === 'what' && (
                <div className="p-6 sm:p-10 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-sm font-mono">
                        01
                      </div>
                      <div>
                        <span className="text-[10px] text-cyan-400/80 uppercase tracking-widest font-mono font-semibold">The Core System Architecture</span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">What is AetherFlow?</h3>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                      Visual DAG • BullMQ • Fastify • Prisma
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                    AetherFlow is an <strong className="text-white font-semibold">Enterprise Distributed Visual Agentic Workflow & Knowledge Engine</strong>. Rather than writing fragile one-off Python scripts or static chaining functions, AetherFlow allows engineering teams to visually compose, execute, monitor, and debug multi-agent AI pipelines on an interactive topological Directed Acyclic Graph (DAG) canvas.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Visual Canvas & Runtime Plugins
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Built with React Flow on the frontend, featuring <strong className="text-slate-200">7 custom execution nodes</strong>: Generative AI Agents (Gemini & OpenAI), Guardrail self-healing validators, full-featured REST API nodes, Hybrid RAG Vector Search, isolated Python 3 / Node.js Code Sandboxes, Condition Routers, and Data Transformers.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Distributed Queue Core & Telemetry
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Powered by a high-throughput <strong className="text-slate-200">Fastify v5 TypeScript backend</strong>, distributed <strong className="text-slate-200">BullMQ workers on Redis</strong>, PostgreSQL with Prisma ORM, and zero-latency WebSocket feeds streaming real-time token counts, duration (ms), and step-by-step logs directly onto node handles.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 text-xs text-cyan-200/90 flex items-start gap-2.5">
                    <span className="text-sm font-mono text-cyan-400">⚡</span>
                    <div>
                      <strong className="font-semibold text-white">How it connects: </strong>
                      Nodes wire together with input/output handles. Intermediate data is passed seamlessly down the pipeline using dynamic variable syntax like <code className="px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 font-mono text-[11px]">&#123;&#123;node_id.output&#125;&#125;</code> or <code className="px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 font-mono text-[11px]">&#123;&#123;rag_kb.documents&#125;&#125;</code>.
                    </div>
                  </div>
                </div>
              )}

              {aboutTab === 'why' && (
                <div className="p-6 sm:p-10 rounded-2xl bg-violet-950/20 border border-violet-500/30 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-violet-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center font-bold text-sm font-mono">
                        02
                      </div>
                      <div>
                        <span className="text-[10px] text-violet-400/80 uppercase tracking-widest font-mono font-semibold">The Production Reality & Pain Points</span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">Why Did We Build This?</h3>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] font-mono text-violet-300">
                      Eliminating Brittle Scripts & Token Waste
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                    Building a quick demo with an LLM prompt takes ten minutes. But taking that agent into mission-critical enterprise production exposes four severe, systemic engineering traps that cause traditional scripts to break down:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        1. Silent Hallucinations & Broken JSON
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        LLMs are probabilistic. They will unpredictably output markdown formatting, miss required fields, or alter schema keys. In simple scripts, this causes downstream APIs and databases to crash instantly with corrupted state.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        2. The "Dumb Retry" Money Pit
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Traditional queues blindly retry failed jobs 3-5 times. When a job fails because an API key is missing or a configuration is malformed, retrying 5 times is useless—it only wastes hundreds of dollars in API tokens and clogs worker threads.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        3. Zero Observability (The Black Box)
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        When a multi-step agent fails on step 4, developers have no way to inspect what steps 1, 2, and 3 outputted. You cannot test step 4 in isolation, forcing you to restart the entire workflow from scratch every single time.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        4. The Team Security Vacuum
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Simple prototypes have no permission boundaries. Giving all developers root access to execute live financial or customer-facing agent workflows without role-based access control invites catastrophic operational mistakes.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-violet-500/[0.04] border border-violet-500/20 text-xs text-violet-200/90 flex items-start gap-2.5">
                    <span className="text-sm font-mono text-violet-400">🛡️</span>
                    <div>
                      <strong className="font-semibold text-white">Our Mission: </strong>
                      We engineered AetherFlow to eliminate these vulnerabilities by putting deterministic guardrails, fail-fast intelligence, granular security, and autonomous self-correction loops around AI agents.
                    </div>
                  </div>
                </div>
              )}

              {aboutTab === 'how' && (
                <div className="p-6 sm:p-10 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono">
                        03
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-mono font-semibold">Practical Developer Superpowers</span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">How Is It Useful?</h3>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                      Self-Correction • Surgical Runs • Telemetry
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                    AetherFlow empowers developers, AI engineers, and operations teams with practical tools that eliminate debugging friction and turn autonomous pipelines into reliable daily workhorses:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Autonomous Self-Correction (DAG Rewind)
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        When <code className="text-emerald-300 font-mono text-[11px]">GuardrailNode</code> flags invalid output (via JSON schema, regex, or LLM-as-a-Judge), it doesn't fail. It rewinds execution back to the <code className="text-emerald-300 font-mono text-[11px]">AgentNode</code> with the exact validation critique, letting the model self-correct automatically before continuing!
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Surgical Step-Level Execution Controls
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Never re-run an entire pipeline just to debug one prompt. Choose <strong className="text-slate-200">"Run Single Node"</strong> to test in isolation, or <strong className="text-slate-200">"Run Up To This Node"</strong> to execute prerequisites with cached state up to your desired breakpoint.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Fail-Fast Unrecoverable Error Detection
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        If an API key is missing or a configuration is broken, AetherFlow aborts immediately in 0ms using <code className="text-emerald-300 font-mono text-[11px]">UnrecoverableError</code>, saving token costs and directing errors to the Dead Letter Queue for instant inspection.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Hybrid Vector & Keyword RAG Knowledge Base
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Ingest PDFs, TXT, and Markdown files. Our engine combines BGE-M3 dense vector embeddings with BM25 sparse keyword matching and a Cross-Encoder reranker to deliver grounded enterprise context directly to your agent prompts.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 text-xs text-emerald-200/90 flex items-start gap-2.5">
                    <span className="text-sm font-mono text-emerald-400">📡</span>
                    <div>
                      <strong className="font-semibold text-white">Zero-Latency Observability: </strong>
                      Watch nodes transition live between QUEUED, RUNNING, COMPLETED, and REWIND states over WebSockets, with real-time millisecond duration timers, token expenditure counts, and inspectable terminal logs.
                    </div>
                  </div>
                </div>
              )}

              {aboutTab === 'purpose' && (
                <div className="p-6 sm:p-10 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm font-mono">
                        04
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-400/80 uppercase tracking-widest font-mono font-semibold">Enterprise Readiness & Infrastructure</span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">What Purpose Does It Solve?</h3>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                      Dual-Layer RBAC • Bounded DLQ • Zero OOM
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                    The ultimate purpose of AetherFlow is to <strong className="text-white font-semibold">bridge the canyon between experimental AI toys and hardened enterprise production infrastructure</strong> that IT, compliance, and DevOps teams can trust:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Dual-Layer Multi-Tenant RBAC Security
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Granular permissions for Single Users, Org Admins, and Org Members. Admins enforce global policies (<code className="text-amber-300 font-mono text-[11px]">canCreateWorkflow</code>, <code className="text-amber-300 font-mono text-[11px]">canViewDLQ</code>) and surgical per-workflow whitelists (<code className="text-amber-300 font-mono text-[11px]">canEdit</code>, <code className="text-amber-300 font-mono text-[11px]">canExecute</code>, <code className="text-amber-300 font-mono text-[11px]">canViewExecutionLogs</code>).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Bounded Dead Letter Queue (DLQ) with 3-Day TTL
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Failed executions never accumulate indefinitely to cause Redis Out-Of-Memory (OOM) crashes. Our DLQ enforces a strict <strong className="text-slate-200">3-day auto-eviction policy</strong> (max 1,000 jobs), retaining full stack traces, retry logs, and failure reasons for debugging.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Topological Cycle & Dependency Guarantees
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Our graph engine performs Kahn's algorithm cycle detection before running any workflow, guaranteeing 100% mathematical prevention of infinite execution loops while computing optimal parallel execution layers.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Horizontal Scalability & Zero UI Freezing
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">
                        By decoupling the Fastify API producer from the BullMQ background worker fleet via Redis, AetherFlow can queue thousands of concurrent multi-agent executions without dropping connections or degrading browser responsiveness.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
                    <span className="text-sm font-mono text-amber-400">🏢</span>
                    <div>
                      <strong className="font-semibold text-white">The Enterprise Bottom Line: </strong>
                      AetherFlow replaces brittle, risky AI scripts with an auditable, recoverable, and secure automation engine that companies can confidently deploy into production.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick-Switch 4-Pillar Grid Cards (Click any card to open its deep-dive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <button
                type="button"
                onClick={() => setAboutTab('what')}
                className={`text-left p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 ${
                  aboutTab === 'what'
                    ? 'bg-cyan-500/10 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase">Pillar 01</span>
                    <span className="text-[10px] text-slate-500">Architecture</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">What is AetherFlow?</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-3 font-light">
                    Distributed visual DAG canvas, Fastify backend, BullMQ worker fleet, and 7 custom node plugins.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                  {aboutTab === 'what' ? '● Active View' : 'Inspect details →'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAboutTab('why')}
                className={`text-left p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 ${
                  aboutTab === 'why'
                    ? 'bg-violet-500/10 border-2 border-violet-500/50 shadow-lg shadow-violet-500/10'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-violet-400 uppercase">Pillar 02</span>
                    <span className="text-[10px] text-slate-500">Pain Points</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Why We Built It</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-3 font-light">
                    Eliminates fragile scripts, hallucinated JSON crashes, black box debugging, and dumb retry token waste.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-violet-400 flex items-center gap-1">
                  {aboutTab === 'why' ? '● Active View' : 'Inspect details →'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAboutTab('how')}
                className={`text-left p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 ${
                  aboutTab === 'how'
                    ? 'bg-emerald-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">Pillar 03</span>
                    <span className="text-[10px] text-slate-500">Capabilities</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">How It Is Useful</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-3 font-light">
                    Autonomous Guardrail rewinds, run-up-to-this-node controls, live WebSockets, and Hybrid Vector RAG.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  {aboutTab === 'how' ? '● Active View' : 'Inspect details →'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAboutTab('purpose')}
                className={`text-left p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 ${
                  aboutTab === 'purpose'
                    ? 'bg-amber-500/10 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-amber-400 uppercase">Pillar 04</span>
                    <span className="text-[10px] text-slate-500">Enterprise</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">What Purpose It Solves</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-3 font-light">
                    Dual-layer multi-tenant RBAC, zero Redis OOM crashes via 3-day DLQ auto-eviction, and fail-fast safety.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                  {aboutTab === 'purpose' ? '● Active View' : 'Inspect details →'}
                </span>
              </button>
            </div>

            {/* Architecture Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/5 text-center">
              <div>
                <div className="text-2xl font-black text-cyan-300 font-mono">0ms</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Fail-Fast Abort Latency</div>
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">3 Days</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Redis DLQ Retention TTL</div>
              </div>
              <div>
                <div className="text-2xl font-black text-violet-300 font-mono">100%</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Topological Cycle Safety</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-300 font-mono">7 Plugins</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Custom Execution Nodes</div>
              </div>
            </div>

          </div>
        </section>

        {/* 3. Distributed BullMQ Worker Fleet & Runtime Engine */}
        <section id="workers" className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-24 relative scroll-mt-20">
          <div className="max-w-5xl w-full space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] font-bold tracking-widest uppercase text-violet-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                BullMQ Distributed Runtime
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Enterprise Background Worker Fleet
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                Inspect how AetherFlow background workers pull DAG jobs from Redis, execute steps in parallel topological layers, checkpoint intermediate outputs in PostgreSQL, and stream millisecond telemetry over WebSockets.
              </p>
            </div>

            {/* 3 Active Worker Threads in Production Simulation */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Worker Thread 1: RagNode Active */}
              <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col justify-between gap-6 relative group hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-300">worker-bullmq-01</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                      ACTIVE (24ms)
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-1">RagNode: Hybrid Retrieval</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      Extracts embeddings with BAAI/bge-m3, runs BM25 sparse matching against the vector store, and scores top chunks with AI cross-encoders.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Prisma Checkpoint:</span>
                      <span className="text-emerald-400 font-bold">CACHED (Safe)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Rerank Score:</span>
                      <span className="text-white">0.942 (3 chunks)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Queue: workflow-default</span>
                  <span className="text-cyan-400">Idempotent</span>
                </div>
              </div>

              {/* Worker Thread 2: Guardrail Autonomous Rewind */}
              <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col justify-between gap-6 relative group hover:border-violet-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-violet-300">worker-bullmq-02</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-[9px] font-bold uppercase tracking-wider text-violet-300">
                      REWIND / HEALING
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-1">GuardrailNode: DAG Rewind</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      Catches missing required JSON property <code className="text-violet-300 font-mono text-[11px]">&apos;vat_rate&apos;</code>. Dynamically rewinds the execution graph back to AgentNode with self-correction instructions.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Loop Attempt:</span>
                      <span className="text-violet-300 font-bold">1 of 3 (Safe)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cycle Guard:</span>
                      <span className="text-white">Kahn Algorithm OK</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Self-Healing Loop</span>
                  <span className="text-violet-400">Rewinding</span>
                </div>
              </div>

              {/* Worker Thread 3: Fail-Fast DLQ Sentinel */}
              <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col justify-between gap-6 relative group hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-300">worker-bullmq-03</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                      DLQ ROUTED (0ms)
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-1">ApiNode: Fail-Fast Sentinel</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      Missing ERP secret token throws <code className="text-amber-300 font-mono text-[11px]">UnrecoverableError</code>. Aborts immediately in 0ms without wasting retry budgets, routing full error logs to DLQ.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Wasted Retries:</span>
                      <span className="text-emerald-400 font-bold">0 (Token Safe)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Redis Eviction TTL:</span>
                      <span className="text-white">3 Days (Max 1,000)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Dead Letter Queue</span>
                  <span className="text-amber-400">Zero OOM Risk</span>
                </div>
              </div>
            </div>

            {/* Architecture Guarantees Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Topological Concurrency
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  Kahn&apos;s algorithm evaluates graph dependencies and executes non-conflicting node branches in parallel layers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Checkpoint Resumption
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  Outputs are cached per node. Paused or failed pipelines resume directly without repeating expensive AI prompts.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Fail-Fast 0ms Abort
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  Missing API keys or schema errors bypass useless retry loops, stopping token waste and freeing threads instantly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Bounded 3-Day DLQ
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  Strict 72-hour TTL auto-eviction prunes dead executions, ensuring Redis memory stays bounded and safe from OOM.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive 7-Layer Architecture Blueprint */}
        <section id="architecture" className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-24 relative scroll-mt-20">
          <InteractiveArchitectureMap />
        </section>

        {/* 5. Autonomous Guardrail Self-Correction Pipeline Simulator */}
        <section id="pipeline" className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-24 relative scroll-mt-20">
          <div className="max-w-5xl w-full glass-panel p-6 sm:p-12 rounded-3xl relative space-y-8">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/5">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  Autonomous Execution Simulator
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Guardrail Self-Correction Pipeline
                </h3>
                <p className="text-xs text-slate-400 font-light">
                  Click any node to inspect runtime state, template data, and observe how GuardrailNode rewinds execution on failure.
                </p>
              </div>

              {/* Simulation Trigger Switch */}
              <button
                type="button"
                onClick={() => setSimulateRewind(!simulateRewind)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-300 flex items-center gap-2.5 self-start sm:self-auto cursor-pointer ${
                  simulateRewind 
                    ? 'bg-violet-500/25 border border-violet-500/50 text-violet-200 shadow-lg shadow-violet-500/20' 
                    : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${simulateRewind ? 'bg-violet-400 animate-ping' : 'bg-slate-500'}`} />
                <span>{simulateRewind ? 'Simulating: Guardrail Rewind Active' : 'Test: Simulate Guardrail Rewind'}</span>
              </button>
            </div>

            {/* Interactive 4-Node Pipeline Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Stage 1: RagNode */}
              <button
                type="button"
                onClick={() => setSelectedPipelineStage(0)}
                className={`p-5 rounded-2xl text-left transition-all duration-300 relative flex flex-col justify-between gap-4 cursor-pointer ${
                  selectedPipelineStage === 0
                    ? 'bg-cyan-500/10 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/15'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold">STAGE 01</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                      COMPLETED
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">RagNode</h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    Ingests query & vectors corporate knowledge chunks.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                  Output: <code className="text-cyan-300">&#123;&#123;rag_01.chunks&#125;&#125;</code>
                </div>
              </button>

              {/* Stage 2: AgentNode */}
              <button
                type="button"
                onClick={() => setSelectedPipelineStage(1)}
                className={`p-5 rounded-2xl text-left transition-all duration-300 relative flex flex-col justify-between gap-4 cursor-pointer ${
                  selectedPipelineStage === 1
                    ? 'bg-violet-500/10 border-2 border-violet-500/50 shadow-lg shadow-violet-500/15'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-violet-400 font-semibold">STAGE 02</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      simulateRewind
                        ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300 animate-pulse'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {simulateRewind ? 'SELF-CORRECTING' : 'COMPLETED'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">AgentNode</h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    Gemini / GPT prompt reasoning with injected RAG facts.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                  Output: <code className="text-violet-300">&#123;&#123;agent_01.output&#125;&#125;</code>
                </div>
              </button>

              {/* Stage 3: GuardrailNode */}
              <button
                type="button"
                onClick={() => setSelectedPipelineStage(2)}
                className={`p-5 rounded-2xl text-left transition-all duration-300 relative flex flex-col justify-between gap-4 cursor-pointer ${
                  selectedPipelineStage === 2
                    ? 'bg-amber-500/10 border-2 border-amber-500/50 shadow-lg shadow-amber-500/15'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-semibold">STAGE 03</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      simulateRewind
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-ping'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {simulateRewind ? 'REWIND TRIGGERED' : 'VALIDATED'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">GuardrailNode</h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    Validates schema & triggers DAG rewind if output is invalid.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                  Output: <code className="text-amber-300">&#123;&#123;guardrail_01.output&#125;&#125;</code>
                </div>
              </button>

              {/* Stage 4: ApiNode */}
              <button
                type="button"
                onClick={() => setSelectedPipelineStage(3)}
                className={`p-5 rounded-2xl text-left transition-all duration-300 relative flex flex-col justify-between gap-4 cursor-pointer ${
                  selectedPipelineStage === 3
                    ? 'bg-emerald-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/15'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">STAGE 04</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      simulateRewind
                        ? 'bg-slate-500/10 border border-slate-500/30 text-slate-400'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {simulateRewind ? 'WAITING' : '201 CREATED'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">ApiNode</h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    Submits verified payload to external ERP with Bearer auth.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                  Response: <code className="text-emerald-300">&#123;&#123;api_erp.response&#125;&#125;</code>
                </div>
              </button>
            </div>

            {/* Rewind Feedback Banner if simulation is active */}
            {simulateRewind && (
              <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-500/40 text-xs text-violet-200 flex items-start gap-3 animate-in fade-in duration-300">
                <span className="text-base text-violet-400">↺</span>
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>Autonomous Self-Correction Loop Triggered</span>
                    <span className="px-2 py-0.2 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-mono">Attempt 1/3</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    GuardrailNode detected missing required property <code className="text-violet-300 font-mono">&apos;invoice_id&apos;</code> in LLM output. Instead of failing the workflow, the engine halted Stage 4, passed the diagnostic error back to AgentNode, and prompted Gemini to fix the schema in real time.
                  </p>
                </div>
              </div>
            )}

            {/* Selected Node Telemetry & Configuration Terminal */}
            <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Stage {selectedPipelineStage + 1} Inspector: {
                      ['RagNode (Knowledge Retrieval)', 'AgentNode (Generative AI)', 'GuardrailNode (Validator & Rewind)', 'ApiNode (REST Enterprise Sync)'][selectedPipelineStage]
                    }
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Live WebSocket Feed</span>
              </div>

              {selectedPipelineStage === 0 && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-slate-400">Query: <span className="text-cyan-300">&quot;Extract quarterly enterprise subscription invoice line items&quot;</span></div>
                  <div className="text-slate-400">Vector Store: <span className="text-white">PostgreSQL pgvector / BGE-M3 Dense + BM25 Sparse</span></div>
                  <div className="text-slate-400">Reranker: <span className="text-emerald-400">Cross-Encoder (Top-3 Chunks Selected, 24ms)</span></div>
                  <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] text-slate-300">
                    &quot;Contract #8892: Billed annually at $12,400. Due on Oct 1. Vendor: Acme Cloud ERP.&quot;
                  </div>
                </div>
              )}

              {selectedPipelineStage === 1 && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-slate-400">Model Engine: <span className="text-violet-300">Google Gemini 1.5 Flash (Temperature: 0.1)</span></div>
                  <div className="text-slate-400">Prompt Context: <span className="text-white">System Prompt + &#123;&#123;rag_01.chunks&#125;&#125;</span></div>
                  <div className="text-slate-400">Token Cost: <span className="text-emerald-400">312 tokens (142ms execution)</span></div>
                  <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] text-slate-300 overflow-x-auto">
                    {simulateRewind ? (
                      <span className="text-violet-300">
                        &#123; &quot;status&quot;: &quot;RE-EVALUATING&quot;, &quot;critique_applied&quot;: &quot;Added missing invoice_id property per Guardrail feedback&quot;, &quot;vendor&quot;: &quot;Acme Cloud ERP&quot;, &quot;invoice_id&quot;: &quot;INV-2026-8892&quot;, &quot;amount&quot;: 12400 &#125;
                      </span>
                    ) : (
                      <span className="text-slate-300">
                        &#123; &quot;vendor&quot;: &quot;Acme Cloud ERP&quot;, &quot;invoice_id&quot;: &quot;INV-2026-8892&quot;, &quot;amount&quot;: 12400, &quot;currency&quot;: &quot;USD&quot; &#125;
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedPipelineStage === 2 && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-slate-400">Validation Mode: <span className="text-amber-300">Strict JSON Schema + LLM-as-a-Judge</span></div>
                  <div className="text-slate-400">Rewind Target: <span className="text-white">AgentNode (Stage 02)</span></div>
                  <div className="text-slate-400">Loop Policy: <span className="text-emerald-400">Max 3 automated rewinds before DLQ</span></div>
                  <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px]">
                    {simulateRewind ? (
                      <span className="text-rose-400 font-bold">
                        [GUARDRAIL REWIND] Error: Schema validation failed. Required key &apos;invoice_id&apos; missing. Sending diagnostic feedback to AgentNode...
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">
                        [GUARDRAIL PASSED] JSON Schema verified 100%. 0 hallucinations detected. Emitting proceed signal to ApiNode.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedPipelineStage === 3 && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-slate-400">Target Endpoint: <span className="text-emerald-300">POST https://api.erp.company.com/v1/invoices</span></div>
                  <div className="text-slate-400">Authorization: <span className="text-white">Bearer &#123;&#123;credentials.ERP_SECRET_TOKEN&#125;&#125;</span></div>
                  <div className="text-slate-400">Payload Source: <span className="text-cyan-300">&#123;&#123;guardrail_01.output&#125;&#125;</span></div>
                  <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] text-slate-300">
                    {simulateRewind ? (
                      <span className="text-slate-500">Waiting for Stage 02 self-correction cycle to finish before dispatching request...</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">HTTP 201 Created • Invoice recorded in ERP ledger • Job completed in 223ms total</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. Premium Glass CTA Footer */}
        <section className="min-h-[60vh] w-full flex flex-col justify-center items-center px-4 py-16 relative">
          <div className="glass-panel max-w-3xl w-full p-10 md:p-16 rounded-3xl text-center flex flex-col items-center gap-6 relative">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
              Deploy Your First Swarm
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-md leading-relaxed font-light">
              Connect AetherFlow to your local runtime worker and begin visual workflow execution.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 w-full sm:w-auto">
              <Link 
                href={isLoggedIn ? "/workflow" : "/register"} 
                className="w-full sm:w-auto px-8 py-3.5 glass-button glass-button-primary text-xs font-bold tracking-wider uppercase rounded-xl"
              >
                {isLoggedIn ? "Open Workspace" : "Get Started Free"}
              </Link>
              <Link 
                href={isLoggedIn ? "/workflow" : "/login"} 
                className="w-full sm:w-auto px-8 py-3.5 glass-button text-xs font-bold tracking-wider uppercase rounded-xl"
              >
                {isLoggedIn ? "Access Workspace" : "Access Tenant Portal"}
              </Link>
            </div>
          </div>
        </section>

        {/* Space Layout Footer */}
        <footer className="w-full max-w-5xl mx-auto py-12 px-6 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 text-slate-500 text-xs gap-4 z-10">
          <p>© 2026 AetherFlow. Built with Fastify, ReactFlow, and BullMQ.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Telemetry Specs</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Console Logs</a>
          </div>
        </footer>

      </div>
    </div>
  );
}
