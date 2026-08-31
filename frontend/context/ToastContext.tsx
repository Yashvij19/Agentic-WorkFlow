// frontend/context/ToastContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, message, type };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 concurrent toasts

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
    info: (msg: string) => showToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      
      {/* Fixed Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const typeStyles = {
            success: {
              border: 'border-emerald-500/30',
              bg: 'bg-[#080D1D]/90 shadow-emerald-500/10',
              text: 'text-emerald-300',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
            },
            error: {
              border: 'border-red-500/35',
              bg: 'bg-[#080D1D]/90 shadow-red-500/10',
              text: 'text-red-300',
              icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
            },
            warning: {
              border: 'border-amber-500/35',
              bg: 'bg-[#080D1D]/90 shadow-amber-500/10',
              text: 'text-amber-300',
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
            },
            info: {
              border: 'border-violet-500/30',
              bg: 'bg-[#080D1D]/90 shadow-violet-500/10',
              text: 'text-violet-300',
              icon: <Info className="w-4 h-4 text-violet-400 shrink-0" />,
            },
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-300 animate-fade-in ${typeStyles.border} ${typeStyles.bg}`}
            >
              <div className="mt-0.5">{typeStyles.icon}</div>
              <div className="flex-1 text-xs text-slate-200 font-medium leading-snug">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white transition p-0.5 rounded-lg hover:bg-white/[0.05] cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
