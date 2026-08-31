// frontend/components/profile/UserProfileDropdown.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Shield, LogOut, Settings, Building } from 'lucide-react';
import { API_URL } from '../../utils/config';

interface UserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'SINGLE';
  organizationId: string;
  organizationName: string;
}

export default function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load basic info from localStorage first, then sync with /api/auth/me
  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    // Initial fallback from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setProfile(parsed);
      } catch (e) {}
    }
    fetchProfile();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const emailInitial = profile?.email ? profile.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          fetchProfile();
        }}
        className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 transition cursor-pointer group"
        title="User Account Menu"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-violet-500/20 group-hover:scale-105 transition duration-200">
          {emailInitial}
        </div>
        <span className="hidden md:block text-xs font-semibold text-slate-200 max-w-[120px] truncate">
          {profile?.email?.split('@')[0] || 'Account'}
        </span>
        <svg className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#080D1D] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 backdrop-blur-2xl animate-fade-in">
          {/* Header Info */}
          <div className="px-4 py-3 border-b border-white/[0.05] space-y-1">
            <span className="block text-xs font-bold text-white truncate">{profile?.email}</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold uppercase tracking-wider">
                {profile?.role || 'MEMBER'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {profile?.organizationName || 'Workspace'}
              </span>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-white/[0.04] hover:text-white transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span>My Profile & Permissions</span>
            </Link>

            {profile?.role === 'ADMIN' && (
              <Link
                href="/setting"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-white/[0.04] hover:text-white transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-blue-400" />
                <span>Team Administration</span>
              </Link>
            )}

            <div className="my-1 border-t border-white/[0.04]" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
