'use client';

import React, { useState } from 'react';
import { X, Sparkles, Zap, Check, CreditCard, Loader2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CREDIT_PACKAGES } from '@/types/credits';
import confetti from 'canvas-confetti';

export const CreditTopUpModal: React.FC = () => {
  const { isCreditModalOpen, closeCreditModal, credits, updateCredits, user, openAuthModal } = useAuth();
  const [selectedPkg, setSelectedPkg] = useState<string>('pro');
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'paystack'>('card');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isCreditModalOpen) return null;

  const handlePurchase = async () => {
    if (!user) {
      closeCreditModal();
      openAuthModal('login');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPkg,
          paymentMethod,
          currency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateCredits(data.newCredits);
        setSuccessMsg(data.message || 'Credits added to your account!');
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ffffff', '#8a8f98', '#62666d'],
        });
        setTimeout(() => {
          setSuccessMsg(null);
          closeCreditModal();
        }, 2200);
      } else {
        setError(data.error || 'Failed to complete credit purchase.');
      }
    } catch {
      setError('Payment network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activePackage = CREDIT_PACKAGES.find((p) => p.id === selectedPkg) || CREDIT_PACKAGES[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.1] dark:bg-[#0c0c0c] dark:text-[#f7f8f8]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-[#f7f8f8]">Top Up Credits</h3>
                <span className="rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-[#8a8f98]">
                  Current balance: <strong className="text-zinc-900 dark:text-[#f7f8f8]">{credits}</strong> credits
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                Power your career search with live job scans, CV rewrites & pitch letters.
              </p>
            </div>
          </div>
          <button
            onClick={closeCreditModal}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Currency & Cost breakdown bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-zinc-50/50 px-6 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.01]">
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-[#8a8f98]">
            <span>Rates:</span>
            <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-zinc-800 dark:bg-white/[0.04] dark:text-[#c9ccd1]">1 Search = 1 cr</span>
            <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-zinc-800 dark:bg-white/[0.04] dark:text-[#c9ccd1]">CV Review = 2 cr</span>
            <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-zinc-800 dark:bg-white/[0.04] dark:text-[#c9ccd1]">CV Rebuild = 3 cr</span>
          </div>
          <div className="flex rounded-lg border border-black/10 bg-black/[0.03] p-0.5 dark:border-white/[0.1] dark:bg-white/[0.03]">
            <button
              onClick={() => setCurrency('USD')}
              className={`rounded px-2.5 py-0.5 text-xs font-semibold transition ${
                currency === 'USD' ? 'bg-zinc-900 text-white dark:bg-white/20 dark:text-white' : 'text-zinc-600 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('NGN')}
              className={`rounded px-2.5 py-0.5 text-xs font-semibold transition ${
                currency === 'NGN' ? 'bg-zinc-900 text-white dark:bg-white/20 dark:text-white' : 'text-zinc-600 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
              }`}
            >
              NGN (₦)
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-white/20 dark:bg-white/[0.06] dark:text-white">
              <Check className="h-5 w-5 text-emerald-600 dark:text-white" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#c9ccd1]">
              {error}
            </div>
          )}

          {/* Pricing Tier Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CREDIT_PACKAGES.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              const priceDisplay = currency === 'NGN' ? `₦${pkg.price_ngn.toLocaleString()}` : `$${pkg.price_usd}`;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  role="button"
                  tabIndex={0}
                  className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-900/5 shadow-md dark:border-white/40 dark:bg-white/[0.06] dark:shadow-lg'
                      : 'border-black/10 bg-white hover:border-black/20 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {('popular' in pkg && pkg.popular) && (
                    <span className="absolute -top-2.5 right-3 rounded-full border border-indigo-200 bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md dark:border-white/20 dark:bg-white/10">
                      {pkg.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">{pkg.name}</h4>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{priceDisplay}</span>
                      <span className="text-xs text-zinc-500 dark:text-[#8a8f98]">/ one-time</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-white">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-[#8a8f98]" />
                      <span>{pkg.credits} Credits</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">{pkg.description}</p>

                    <div className="mt-3 space-y-1.5 border-t border-black/10 pt-3 dark:border-white/[0.06]">
                      {pkg.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-700 dark:text-[#c9ccd1]">
                          <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-[#8a8f98]" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      className={`w-full rounded-xl py-2 text-xs font-semibold transition ${
                        isSelected
                          ? 'btn-primary'
                          : 'border border-black/10 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#c9ccd1] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Method Selector */}
          <div className="rounded-2xl border border-black/10 bg-zinc-50/50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
              Select Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  paymentMethod === 'card'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/30 dark:bg-white/[0.08] dark:text-white'
                    : 'border-black/10 bg-white text-zinc-700 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Credit / Debit Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paystack')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  paymentMethod === 'paystack'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/30 dark:bg-white/[0.08] dark:text-white'
                    : 'border-black/10 bg-white text-zinc-700 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Paystack / Stripe</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  paymentMethod === 'transfer'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/30 dark:bg-white/[0.08] dark:text-white'
                    : 'border-black/10 bg-white text-zinc-700 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Instant Transfer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Checkout Button */}
        <div className="flex items-center justify-between border-t border-black/10 bg-zinc-50 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#8a8f98]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-[#c9ccd1]" />
            <span>Secure 256-bit instant recharge</span>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>
                  Pay {currency === 'NGN' ? `₦${activePackage.price_ngn.toLocaleString()}` : `$${activePackage.price_usd}`} & Add {activePackage.credits} Credits
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
