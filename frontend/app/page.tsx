// frontend/app/page.tsx
'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Decorative Radial glow behind hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent">
            FlowAgent
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-medium rounded-lg shadow-lg shadow-purple-500/20 transition duration-300"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-6">
          ✨ Empowering Next-Gen Automations
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-none">
          Build & Orchestrate <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Autonomous AI Workers
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Design multi-agent system workflows using a visual drag-and-drop canvas. Chain triggers, state machines, and LLMs with secure token handling.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/register" 
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-base font-semibold rounded-xl shadow-xl shadow-purple-500/25 transition duration-300"
          >
            Launch Builder
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 border border-white/10 hover:bg-slate-800 text-base font-semibold rounded-xl transition"
          >
            Watch Demo
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <h2 className="text-center text-3xl font-bold mb-16 text-slate-200">
          Everything you need to orchestrate agent networks
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm hover:border-purple-500/30 transition duration-300">
            <span className="text-4xl block mb-6">⚡</span>
            <h3 className="text-xl font-bold mb-3 text-slate-100">Dynamic Trigger System</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Start pipelines from REST APIs, webhooks, or scheduled triggers. Hydrate subsequent nodes dynamically.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm hover:border-purple-500/30 transition duration-300">
            <span className="text-4xl block mb-6">🧠</span>
            <h3 className="text-xl font-bold mb-3 text-slate-100">LLM Prompt Chaining</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Use Gemini, OpenAI, or custom models. Safely store and decrypt tenant API keys to orchestrate cognitive loops.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm hover:border-purple-500/30 transition duration-300">
            <span className="text-4xl block mb-6">📊</span>
            <h3 className="text-xl font-bold mb-3 text-slate-100">Real-Time Telemetry</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Track token usage, response execution duration, node states, and failed retries live via secure WebSocket channels.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm">
        <p>© 2026 FlowAgent. Built with Fastify, ReactFlow, and BullMQ.</p>
      </footer>
    </div>
  );
}
