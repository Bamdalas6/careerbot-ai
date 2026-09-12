'use client';

import React from 'react';
import { X, Zap, ChevronRight, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CREDIT_PACKAGES } from '@/types/credits';
import Link from 'next/link';

export const CreditTopUpModal: React.FC = () => {
  const { isCreditModalOpen, closeCreditModal, credits, user, openAuthModal } = useAuth();

  if (!isCreditModalOpen) return null;

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

        {/* Top-Up Promotion Banner */}
        <div className="px-5 pt-3">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 dark:border-amber-500/15 dark:bg-amber-500/[0.04]">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">
                  Official Paystack Top-Up Packages
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-[#8a8f98] leading-relaxed">
                  One-time payments. Tokens never expire and are automatically credited upon successful Paystack checkout.
                </p>
              </div>
            </div>
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

          <div className="space-y-2.5">
            {CREDIT_PACKAGES.map((pkg) => (
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
              Sign in to manage credits
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
