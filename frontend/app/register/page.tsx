// frontend/app/register/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AutoCanvasVisual from '@/components/AutoCanvasVisual';
import PasswordRequirements from '@/components/PasswordRequirements';
import { getPasswordValidationState } from '@/utils/validation';
import { API_URL } from '@/utils/config';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export default function RegisterPage() {
  const router = useRouter();

  // Multi-step & Registration States
  const [step, setStep] = useState(1);
  const [registrationType, setRegistrationType] = useState<'SINGLE' | 'ORGANIZATION' | null>(null);
  const [orgRole, setOrgRole] = useState<'ADMIN' | 'MEMBER' | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [address, setAddress] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  // Status States
  const [loading, setLoading] = useState(false);
  const [pendingRequestInfo, setPendingRequestInfo] = useState<{
    requestId: string;
    expiresAt: string;
  } | null>(null);

  // Custom Toast State
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success'
  });

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((t) => ({ ...t, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({
      show: true,
      message,
      type
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const passValidation = getPasswordValidationState(password);
    if (!passValidation.isValid) {
      showToast(passValidation.errorMessage || 'Please meet all password requirements.', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email,
        password,
        registrationType,
        orgRole: registrationType === 'ORGANIZATION' ? orgRole : undefined,
        orgName: registrationType === 'ORGANIZATION' && orgRole === 'ADMIN' ? orgName : undefined,
        address: registrationType === 'ORGANIZATION' && orgRole === 'ADMIN' ? address : undefined,
        inviteToken: registrationType === 'ORGANIZATION' && orgRole === 'MEMBER' ? inviteToken : undefined,
      };

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Check if registration went to pending request list (Team Member flow)
      if (data.status === 'PENDING') {
        showToast("Token verified! Awaiting Admin approval.", "success");
        setPendingRequestInfo({
          requestId: data.requestId,
          expiresAt: data.expiresAt
        });
        return;
      }

      // Approved registrations (SINGLE & ADMIN) - store credentials & login
      showToast("Registration successful! Logging in...", "success");
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => {
        router.push('/workflow');
      }, 1500);

    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 md:p-12 relative overflow-x-hidden font-sans">
      {/* Soft energy gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Glassmorphic Toast Notifications */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] transition-all duration-300 transform scale-100 opacity-100">
          <div className={`backdrop-blur-md border px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-3 text-white transition duration-300 ${
            toast.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5' 
              : 'bg-red-500/10 border-red-500/20 shadow-red-500/5'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(t => ({ ...t, show: false }))} 
              className="ml-3 text-white/40 hover:text-white/80 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Home Link */}
      <Link 
        href="/" 
        className="fixed top-6 right-6 z-50 glass-button px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-white"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Home
      </Link>

      <div className="w-full max-w-5xl grid md:grid-cols-[43%_57%] gap-8 items-stretch relative z-10">
        
        {/* Left Side: Cinematic AI Visual */}
        <div className="w-full h-44 md:h-auto md:flex">
          <AutoCanvasVisual />
        </div>

        {/* Right Side: Step Forms */}
        <div className="flex flex-col justify-center items-center py-4 px-1 md:px-6">
          <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            
            {/* PENDING APPROVAL SCREEN STATE (For Team Members) */}
            {pendingRequestInfo ? (
              <div className="space-y-6 text-center py-4">
                <div className="flex justify-center mb-2">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Join Request Submitted</h2>
                  <p className="text-slate-400 text-xs mt-2 font-light">Your invite token is verified. Your registration is now pending Admin approval.</p>
                </div>

                <div className="bg-black/35 rounded-xl border border-white/[0.04] p-4 text-left space-y-3.5">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Approval Request ID</span>
                    <pre className="text-xs font-mono text-indigo-400 bg-black/45 p-2.5 rounded-lg border border-white/[0.03] break-all select-all">
                      {pendingRequestInfo.requestId}
                    </pre>
                  </div>
                  <div className="flex justify-between items-center text-xs pl-1">
                    <span className="text-slate-400">Request Expiration</span>
                    <span className="text-red-400 font-medium">Within 2 Days</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-light leading-relaxed">
                  * Note: If your Team Admin does not approve this request within 48 hours, it will automatically expire and be deleted from our systems.
                </p>

                <div className="pt-2">
                  <Link 
                    href="/login" 
                    className="block w-full py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-200 text-center"
                  >
                    Go to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              // MULTI-STEP FORM WORKFLOW
              <>
                {/* STEP 1: Account Type Selection */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Choose Account Type</h2>
                      <p className="text-slate-400 text-xs mt-2 font-light">How do you plan to use the Agentic Workflow builder?</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationType('SINGLE');
                          setStep(2);
                        }}
                        className="w-full text-left p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition duration-200 group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-violet-600/10 rounded-lg text-violet-400 group-hover:bg-violet-600/20 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition">Personal Account</h3>
                            <p className="text-slate-400 text-xs mt-1 font-light">For individuals. Private workspaces and personal execution logs.</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationType('ORGANIZATION');
                          setStep(2);
                        }}
                        className="w-full text-left p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition duration-200 group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-600/10 rounded-lg text-indigo-400 group-hover:bg-indigo-600/20 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition">Team / Organization</h3>
                            <p className="text-slate-400 text-xs mt-1 font-light">For collaborative workspaces. Share workflows, logs, and credentials.</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Role Selection (For Organization) OR Form Submission (For Single) */}
                {step === 2 && registrationType === 'ORGANIZATION' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button 
                        type="button" 
                        onClick={() => setStep(1)} 
                        className="text-slate-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1 font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Back
                      </button>
                    </div>

                    <div className="text-center mb-8">
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Join as Admin or Member?</h2>
                      <p className="text-slate-400 text-xs mt-2 font-light">Select your role inside the organization.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setOrgRole('ADMIN');
                          setStep(3);
                        }}
                        className="w-full text-left p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition duration-200 group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-violet-600/10 rounded-lg text-violet-400 group-hover:bg-violet-600/20 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition">Team Admin</h3>
                            <p className="text-slate-400 text-xs mt-1 font-light">Create a new organization workspace. You will manage teammates, tokens, and approval requests.</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOrgRole('MEMBER');
                          setStep(3);
                        }}
                        className="w-full text-left p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition duration-200 group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-600/10 rounded-lg text-indigo-400 group-hover:bg-indigo-600/20 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 11-4 0 2 2 0 014 0zM12 14a5 5 0 00-5 5h10a5 5 0 00-5-5z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition">Team Member</h3>
                            <p className="text-slate-400 text-xs mt-1 font-light">Join an existing organization. Requires a valid invite token from your Admin.</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Rendering: Step 2 for Single User */}
                {step === 2 && registrationType === 'SINGLE' && (
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <button 
                        type="button" 
                        onClick={() => setStep(1)} 
                        className="text-slate-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1 font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Back
                      </button>
                    </div>

                    <div className="text-center mb-8">
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Personal Registration</h2>
                      <p className="text-slate-400 text-xs mt-2 font-light">Set up your private personal account credentials.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                        Secure Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                        placeholder="••••••••"
                      />
                      <PasswordRequirements password={password} />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 mt-4 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 hover:from-violet-600 hover:via-purple-500 hover:to-indigo-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-300 border border-white/10 hover:border-white/20 shadow-md cursor-pointer"
                    >
                      {loading ? 'Registering Account...' : 'Create Account'}
                    </button>
                  </form>
                )}

                {/* Form Rendering: Step 3 for Organization Users (ADMIN / MEMBER) */}
                {step === 3 && registrationType === 'ORGANIZATION' && (
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <button 
                        type="button" 
                        onClick={() => setStep(2)} 
                        className="text-slate-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1 font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Back
                      </button>
                    </div>

                    {orgRole === 'ADMIN' ? (
                      // TEAM ADMIN FIELDS
                      <>
                        <div className="text-center mb-6">
                          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Register Organization</h2>
                          <p className="text-slate-400 text-xs mt-1.5 font-light">Create a new shared team environment.</p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Organization Name
                          </label>
                          <input
                            type="text"
                            required
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="Asus Research Corp"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Organization Address
                          </label>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="123 Tech Blvd, Suite 400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Admin Email
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="admin@company.com"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Secure Password
                          </label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="••••••••"
                          />
                          <PasswordRequirements password={password} />
                        </div>
                      </>
                    ) : (
                      // TEAM MEMBER FIELDS
                      <>
                        <div className="text-center mb-6">
                          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Join Organization</h2>
                          <p className="text-slate-400 text-xs mt-1.5 font-light">Input your credentials and token to request join access.</p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="teammate@company.com"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Invite Token
                          </label>
                          <input
                            type="text"
                            required
                            value={inviteToken}
                            onChange={(e) => setInviteToken(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm font-mono focus:outline-none focus:border-violet-500/50"
                            placeholder="TOK-XXXXXX"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                            Secure Password
                          </label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="••••••••"
                          />
                          <PasswordRequirements password={password} />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 mt-4 bg-gradient-to-r from-indigo-700 via-purple-600 to-violet-700 hover:from-indigo-600 hover:via-purple-500 hover:to-violet-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-300 border border-white/10 hover:border-white/20 shadow-md cursor-pointer"
                    >
                      {loading 
                        ? (orgRole === 'ADMIN' ? 'Initializing Team Space...' : 'Verifying Request...') 
                        : (orgRole === 'ADMIN' ? 'Register Team Workspace' : 'Submit Join Request')
                      }
                    </button>
                  </form>
                )}

                <p className="text-center text-xs text-slate-400 mt-8">
                  Already have an account?{' '}
                  <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200">
                    Sign in here
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
