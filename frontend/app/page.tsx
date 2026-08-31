// frontend/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ScrollCanvasBackground from '@/components/ScrollCanvasBackground';
import InteractiveArchitectureMap from '@/components/InteractiveArchitectureMap';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        <header className="sticky top-4 w-[calc(100%-2rem)] max-w-5xl mx-4 py-4 px-6 mt-4 flex items-center justify-between glass-panel rounded-2xl z-50 transition-all duration-300 hover:border-white/15">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              FlowAgent
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-slate-300">
            <a href="#swarm" className="hover:text-white transition-colors duration-200">Swarm Grid</a>
            <a href="#architecture" className="hover:text-white transition-colors duration-200">Architecture</a>
            <a href="#pipeline" className="hover:text-white transition-colors duration-200">Core Engine</a>
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
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mt-4">
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
          
          {/* Scroll Down Indicator */}
          <div className="absolute bottom-10 flex flex-col items-center gap-2 pointer-events-none animate-bounce">
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Scroll to Dive</span>
            <div className="w-5 h-8 border border-white/20 rounded-full flex justify-center p-1">
              <div className="w-1 h-2 bg-white/60 rounded-full animate-scroll-dot" />
            </div>
          </div>
        </section>

        {/* 3. Distributed Agent Swarm Deck */}
        <section id="swarm" className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-24 relative">
          <div className="max-w-5xl w-full">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Autonomous Worker Clusters
              </h2>
              <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                Observe individual cognitive agents executing background tasks. Hover over a node to analyze its spatial telemetric overlay.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Agent Card 1 */}
              <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-400">Agent: RAG-01</span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 animate-ping" />
                    RUNNING
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Hybrid RAG & Cross-Encoder</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    Retrieves dense vectors via BAAI/bge-m3, executes Reciprocal Rank Fusion, and reranks chunks with AI cross-encoders.
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Cycle rate: 420ms</span>
                  <span>Precision: 99.1%</span>
                </div>
              </div>

              {/* Agent Card 2 */}
              <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-400">Agent: Mind-04</span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                    <span className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse" />
                    EVALUATING
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Cognitive DAG Orchestrator</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    Applies topological sorting, detects execution cycles, and executes sub-graphs with resume-from-failure replaying.
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Confidence: 99.4%</span>
                  <span>Concurrency: 10</span>
                </div>
              </div>

              {/* Agent Card 3 */}
              <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-400">Agent: Sync-09</span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                    <span className="h-1 w-1 rounded-full bg-amber-400" />
                    LISTENING
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Security & Telemetry Sentinel</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    Manages tenant AES-256 encrypted credentials and streams real-time Redis Pub/Sub telemetry events over WebSockets.
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>TLS: AES-256</span>
                  <span>WS Latency: 3ms</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive 7-Layer Architecture Blueprint */}
        <section id="architecture" className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-24 relative scroll-mt-20">
          <InteractiveArchitectureMap />
        </section>

        {/* 5. Spatial Workflow Pipeline simulator */}
        <section id="pipeline" className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-24 relative">
          <div className="max-w-4xl w-full glass-panel p-8 md:p-12 rounded-3xl relative">
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="text-center mb-12">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Interactive Map</span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Swarm Execution Pipeline</h3>
            </div>

            {/* Pipeline Glass node maps */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
              {/* Node 1 */}
              <div className="glass-panel p-5 rounded-xl text-center w-full md:w-48 relative z-10">
                <span className="text-[9px] font-bold text-slate-500 block uppercase mb-1">Webhook</span>
                <h4 className="text-xs font-bold text-white">Trigger Entry</h4>
                <div className="mt-3 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Connecting line */}
              <div className="h-8 md:h-[2px] w-[2px] md:w-full bg-gradient-to-b md:bg-gradient-to-r from-white/30 to-white/10 relative">
                <div className="absolute top-0 md:top-auto md:left-0 h-1.5 w-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
              </div>

              {/* Node 2 */}
              <div className="glass-panel-deep p-5 rounded-xl text-center w-full md:w-48 relative z-10 border-white/20">
                <span className="text-[9px] font-bold text-indigo-400 block uppercase mb-1">LLM Swarm</span>
                <h4 className="text-xs font-bold text-white">Cognitive Filter</h4>
                <div className="mt-3 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                </div>
              </div>

              {/* Connecting line */}
              <div className="h-8 md:h-[2px] w-[2px] md:w-full bg-gradient-to-b md:bg-gradient-to-r from-white/10 to-white/30 relative">
                <div className="absolute top-0 md:top-auto md:left-0 h-1.5 w-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '1.2s' }} />
              </div>

              {/* Node 3 */}
              <div className="glass-panel p-5 rounded-xl text-center w-full md:w-48 relative z-10">
                <span className="text-[9px] font-bold text-slate-500 block uppercase mb-1">Database</span>
                <h4 className="text-xs font-bold text-white">Append Record</h4>
                <div className="mt-3 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>
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
              Connect FlowAgent to your local runtime worker and begin visual workflow execution.
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
          <p>© 2026 FlowAgent. Built with Fastify, ReactFlow, and BullMQ.</p>
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
