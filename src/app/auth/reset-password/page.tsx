'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | null>(null);
  const [supabaseAccessToken, setSupabaseAccessToken] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      setHasValidAccess(true);
      setError(null);
      return;
    }

    // Check if Supabase recovery session exists or hash contains access_token / type=recovery
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session) {
            setHasValidAccess(true);
            setSupabaseUserEmail(data.session.user.email || null);
            setSupabaseAccessToken(data.session.access_token || null);
            setError(null);
          } else {
            if (typeof window !== 'undefined') {
              const hash = window.location.hash || '';
              if (hash.includes('access_token') || hash.includes('type=recovery')) {
                setHasValidAccess(true);
                setError(null);
              } else {
                setError('Missing or invalid reset token. Please request a new password reset link.');
              }
            }
          }
        });
      }
    } catch {
      if (!token) {
        setError('Missing or invalid reset token. Please request a new password reset link.');
      }
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && !hasValidAccess) return;
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setError(null);
    setLoading(true);
    try {
      // If we have a Supabase active recovery session, update in Supabase Auth directly
      const supabase = getSupabaseBrowserClient();
      let emailFromSession = supabaseUserEmail;
      if (supabase && (supabaseAccessToken || !token)) {
        try {
          const { data: updatedSb } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (updatedSb?.user?.email) {
            emailFromSession = updatedSb.user.email;
          }
        } catch (e) {
          console.warn('Supabase updateUser error:', e);
        }
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseAccessToken ? { Authorization: `Bearer ${supabaseAccessToken}` } : {}),
        },
        body: JSON.stringify({
          token: token || undefined,
          email: emailFromSession || undefined,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset password.');
      setSuccess(true);
      // Auto-redirect directly to dashboard/home after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Password Updated!</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">You are now logged in. Redirecting to your dashboard...</p>
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition dark:bg-white dark:text-black">
          Enter Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black mx-auto mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Set New Password</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose a strong password for your account.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 mb-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">New Password</label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400" />
            <input type={showNew ? 'text' : 'password'} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 text-zinc-400 hover:text-zinc-700">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Confirm Password</label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400" />
            <input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 text-zinc-400 hover:text-zinc-700">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading || (!token && !hasValidAccess)} className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>Updating password...</span></>) : (<><ShieldCheck className="h-4 w-4" /><span>Update Password</span></>)}
        </button>
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Remember your password?{' '}
          <Link href="/" className="font-semibold text-zinc-900 hover:underline dark:text-white">Sign in</Link>
        </p>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <Suspense fallback={
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
