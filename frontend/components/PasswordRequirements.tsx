// frontend/components/PasswordRequirements.tsx
'use client';

import React from 'react';
import { getPasswordValidationState } from '../utils/validation';

interface PasswordRequirementsProps {
  password: string;
  showAlways?: boolean;
}

export default function PasswordRequirements({ password, showAlways = false }: PasswordRequirementsProps) {
  if (!password && !showAlways) {
    return null;
  }

  const { rules, isValid } = getPasswordValidationState(password);

  return (
    <div className="mt-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Password Requirements
        </span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            isValid
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
        >
          {isValid ? 'Strong Password' : 'Incomplete'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`flex items-center gap-2 text-[11px] transition-colors duration-200 ${
              rule.passed ? 'text-emerald-400 font-medium' : 'text-slate-400'
            }`}
          >
            {rule.passed ? (
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 ml-1 mr-1" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
