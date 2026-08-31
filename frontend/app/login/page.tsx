// frontend/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import AutoCanvasVisual from '@/components/AutoCanvasVisual';
import { API_URL } from '../../utils/config';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      // Save token & user metadata in storage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success('Welcome back! Loading your dashboard...');
      router.push('/workflow');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotNewPassword) {
      toast.warning('Please enter your email and new password.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      toast.warning('New password must be at least 6 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setIsResetting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          newPassword: forgotNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully! You can now sign in.');
      setIsForgotModalOpen(false);
      setForgotEmail('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 md:p-12 relative overflow-x-hidden font-sans">
      {/* Soft energy gradients bleeding into surrounding darkness */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Back to Home Button floating at top-right */}
      <Link 
        href="/" 
        className="fixed top-6 right-6 z-50 glass-button px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-white"
      >
        <svg 
          className="w-3.5 h-3.5" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Home
      </Link>

      {/* Main composition container */}
      <div className="w-full max-w-5xl grid md:grid-cols-[43%_57%] gap-8 items-stretch relative z-10">
        
        {/* Left Side: Cinematic AI Visual */}
        <div className="w-full h-44 md:h-auto md:flex">
          <AutoCanvasVisual />
        </div>

        {/* Right Side: Authentication Form */}
        <div className="flex flex-col justify-center items-center py-4 px-1 md:px-6">
          <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
            {/* Top light reflection border */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Welcome Back
              </h2>
              <p className="text-slate-400 text-xs mt-2 font-light">
                Sign in to orchestrate your agent networks
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none"
                  placeholder="name@organization.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 hover:from-violet-600 hover:via-purple-500 hover:to-indigo-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20 shadow-[0_4px_20px_rgba(139,92,246,0.15)] hover:shadow-[0_4px_24px_rgba(139,92,246,0.25)] hover:-translate-y-[1px] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-8">
              Don't have an account?{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200">
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#080D1D] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-white">Reset Password</h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white transition text-xs p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your registered account email and set your new password.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'Resetting...' : 'Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
