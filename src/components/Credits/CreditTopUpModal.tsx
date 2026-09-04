'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Zap, Gift, Clock, Lock, ChevronRight, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CREDIT_PACKAGES } from '@/types/credits';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface LocalCooldownInfo {
  latest: number;
  hoursRemaining: number;
  daysRemaining: number;
  nextClaimAt: string;
}

function getLocalCooldown(userId?: string, userClaimAt?: string): LocalCooldownInfo | null {
  if (!userId) return null;
  const timestamps: number[] = [];

  if (userClaimAt) {
    const t = new Date(userClaimAt).getTime();
    if (!isNaN(t) && t > 0) timestamps.push(t);
  }

  if (typeof window !== 'undefined') {
    try {
      const localClaim = localStorage.getItem(`careerbot_last_free_claim_${userId}`);
      if (localClaim) {
        const t = new Date(localClaim).getTime();
        if (!isNaN(t) && t > 0) timestamps.push(t);
      }
      const genericClaim = localStorage.getItem('careerbot_last_free_claim');
      if (genericClaim) {
        const t = new Date(genericClaim).getTime();
        if (!isNaN(t) && t > 0) timestamps.push(t);
      }

      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)careerbot_last_claim_${userId}=([^;]*)`));
      if (match && match[1]) {
        const t = new Date(decodeURIComponent(match[1])).getTime();
        if (!isNaN(t) && t > 0) timestamps.push(t);
      }
    } catch {
      /* ignore */
    }
  }

  if (timestamps.length === 0) return null;

  const latest = Math.max(...timestamps);
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - latest;
  if (elapsed >= COOLDOWN_MS) return null;

  const msRemaining = COOLDOWN_MS - elapsed;
  const hoursRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60)));
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const nextClaimAt = new Date(latest + COOLDOWN_MS).toISOString();

  return { latest, hoursRemaining, daysRemaining, nextClaimAt };
}

export const CreditTopUpModal: React.FC = () => {
  const { isCreditModalOpen, closeCreditModal, credits, updateCredits, user, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);

  const syncCooldownState = useCallback((info: LocalCooldownInfo | null) => {
    if (info) {
      setCanClaim(false);
      setHoursRemaining(info.hoursRemaining);
      setDaysRemaining(info.daysRemaining);
      setNextClaimAt(info.nextClaimAt);
    }
  }, []);

  const fetchClaimStatus = useCallback(async () => {
    if (!user) {
      setCheckingStatus(false);
      return;
    }

    const localCd = getLocalCooldown(user.id, user.last_free_credit_claim_at);
    if (localCd) {
      syncCooldownState(localCd);
      setCheckingStatus(false);
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token !== 'undefined' && token !== 'null' && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'claim_status',
          clientLastClaimAt: localCd ? new Date(localCd.latest).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Redundant check: if local cooldown is still active, never allow server to prematurely unlock
        const freshCd = getLocalCooldown(user.id, user.last_free_credit_claim_at);
        if (freshCd) {
          syncCooldownState(freshCd);
        } else {
          setCanClaim(Boolean(data.canClaim));
          const hrs = data.hoursRemaining || 0;
          const days = typeof data.daysRemaining === 'number'
            ? data.daysRemaining
            : hrs > 24
            ? Math.ceil(hrs / 24)
            : 0;
          setHoursRemaining(hrs);
          setDaysRemaining(days);
          setNextClaimAt(data.nextClaimAt || null);
        }
      }
    } catch {
      // Retain local state
    } finally {
      setCheckingStatus(false);
    }
  }, [user, syncCooldownState]);

  useEffect(() => {
    if (isCreditModalOpen && user) {
      const initialCd = getLocalCooldown(user.id, user.last_free_credit_claim_at);
      if (initialCd) {
        syncCooldownState(initialCd);
        setCheckingStatus(false);
      } else {
        setCanClaim(false);
        setCheckingStatus(true);
      }
      fetchClaimStatus();
    }
  }, [isCreditModalOpen, user, fetchClaimStatus, syncCooldownState]);

  // Live countdown ticker for cooldown expiration
  useEffect(() => {
    if (!nextClaimAt) return;
    const updateTimes = () => {
      const diff = new Date(nextClaimAt).getTime() - Date.now();
      if (diff <= 0) {
        setCanClaim(true);
        setHoursRemaining(0);
        setDaysRemaining(0);
      } else {
        const hrs = Math.max(1, Math.ceil(diff / (1000 * 60 * 60)));
        const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        setHoursRemaining(hrs);
        setDaysRemaining(days);
      }
    };
    updateTimes();
    const interval = setInterval(updateTimes, 30000);
    return () => clearInterval(interval);
  }, [nextClaimAt]);

  if (!isCreditModalOpen) return null;

  const handleClaim = async () => {
    if (!user) {
      closeCreditModal();
      openAuthModal('login');
      return;
    }

    const activeCd = getLocalCooldown(user.id, user.last_free_credit_claim_at);
    if (activeCd) {
      syncCooldownState(activeCd);
      setError(`Free credits can only be claimed once every 7 days. Next claim available in ${activeCd.daysRemaining > 1 ? activeCd.daysRemaining + ' days' : activeCd.hoursRemaining + ' hours'}.`);
      return;
    }

    // Immediately stop if already loading or claim cooldown is active
    if (loading || !canClaim) return;

    setLoading(true);
    setCanClaim(false); // Disallow further clicks immediately
    setError(null);
    setSuccessMsg(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token !== 'undefined' && token !== 'null' && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'claim_free',
          clientLastClaimAt: activeCd ? new Date((activeCd as LocalCooldownInfo).latest).toISOString() : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const claimIso = data.claimTimeIso || new Date().toISOString();
        const nextIso = data.nextClaimAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`careerbot_last_free_claim_${user.id}`, claimIso);
            localStorage.setItem('careerbot_last_free_claim', claimIso);
            localStorage.setItem(`careerbot_next_free_claim_${user.id}`, nextIso);
            document.cookie = `careerbot_last_claim_${user.id}=${encodeURIComponent(claimIso)}; path=/; max-age=604800; SameSite=Lax`;
            if (data.token) {
              localStorage.setItem('careerbot_token', data.token);
            }
          } catch {
            /* ignore */
          }
        }

        updateCredits(data.newCredits, claimIso, data.token);
        setSuccessMsg(data.message || '🎉 5 free credits added!');
        setCanClaim(false);
        setNextClaimAt(nextIso);
        setHoursRemaining(data.hoursRemaining ?? 168);
        setDaysRemaining(data.daysRemaining ?? 7);

        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#f59e0b', '#10b981', '#6366f1', '#ffffff'],
        });
        setTimeout(() => {
          setSuccessMsg(null);
          closeCreditModal();
        }, 3000);
      } else {
        setError(data.error || 'Could not claim credits right now.');
        setCanClaim(false);
        if (typeof data.hoursRemaining === 'number') setHoursRemaining(data.hoursRemaining);
        if (typeof data.daysRemaining === 'number') {
          setDaysRemaining(data.daysRemaining);
        } else if (data.hoursRemaining > 24) {
          setDaysRemaining(Math.ceil(data.hoursRemaining / 24));
        }
        if (data.nextClaimAt) setNextClaimAt(data.nextClaimAt);
      }
    } catch {
      setError('Network error. Please try again.');
      setCanClaim(false);
      fetchClaimStatus();
    } finally {
      setLoading(false);
    }
  };

  const nextClaimDate = nextClaimAt ? new Date(nextClaimAt).toLocaleDateString('en-NG', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) : null;
  const nextClaimTimeStr = nextClaimAt ? new Date(nextClaimAt).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit',
  }) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.1] dark:bg-[#0c0c0c] dark:text-[#f7f8f8] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50/80 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Credits</h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">Your fuel for AI-powered job hunting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCreditModal}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-500 transition hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Balance */}
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-zinc-50 px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 dark:text-[#8a8f98]">Current balance</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-bold text-zinc-900 dark:text-white">{credits}</span>
                <span className="text-sm text-zinc-500 dark:text-[#8a8f98]">credits</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-zinc-400 dark:text-[#8a8f98]">1 credit =</p>
              <p className="text-xs font-semibold text-zinc-700 dark:text-[#f7f8f8]">1 job search</p>
              <p className="text-[11px] text-zinc-400 dark:text-[#8a8f98]">or 1 CV action</p>
            </div>
          </div>
        </div>

        {/* Free Weekly Claim */}
        <div className="px-5 pt-4">
          <div className={`rounded-2xl border p-4 transition ${
            canClaim
              ? 'border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]'
              : 'border-black/10 bg-zinc-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  canClaim ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-100 border border-black/10 dark:bg-white/[0.04] dark:border-white/[0.08]'
                }`}>
                  <Gift className={`h-4.5 w-4.5 ${canClaim ? 'text-emerald-500' : 'text-zinc-400 dark:text-[#8a8f98]'}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Free Weekly Credits</p>
                    {checkingStatus ? (
                      <span className="rounded-full bg-zinc-200/60 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                        Checking...
                      </span>
                    ) : canClaim ? (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        Available now!
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200/70 border border-black/5 dark:bg-white/[0.06] dark:border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                        7-day cooldown
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
                    {canClaim
                      ? 'Claim 5 free credits right now — no payment needed!'
                      : daysRemaining > 0
                      ? `Available again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Free credits refill every 7 days.`
                      : hoursRemaining > 0
                      ? `Available again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}. Free credits refill every 7 days.`
                      : 'Free credits refill once every 7 days.'}
                  </p>
                  {nextClaimDate && !canClaim && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-[#8a8f98]">
                      <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                      <span>Next refill: <span className="font-semibold text-zinc-700 dark:text-[#f7f8f8]">{nextClaimDate}{nextClaimTimeStr ? ` at ${nextClaimTimeStr}` : ''}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-lg font-black text-zinc-900 dark:text-white">+5</span>
                <span className="text-[10px] text-zinc-400 dark:text-[#8a8f98]">credits</span>
              </div>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{successMsg}</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-3 rounded-xl bg-rose-500/5 border border-rose-500/20 px-3 py-2">
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            {/* Claim / Cooldown Button */}
            {canClaim ? (
              <button
                type="button"
                onClick={handleClaim}
                disabled={loading}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Claiming 5 Free Credits...</span>
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    <span>Claim 5 Free Credits</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-zinc-100 dark:border-white/[0.08] dark:bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-500 dark:text-[#8a8f98] cursor-not-allowed select-none opacity-80"
              >
                <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <span>
                  {checkingStatus
                    ? 'Checking eligibility...'
                    : daysRemaining > 0
                    ? `Available in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`
                    : hoursRemaining > 0
                    ? `Available in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`
                    : 'Claim Available in 7 Days'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Paystack Credit Packages */}
        <div className="px-5 pt-3 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Credit Top-Up Packages
            </span>
            <Link
              href="/pricing"
              onClick={closeCreditModal}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white underline"
            >
              <span>Pricing Policy</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between rounded-xl border border-black/10 bg-zinc-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{pkg.name}</p>
                    {pkg.popular && (
                      <span className="rounded-full bg-zinc-900 px-1.5 py-0.2 text-[9px] font-bold text-white dark:bg-white dark:text-black">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{pkg.credits} Action Credits</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black text-zinc-900 dark:text-white">
                    ₦{pkg.price_ngn.toLocaleString('en-NG')} <span className="text-[10px] font-normal text-zinc-400">(${pkg.price_usd})</span>
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Paystack Verified</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Secured by Paystack
            </span>
            <span>7-Day Refund Policy</span>
          </div>

          {/* Credit usage guide */}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2.5">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <div className="text-[11px] text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
              <span className="font-semibold text-zinc-700 dark:text-[#f7f8f8]">How credits work:</span>{' '}
              1 credit = 1 live job search · 2 credits = CV review · 3 credits = full CV rebuild
            </div>
          </div>

          {!user && (
            <button
              type="button"
              onClick={() => { closeCreditModal(); openAuthModal('login'); }}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black dark:border-white/10 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
            >
              Sign in to claim credits
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
