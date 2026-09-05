// frontend/components/TwoFactorSetupModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, Download, AlertTriangle, X, Smartphone, KeyRound } from 'lucide-react';
import QRCode from 'qrcode';
import { API_URL } from '../utils/config';
import { useToast } from '@/context/ToastContext';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isOnboarding?: boolean;
  onSkip?: () => void;
}

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  onSuccess,
  isOnboarding = false,
  onSkip,
}: TwoFactorSetupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);
  const [hasCopiedBackupCodes, setHasCopiedBackupCodes] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initiateSetup();
    }
  }, [isOpen]);

  const initiateSetup = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate 2FA setup.');

      setSecret(data.secret);
      setUri(data.uri);
      setBackupCodes(data.backupCodes || []);

      if (data.uri) {
        const localQrUrl = await QRCode.toDataURL(data.uri, {
          margin: 1,
          width: 180,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setQrDataUrl(localQrUrl);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load 2FA setup data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setHasCopiedSecret(true);
    toast.success('Secret key copied to clipboard!');
    setTimeout(() => setHasCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setHasCopiedBackupCodes(true);
    toast.success('All backup recovery codes copied to clipboard!');
    setTimeout(() => setHasCopiedBackupCodes(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const fileContent = 
      `==================================================\n` +
      `AGENTIC WORKFLOW PLATFORM - EMERGENCY RECOVERY CODES\n` +
      `==================================================\n\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `Keep these one-time emergency recovery codes in a safe place (like a\n` +
      `password manager, external USB, or cloud drive). Do NOT store them\n` +
      `only on your phone.\n\n` +
      `Codes:\n` +
      backupCodes.map((code, i) => `  ${i + 1}. ${code}`).join('\n') +
      `\n\nEach code can only be used ONCE to recover your account if you lose\n` +
      `access to Microsoft Authenticator.\n`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agentic-workflow-emergency-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded as .txt file!');
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verificationCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify code.');

      toast.success(data.message || 'Two-Factor Authentication activated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#080D1D] border border-white/10 rounded-2xl w-full max-w-xl p-6 md:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isOnboarding ? 'Secure Your Account (2FA Setup)' : 'Enable Microsoft Authenticator'}
              </h3>
              <p className="text-xs text-slate-400">
                Time-Based One-Time Password (TOTP RFC 6238)
              </p>
            </div>
          </div>
          {!isOnboarding && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Generating cryptographic seed & backup codes...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Scan QR or copy text key */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-[11px] text-violet-300">1</span>
                <span>Pair with Microsoft or Google Authenticator</span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
                {/* QR Code (Generated in-memory locally, zero external requests) */}
                <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-lg flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scan 2FA QR Code"
                      className="w-32 h-32"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 flex items-center justify-center rounded">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Manual Code Option */}
                <div className="space-y-2.5 text-xs w-full">
                  <p className="text-slate-400 leading-relaxed">
                    Scan the QR code with your phone camera in <strong className="text-white">Microsoft Authenticator</strong>, or copy this secret key manually:
                  </p>
                  <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-2.5 rounded-lg font-mono text-slate-200 text-[11px] select-all break-all">
                    <span className="flex-1">{secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1.5 hover:bg-white/10 rounded text-slate-300 hover:text-white transition shrink-0"
                      title="Copy Secret"
                    >
                      {hasCopiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Emergency Backup Codes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-[11px] text-violet-300">2</span>
                  <span>Save Emergency Backup Codes</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    className="px-2.5 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    {hasCopiedBackupCodes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy All
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBackupCodes}
                    className="px-2.5 py-1 text-[10px] font-bold bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-lg text-violet-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Download .txt
                  </button>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] p-3 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Do NOT store these only on your phone!</strong> If you lose or break your phone, one of these 5 single-use codes is the <em>only</em> way to recover your account.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/40 border border-white/5 p-3 rounded-xl">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-black/60 border border-white/5 rounded-lg text-center font-mono text-xs font-semibold text-slate-200 select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Confirmation Code Form */}
            <form onSubmit={handleVerifyAndEnable} className="space-y-4 pt-2 border-t border-white/10">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Step 3: Enter 6-Digit Code from Authenticator
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000 000"
                    className="w-48 text-center tracking-[0.3em] font-mono text-lg py-2.5 bg-black/60 border border-white/15 rounded-xl text-white focus:border-violet-500/60 focus:outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs tracking-wider uppercase rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify & Activate 2FA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Onboarding Skip Option */}
            {isOnboarding && (
              <div className="pt-2 border-t border-white/10 text-center space-y-3">
                {!showSkipWarning ? (
                  <button
                    type="button"
                    onClick={() => setShowSkipWarning(true)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4 cursor-pointer"
                  >
                    Skip for Now
                  </button>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-4 rounded-xl text-left space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Permanent Account Lockout Warning</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-red-200/90">
                      If you skip Two-Factor Authentication now, <strong>self-service password recovery will be disabled</strong> for your account. If you ever forget your password, your account cannot be recovered online.
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSkipWarning(false)}
                        className="px-3 py-1.5 bg-violet-600 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                      >
                        Keep Securing Account
                      </button>
                      <button
                        type="button"
                        onClick={onSkip}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-300 font-medium text-[10px] rounded-lg transition cursor-pointer"
                      >
                        I understand, skip anyway
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
