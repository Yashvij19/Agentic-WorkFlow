// frontend/components/AetherFlowLogo.tsx
'use client';

import React from 'react';
import Image from 'next/image';

interface AetherFlowLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textSize?: string;
}

export default function AetherFlowLogo({
  size = 28,
  className = '',
  showText = false,
  textSize = 'text-base',
}: AetherFlowLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.svg"
          alt="AetherFlow Logo"
          width={size}
          height={size}
          priority
          className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
        />
      </div>
      {showText && (
        <span className={`font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent ${textSize}`}>
          AetherFlow
        </span>
      )}
    </div>
  );
}
