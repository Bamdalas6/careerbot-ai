'use client';

import React, { useState, useEffect } from 'react';
import { X, Zap, ChevronRight, Sparkles, ShieldCheck, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CREDIT_PACKAGES } from '@/types/credits';
import Link from 'next/link';

export const CreditTopUpModal: React.FC = () => {
  const { isCreditModalOpen, closeCreditModal, credits, user, openAuthModal, refreshUser } = useAuth();
  const [referenceInput, setReferenceInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-refresh credits on modal open and whenever user refocuses window after Paystack checkout
  useEffect(() => {
    if (!isCreditModalOpen) return;
    refreshUser();

    const handleFocus = () => {
      refreshUser();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCreditModalOpen, refreshUser]);

  if (!isCreditModalOpen) return null;

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = referenceInput.trim();
    if (!cleanRef) return;

    setIsVerifying(true);
    setVerifyMessage(null);

    try {
      const res = await fetch('/api/credits/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Authorization: `Bearer ${localStorage.getItem('careerbot_token') || ''}` } : {}),
        },
        body: JSON.stringify({ reference: cleanRef }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setVerifyMessage({
          type: 'success',
          text: data.message || `Payment verified! ${data.creditsAdded ? `+${data.creditsAdded} coins added.` : ''}`,
        });
        setReferenceInput('');
        import('canvas-confetti')
          .then((m) => {
            const confetti = m.default || m;
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.5 },
              colors: ['#f59e0b', '#10b981', '#6366f1'],
            });
          })
          .catch(() => {});
        await refreshUser();
      } else {
        setVerifyMessage({
          type: 'error',
          text: data.error || 'Could not verify transaction reference. Please confirm and try again.',
        });
      }
    } catch {
      setVerifyMessage({
        type: 'error',
        text: 'Network notice: Check connection or allow automatic webhook to sync.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full sm:max-w-md max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.1] dark:bg-[#0c0c0c] dark:text-[#f7f8f8] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50/80 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Credits & Coins</h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">Your fuel for AI-powered job hunting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCreditModal}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-500 transition hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto px-5 py-4 space-y-3.5">
          {/* Current Balance */}
          <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-zinc-50 px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 dark:text-[#8a8f98]">Current balance</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-bold text-zinc-900 dark:text-white">{credits}</span>
                <span className="text-sm text-zinc-500 dark:text-[#8a8f98]">coins / credits</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-zinc-400 dark:text-[#8a8f98]">1 coin =</p>
              <p className="text-xs font-semibold text-zinc-700 dark:text-[#f7f8f8]">1 job search</p>
              <p className="text-[11px] text-zinc-400 dark:text-[#8a8f98]">or 1 CV action</p>
            </div>
          </div>

          {/* Top-Up Promotion Banner */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 dark:border-amber-500/15 dark:bg-amber-500/[0.04]">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">
                  Paystack Top-Up Packages
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
                  One-time payments. Tokens never expire and are automatically credited upon successful Paystack checkout.
                </p>
              </div>
            </div>
          </div>

          {/* Paystack Credit Packages */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Select Package
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
              {CREDIT_PACKAGES.map((pkg) => {
                const checkoutUrl = user?.email
                  ? `${pkg.payment_link}?email=${encodeURIComponent(user.email)}`
                  : pkg.payment_link;

                return (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between rounded-xl border border-black/10 bg-zinc-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.02] gap-3"
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

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-black text-zinc-900 dark:text-white whitespace-nowrap">
                          ₦{pkg.price_ngn.toLocaleString('en-NG')} <span className="text-[10px] font-normal text-zinc-400">(${pkg.price_usd})</span>
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Paystack Verified</span>
                      </div>
                      <a
                        href={pkg.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-black active:scale-[0.97] dark:bg-white dark:text-black dark:hover:bg-zinc-100 shrink-0 cursor-pointer"
                      >
                        <span>Buy</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Already Paid? Manual Verification Section */}
          <div className="rounded-2xl border border-black/10 bg-zinc-50/70 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <p className="text-xs font-bold text-zinc-900 dark:text-white mb-1">
              Already paid? Verify & Claim Coins
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5">
              Enter your Paystack Transaction Reference or Order Code from your receipt:
            </p>

            <form onSubmit={handleManualVerify} className="flex gap-2">
              <input
                type="text"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                placeholder="e.g. T123456789 or ORD_..."
                disabled={isVerifying}
                className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-white/10 dark:bg-black dark:text-white dark:focus:ring-white"
              />
              <button
                type="submit"
                disabled={isVerifying || !referenceInput.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-100 cursor-pointer shrink-0"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </button>
            </form>

            {verifyMessage && (
              <div
                className={`mt-2.5 flex items-start gap-2 rounded-xl p-2.5 text-xs ${
                  verifyMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                {verifyMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                )}
                <span className="leading-relaxed">{verifyMessage.text}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Secured by Paystack
            </span>
            <span>7-Day Refund Policy</span>
          </div>

          {/* Credit usage guide */}
          <div className="flex items-start gap-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2.5">
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
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black dark:border-white/10 dark:bg-white dark:text-black dark:hover:bg-zinc-100 cursor-pointer"
            >
              Sign in to manage credits
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
