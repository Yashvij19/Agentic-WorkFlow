'use client';

import { useEffect } from 'react';
import Swal from 'sweetalert2';

let isSessionModalOpen = false;

export function triggerSessionExpiredModal() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login' || window.location.pathname === '/register') return;
  if (isSessionModalOpen) return;

  isSessionModalOpen = true;

  Swal.fire({
    title: `<span class="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
      <svg class="w-5 h-5 text-amber-400 inline-block shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Session Expired
    </span>`,
    html: `
      <div class="text-left space-y-3 font-sans pt-1">
        <p class="text-xs text-slate-200 leading-relaxed font-medium">Your login session has expired or is no longer valid.</p>
        <div class="p-3 bg-white/[0.04] border border-white/10 rounded-xl text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
          <span class="font-semibold text-purple-300 block">Why am I seeing this?</span>
          <p>For your security, authentication tokens expire automatically. Please sign in again with your account to continue working.</p>
        </div>
      </div>
    `,
    confirmButtonText: 'Log In Again',
    confirmButtonColor: '#8B5CF6',
    allowOutsideClick: false,
    allowEscapeKey: false,
    background: '#080D1D',
    color: '#F5F7FF',
    customClass: {
      popup: 'border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl',
    },
  }).then(() => {
    isSessionModalOpen = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  });
}

export default function SessionGuard() {
  useEffect(() => {
    // 1. Global window event listener
    const handleSessionExpiredEvent = () => {
      triggerSessionExpiredModal();
    };
    window.addEventListener('session-expired', handleSessionExpiredEvent);

    // 2. Global fetch interceptor to catch 401s on ANY page
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const rawUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        // Skip auth endpoints where 401 simply means bad username/password during sign-in
        const isAuthEndpoint = rawUrl.includes('/api/auth/login') || rawUrl.includes('/api/auth/register');

        if (!isAuthEndpoint) {
          triggerSessionExpiredModal();
        }
      }

      return response;
    };

    return () => {
      window.removeEventListener('session-expired', handleSessionExpiredEvent);
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
