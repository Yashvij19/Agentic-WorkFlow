// frontend/components/canvas/NodePalette.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface NodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NodePalette({
  isOpen,
  onClose,
}: NodePaletteProps) {
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          setUserRole(parsed.role);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="h-full bg-[#030617] border-r border-white/[0.05] p-5 flex flex-col justify-between transition-all duration-300 relative z-30 w-64 select-none">
      {/* Visual Glass Highlight on Sidebar Edge */}
      <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />

      {/* 1. BRAND AREA (Fixed Header) */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Premium SVG Logo Icon inside rounded square */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-600/20">
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight text-white select-none">
            FlowAgent
          </span>
        </div>

        {/* Close Sidebar Trigger (completely closes to hamburger overlay) */}
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-white/[0.04] rounded-lg text-slate-500 hover:text-white transition cursor-pointer"
          title="Close Navigation Panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 2. SCROLLABLE MIDDLE CONTENT (Workspace Links + Draggable Node Palette) */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-6 transparent-scrollbar pr-1">
        {/* PRIMARY NAVIGATION GROUP */}
        <div className="space-y-1">
          <span className="block text-[9px] font-bold tracking-widest text-[#687493] uppercase mb-3 pl-2">
            Workspace
          </span>

          {/* Workflows Link */}
          <Link 
            href="/workflow"
            className="flex items-center gap-3 py-2.5 rounded-xl text-xs transition duration-200 cursor-pointer px-3 bg-white/[0.04] text-[#F5F7FF] font-semibold border border-white/5 shadow-sm text-slate-300 hover:text-white hover:bg-white/[0.02]"
            title="Workflows Dashboard"
          >
            <svg className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9" />
            </svg>
            <span>Dashboard</span>
          </Link>

          {/* Settings Link */}
          {userRole && userRole !== 'MEMBER' && (
            <Link 
              href="/setting"
              className="flex items-center gap-3 py-2.5 rounded-xl text-xs transition duration-200 cursor-pointer px-3 text-[#98A4C2] hover:text-white hover:bg-white/[0.02]"
              title={userRole === 'ADMIN' ? 'Organization Settings' : 'Credentials Setup'}
            >
              <svg className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.005.831a1.125 1.125 0 01.26 1.43l-1.297 2.247a1.125 1.125 0 01-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.831a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869L9.59 3.94z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{userRole === 'ADMIN' ? 'Settings' : 'Credentials'}</span>
            </Link>
          )}
        </div>

        {/* 3. DYNAMIC DRAGGABLE PALETTE ITEMS */}
        <div className="space-y-3">
          <span className="block text-[9px] font-bold tracking-widest text-[#687493] uppercase pl-2">
            Node Palette
          </span>

          <div className="flex flex-col gap-2.5">
            {/* Trigger Node Draggability */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, 'input')}
              className="flex items-center gap-3 p-3 bg-black/40 border border-purple-500/10 hover:border-purple-500/35 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
              title="Drag Webhook Trigger Node"
            >
              <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <div className="text-left leading-tight">
                <h4 className="text-[11px] font-bold text-slate-200">Webhook Trigger</h4>
                <p className="text-[9px] text-[#687493] font-light">Pipeline trigger node</p>
              </div>
            </div>

            {/* AI Agent Node Draggability */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, 'agent')}
              className="flex items-center gap-3 p-3 bg-black/40 border border-indigo-500/10 hover:border-indigo-500/35 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
              title="Drag AI Agent Node"
            >
              <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 00-6-6H3a6 6 0 006 6v3a6 6 0 006-6v-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25a6 6 0 016 6h3a6 6 0 01-6 6v-3a6 6 0 01-6-6v3z" />
              </svg>
              <div className="text-left leading-tight">
                <h4 className="text-[11px] font-bold text-slate-200">AI Agent</h4>
                <p className="text-[9px] text-[#687493] font-light">Gemini cognitive unit</p>
              </div>
            </div>

            {/* RAG Knowledge Node Draggability */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, 'rag_query')}
              className="flex items-center gap-3 p-3 bg-black/40 border border-violet-500/10 hover:border-violet-500/35 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
              title="Drag RAG Knowledge Search Node"
            >
              <svg className="w-5 h-5 text-violet-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <div className="text-left leading-tight">
                <h4 className="text-[11px] font-bold text-slate-200">Knowledge RAG</h4>
                <p className="text-[9px] text-[#687493] font-light">Vector & keyword retrieval</p>
              </div>
            </div>

            {/* API Request Node Draggability */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, 'api')}
              className="flex items-center gap-3 p-3 bg-black/40 border border-amber-500/10 hover:border-amber-500/35 rounded-xl cursor-grab active:cursor-grabbing transition duration-200"
              title="Drag API Connector Node"
            >
              <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-.554-8.243-1.418M12 10.5a11.95 11.95 0 008.244-3.336M12 10.5a11.95 11.95 0 01-8.244-3.336" />
              </svg>
              <div className="text-left leading-tight">
                <h4 className="text-[11px] font-bold text-slate-200">API Connector</h4>
                <p className="text-[9px] text-[#687493] font-light">Query REST endpoints</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. USER PROFILE (Fixed Footer) */}
      <div className="pt-4 border-t border-white/[0.04] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Avatar Circle */}
            <div className="w-7 h-7 rounded-full bg-indigo-900 border border-indigo-700/50 flex items-center justify-center text-[10px] font-bold tracking-wider text-indigo-300">
              FA
            </div>
            <div className="text-left leading-tight">
              <span className="block text-xs font-semibold text-slate-300">Developer</span>
              <span className="block text-[9px] text-[#687493]">admin@workspace.com</span>
            </div>
          </div>
          
          {/* Sign Out Action */}
          <button 
            onClick={handleLogout}
            className="p-1 hover:bg-red-950/20 text-[#687493] hover:text-[#EF4444] rounded-lg transition cursor-pointer"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
