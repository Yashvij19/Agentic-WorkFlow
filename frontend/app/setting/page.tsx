// frontend/app/setting/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AetherFlowLogo from '@/components/AetherFlowLogo';

// Import our modular settings portal sub-components
import CredentialsPortal from '@/components/settings/CredentialsPortal';
import TokenGenerationPortal from '@/components/settings/TokenGenerationPortal';
import RequestApprovalPortal from '@/components/settings/RequestApprovalPortal';
import UserListPortal from '@/components/settings/UserListPortal';
import { PageTransitionLoader } from '@/components/PageTransitionLoader';

export default function SettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tracks active detailed portal view for admins (null = show grid overview)
  const [activePortal, setActivePortal] = useState<'requests' | 'tokens' | 'users' | 'credentials' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setRole(user.role);

      // Members cannot access settings, redirect them immediately
      if (user.role === 'MEMBER') {
        router.push('/workflow');
        return;
      }
    } catch (err) {
      console.error('Failed to parse user details', err);
      router.push('/login');
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030617] flex items-center justify-center">
        <PageTransitionLoader text="SETTINGS" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030617] text-[#F5F7FF] font-sans selection:bg-[#8B5CF6]/30 selection:text-white pb-20 relative overflow-x-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Navbar */}
      <nav className="border-b border-white/[0.05] bg-[#030617]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/workflow" className="flex items-center gap-2 group">
              <AetherFlowLogo size={26} showText textSize="text-base" />
            </Link>
            <span className="text-white/25 text-xs font-light">/</span>
            <span className="text-[#98A4C2] text-xs font-medium uppercase tracking-wider">
              {role === 'ADMIN' ? 'Organization Portal' : 'Credentials Setup'}
            </span>
          </div>
          <Link 
            href="/workflow" 
            className="glass-button px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-white border border-white/10 hover:bg-white/[0.04] transition duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Settings Body */}
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* CASE 1: SINGLE / PERSONAL USER (Only show credentials portal directly) */}
        {role === 'SINGLE' && (
          <CredentialsPortal showBackButton={false} />
        )}

        {/* CASE 2: ADMIN USER */}
        {role === 'ADMIN' && (
          <>
            {/* Sub-Portal Detail View */}
            {activePortal === 'requests' && (
              <RequestApprovalPortal onBack={() => setActivePortal(null)} />
            )}

            {activePortal === 'tokens' && (
              <TokenGenerationPortal onBack={() => setActivePortal(null)} />
            )}

            {activePortal === 'users' && (
              <UserListPortal onBack={() => setActivePortal(null)} />
            )}

            {activePortal === 'credentials' && (
              <CredentialsPortal onBack={() => setActivePortal(null)} showBackButton={true} />
            )}

            {/* Admin Hub Grid Overview (Show if activePortal is null) */}
            {activePortal === null && (
              <div className="space-y-10">
                {/* Hub Header */}
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Organization Settings</h1>
                  <p className="text-slate-400 text-xs mt-1.5 font-light">Central dashboard to manage permissions, user requests, signup tokens, and credentials.</p>
                </div>

                {/* 2x2 Glass Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card 1: Registration Approvals */}
                  <div className="bg-[#080D1D] hover:bg-[#0d142d] border border-white/[0.06] hover:border-[#8B5CF6]/30 p-6 md:p-8 rounded-2xl shadow-lg relative group transition-[border-color,background-color] duration-300 flex flex-col justify-between items-start min-h-[220px]">
                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    
                    <div className="space-y-4">
                      {/* Top left flat icon container */}
                      <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      
                      <div className="space-y-1.5 text-left">
                        <h3 className="text-base font-bold text-white group-hover:text-violet-400 transition-colors duration-200">Teammate Approvals</h3>
                        <p className="text-slate-400 text-xs font-light leading-relaxed">Approve or deny membership requests from new registrants joining via tokens.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-white/[0.04]">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20 shadow-sm">
                        Pending Queue
                      </span>
                      <button
                        onClick={() => setActivePortal('requests')}
                        className="px-3.5 py-2 text-[10px] font-bold tracking-wider uppercase text-white bg-white/[0.03] hover:bg-violet-600 border border-white/10 hover:border-violet-500 rounded-xl transition duration-200 cursor-pointer shadow-sm"
                      >
                        Manage Requests
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Invite Tokens */}
                  <div className="bg-[#080D1D] hover:bg-[#0d142d] border border-white/[0.06] hover:border-[#8B5CF6]/30 p-6 md:p-8 rounded-2xl shadow-lg relative group transition-[border-color,background-color] duration-300 flex flex-col justify-between items-start min-h-[220px]">
                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 11-4 0 2 2 0 014 0zM12 14a5 5 0 00-5 5h10a5 5 0 00-5-5z" />
                        </svg>
                      </div>
                      
                      <div className="space-y-1.5 text-left">
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors duration-200">Invitation Codes</h3>
                        <p className="text-slate-400 text-xs font-light leading-relaxed">Generate temporary, custom sign-up keys to securely onboard new team members.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-white/[0.04]">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm">
                        Onboard Team
                      </span>
                      <button
                        onClick={() => setActivePortal('tokens')}
                        className="px-3.5 py-2 text-[10px] font-bold tracking-wider uppercase text-white bg-white/[0.03] hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 rounded-xl transition duration-200 cursor-pointer shadow-sm"
                      >
                        Manage Tokens
                      </button>
                    </div>
                  </div>

                  {/* Card 3: User Permissions */}
                  <div className="bg-[#080D1D] hover:bg-[#0d142d] border border-white/[0.06] hover:border-[#8B5CF6]/30 p-6 md:p-8 rounded-2xl shadow-lg relative group transition-[border-color,background-color] duration-300 flex flex-col justify-between items-start min-h-[220px]">
                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      
                      <div className="space-y-1.5 text-left">
                        <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors duration-200">User Permissions</h3>
                        <p className="text-slate-400 text-xs font-light leading-relaxed">Administer granular permission switches and whitelist individual workflows.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-white/[0.04]">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm">
                        Access Control
                      </span>
                      <button
                        onClick={() => setActivePortal('users')}
                        className="px-3.5 py-2 text-[10px] font-bold tracking-wider uppercase text-white bg-white/[0.03] hover:bg-purple-600 border border-white/10 hover:border-purple-500 rounded-xl transition duration-200 cursor-pointer shadow-sm"
                      >
                        Configure Access
                      </button>
                    </div>
                  </div>

                  {/* Card 4: API Credentials */}
                  <div className="bg-[#080D1D] hover:bg-[#0d142d] border border-white/[0.06] hover:border-[#8B5CF6]/30 p-6 md:p-8 rounded-2xl shadow-lg relative group transition-[border-color,background-color] duration-300 flex flex-col justify-between items-start min-h-[220px]">
                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      
                      <div className="space-y-1.5 text-left">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors duration-200">API Credentials</h3>
                        <p className="text-slate-400 text-xs font-light leading-relaxed">Configure provider API keys to drive Gemini models within agent workflows.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-white/[0.04]">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-sm">
                        LLM API Keys
                      </span>
                      <button
                        onClick={() => setActivePortal('credentials')}
                        className="px-3.5 py-2 text-[10px] font-bold tracking-wider uppercase text-white bg-white/[0.03] hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 rounded-xl transition duration-200 cursor-pointer shadow-sm"
                      >
                        Configure Keys
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
