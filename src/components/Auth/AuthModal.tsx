'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Gift,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import confetti from 'canvas-confetti';

type AuthMode = 'login' | 'register' | 'forgot-request' | 'forgot-otp' | 'forgot-reset';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthMode | null>(null);
  const mode: AuthMode = activeTab ?? authModalMode;

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [serverOtp, setServerOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClose = () => {
    setActiveTab(null);
    setError(null);
    setSuccessMessage(null);
    closeAuthModal();
  };

  if (!isAuthModalOpen) return null;

  // 1. Handle Login or Register
  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      const res = await register(name, email, password);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
      } else {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffffff', '#8a8f98', '#62666d'],
        });
      }
    } else {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
      }
    }
    setLoading(false);
  };

  // 2. Step 1: Request Reset (resetPasswordForEmail via verified backend)
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setLoadingMessage('Sending email...');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send recovery email.');
      }

      if (data.otp) {
        setServerOtp(data.otp);
        setOtpCode(data.otp);
      }

      setSuccessMessage(data.message || `A verification code has been generated for ${email.trim()}.`);
      setActiveTab('forgot-otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send recovery email. Please check your address.';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 3. Step 2: Code Verification (verifyOtp)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setError('Please enter the verification code.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setLoadingMessage('Verifying code...');

    try {
      // Step A: Check with backend OTP verifier
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      // Step B: Also attempt Supabase client verification
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: cleanOtp,
            type: 'recovery',
          });
        } catch {
          /* ignore */
        }
      }

      setSuccessMessage('Code verified successfully! Please enter your new password.');
      setActiveTab('forgot-reset');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 4. Step 3: Set New Password (updateUser & DB sync)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setLoadingMessage('Updating password...');

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        // Update user password in Supabase Auth session
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) {
          console.warn('Supabase updateUser warning:', updateError.message);
        }
      }

      // Sync password hash in backend users table
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      // Reset state and return to login view
      setSuccessMessage('Your password has been updated! Please sign in with your new password.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setActiveTab('login');

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const isForgotFlow = mode === 'forgot-request' || mode === 'forgot-otp' || mode === 'forgot-reset';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.1] dark:bg-[#0c0c0c] dark:text-[#f7f8f8]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]">
              {isForgotFlow ? <KeyRound className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">
                {isForgotFlow ? 'Reset Password' : 'CareerBot AI'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">
                {isForgotFlow ? 'Account recovery via email OTP' : 'Your AI-powered job search agent'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs for Login / Register */}
        {!isForgotFlow ? (
          <div className="flex border-b border-black/10 bg-zinc-50/50 dark:border-white/[0.08] dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-xs font-semibold transition ${
                mode === 'login'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-xs font-semibold transition ${
                mode === 'register'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50/50 px-6 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-[#8a8f98]">
              {mode === 'forgot-request' ? 'Step 1 of 3' : mode === 'forgot-otp' ? 'Step 2 of 3' : 'Step 3 of 3'}
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {mode === 'register' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-center dark:border-white/[0.08] dark:bg-white/[0.03]">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-950 dark:text-[#f7f8f8]">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Get 25 free search & resume credits on signup!
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================= VIEW 1 & 2: LOGIN OR REGISTER ================= */}
          {!isForgotFlow && (
            <form onSubmit={handleSubmitAuth} className="space-y-3.5">
              {mode === 'register' && typeof window !== 'undefined' && localStorage.getItem('careerbot_ref_code') && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-950 dark:text-amber-300">
                  <Gift className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Referral invite active: <b>@{localStorage.getItem('careerbot_ref_code')}</b> (+5 bonus)
                  </span>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot-request');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-white transition"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= VIEW 3: FORGOT PASSWORD - REQUEST RESET ================= */}
          {mode === 'forgot-request' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Reset Your Password</h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
                  Enter your registered email address and we will send you a one-time verification code (OTP).
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Registered Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loadingMessage || 'Sending code...'}</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= VIEW 4: FORGOT PASSWORD - OTP VERIFICATION ================= */}
          {mode === 'forgot-otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Enter Recovery Code</h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
                  We sent a recovery email to <span className="font-semibold text-zinc-900 dark:text-white">{email}</span>.
                </p>
              </div>

              {serverOtp ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-950 dark:text-emerald-300">
                  <p className="font-semibold mb-0.5">🔑 Verification Code Generated:</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-base font-bold tracking-widest text-emerald-700 dark:text-emerald-400">
                      {serverOtp}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">Auto-applied below</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#f7f8f8]">
                  <p className="font-semibold mb-1">📬 Quick 1-Click Reset</p>
                  <p className="text-[11px] text-zinc-600 dark:text-[#8a8f98] leading-relaxed">
                    Check your <b>Inbox and Spam folder</b>. You can click the <b>&quot;Reset password&quot; link</b> inside the email to set your new password instantly, or enter your code below.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  One-Time Code (OTP)
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-center font-mono text-sm tracking-widest text-zinc-900 shadow-xs placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot-request');
                    setError(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-white transition"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRequestReset}
                  className="font-semibold text-zinc-900 hover:underline dark:text-white"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loadingMessage || 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= VIEW 5: FORGOT PASSWORD - SET NEW PASSWORD ================= */}
          {mode === 'forgot-reset' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Set New Password</h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
                  Enter your new password below to regain access to your account.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loadingMessage || 'Updating password...'}</span>
                  </>
                ) : (
                  <>
                    <span>Submit New Password</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Switcher for login/register */}
          {!isForgotFlow && (
            <div className="text-center pt-2">
              {mode === 'login' ? (
                <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                  Don’t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="font-semibold text-zinc-900 hover:underline dark:text-[#f7f8f8]"
                  >
                    Sign up for free
                  </button>
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="font-semibold text-zinc-900 hover:underline dark:text-[#f7f8f8]"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
