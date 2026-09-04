'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  Zap, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  HelpCircle, 
  CreditCard, 
  RotateCcw, 
  FileText, 
  Clock, 
  Mail, 
  Globe, 
  ChevronRight,
  Gift,
  Plus
} from 'lucide-react';
import { CREDIT_PACKAGES, CREDIT_RATES } from '@/types/credits';
import { useAuth } from '@/context/AuthContext';

export default function PricingPage() {
  const router = useRouter();
  const { user, credits, openCreditModal, openAuthModal } = useAuth();
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handlePurchase = (packageId: string) => {
    if (!user) {
      openAuthModal('register');
      return;
    }
    openCreditModal();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-900 selection:text-white dark:bg-black dark:text-[#f7f8f8]">
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-black/85">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3.5 sm:px-8 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition hover:opacity-80 cursor-pointer"
            >
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black shrink-0">
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <span className="hidden sm:inline">Back to CareerBot</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Currency Toggle */}
            <div className="flex items-center rounded-xl border border-black/10 bg-zinc-100 p-0.5 sm:p-1 dark:border-white/10 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setCurrency('NGN')}
                className={`rounded-lg px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  currency === 'NGN'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                ₦ NGN
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`rounded-lg px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={openCreditModal}
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-black/10 bg-zinc-100 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 cursor-pointer"
                  title="Your active credits balance. Click to top up."
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>{credits}</span>
                  <span className="hidden sm:inline text-[10px] text-zinc-500 dark:text-zinc-400">credits</span>
                  <Plus className="h-3 w-3 text-zinc-400 dark:text-zinc-500 ml-0.5" />
                </button>
                <Link
                  href="/settings"
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-black/10 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  title="Account Settings"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-black">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate">{(user.name || user.email || 'User').split(' ')[0]}</span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="rounded-xl bg-zinc-900 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Transparent, Pay-As-You-Go Career Credits</span>
          </div>
          {user && (
            <div className="mb-6 flex items-center justify-center px-2">
              <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 text-center">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Active Session: <strong>{user.name || user.email || 'User'}</strong></span>
                <span className="hidden sm:inline text-emerald-500/60">•</span>
                <button
                  type="button"
                  onClick={openCreditModal}
                  className="font-bold underline hover:opacity-80 cursor-pointer"
                >
                  {credits} Credits Available
                </button>
              </div>
            </div>
          )}
          <h1 className="text-2xl sm:text-5xl font-black tracking-tight mb-3 sm:mb-4">
            Simple, Accessible Pricing.
            <br />
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-800 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              No Hidden Subscriptions.
            </span>
          </h1>
          <p className="text-xs sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            CareerBot AI gives you direct access to 700+ live employer openings, ATS-optimized CV rebuilds, and personalized recruiter pitches. Buy tokens when you need them — your credits never expire.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {CREDIT_PACKAGES.map((pkg) => {
            const priceFormatted =
              currency === 'NGN'
                ? `₦${pkg.price_ngn.toLocaleString('en-NG')}`
                : `$${pkg.price_usd}`;

            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-3xl p-5 sm:p-8 transition-all ${
                  pkg.popular
                    ? 'border-2 border-zinc-900 bg-white shadow-xl dark:border-white dark:bg-zinc-950'
                    : 'border border-black/10 bg-white shadow-xs dark:border-white/10 dark:bg-zinc-900/60'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase ${
                        pkg.popular
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm'
                          : 'border border-black/10 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                      {pkg.name}
                    </h3>
                    <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-400">
                      <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{pkg.credits} Credits</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 min-h-[32px] mb-5 sm:mb-6">
                    {pkg.description}
                  </p>

                  <div className="mb-5 sm:mb-6 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-4xl font-black tracking-tight">
                      {priceFormatted}
                    </span>
                    <span className="text-xs text-zinc-400">/ one-time</span>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 pt-5 sm:pt-6 border-t border-black/5 dark:border-white/10 mb-6 sm:mb-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      What is included:
                    </p>
                    {pkg.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePurchase(pkg.id)}
                  className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition cursor-pointer active:scale-[0.98] ${
                    pkg.popular
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                      : 'border border-black/10 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700'
                  }`}
                >
                  <span>Select {pkg.name}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Free Credits & Referral Banner */}
        <div className="rounded-3xl border border-black/10 bg-white p-5 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50 mb-16 sm:mb-20 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mb-1">
                  100% Free Weekly Credits
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Every registered account automatically receives <strong>5 free credits every 7 days</strong> directly from the credit top-up menu. No credit card or purchase is required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mb-1">
                  Referral Rewards: +10 Free Credits
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Invite friends to CareerBot AI with your unique referral link. Both you and your invited friend immediately receive <strong>10 bonus credits</strong> when they register.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Consumption & Rates Table / Mobile Cards */}
        <div className="mb-16 sm:mb-20">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Action Credit Rates
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Clear, transparent costs per action across all AI tools on CareerBot AI.
            </p>
          </div>

          {/* Mobile Card-Based UI for Rates (< sm screens) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-zinc-900/70">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">AI Job Search & Live Query</h3>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                  {CREDIT_RATES.CHAT_SEARCH} Credit
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Real-time matching across 700+ live roles, ATS verification, deduplication, and African/remote scoring
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-zinc-900/70">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">ATS CV Review & Scoring</h3>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                  {CREDIT_RATES.CV_REVIEW} Credits
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Full resume breakdown with ATS compatibility score, missing industry keywords, and layout critiques
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-zinc-900/70">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">1-Click Tailored Pitch & Cover Note</h3>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                  {CREDIT_RATES.TAILOR_PITCH} Credits
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Custom tailored bullet points and personalized application pitch matching the specific job posting
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-zinc-900/70">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Full AI CV Rebuild</h3>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                  {CREDIT_RATES.CV_REBUILD} Credits
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Transforms your resume into a modern, executive format with high-impact metric-driven achievements
              </p>
            </div>
          </div>

          {/* Desktop Table View (sm: and up) */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900/70 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-black/5 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-4 font-bold text-zinc-700 dark:text-zinc-300">Feature / Service</th>
                  <th className="px-6 py-4 font-bold text-zinc-700 dark:text-zinc-300">Description</th>
                  <th className="px-6 py-4 font-bold text-zinc-700 dark:text-zinc-300 text-right">Cost (Credits)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                <tr>
                  <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">AI Job Search & Live Query</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Real-time matching across 700+ live roles, ATS verification, deduplication, and African/remote scoring</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white text-right">{CREDIT_RATES.CHAT_SEARCH} Credit</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">ATS CV Review & Scoring</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Full resume breakdown with ATS compatibility score, missing industry keywords, and layout critiques</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white text-right">{CREDIT_RATES.CV_REVIEW} Credits</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">1-Click Tailored Pitch & Cover Note</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Custom tailored bullet points and personalized application pitch matching the specific job posting</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white text-right">{CREDIT_RATES.TAILOR_PITCH} Credits</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">Full AI CV Rebuild</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">Transforms your resume into a modern, executive format with high-impact metric-driven achievements</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white text-right">{CREDIT_RATES.CV_REBUILD} Credits</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Pricing Policy & Regulatory Terms */}
        <div id="policy" className="rounded-3xl border border-black/10 bg-white p-5 sm:p-8 md:p-12 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                Official Pricing Policy & Terms of Sale
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                Last updated: September 2026 · Compliant with Paystack Merchant Requirements & Consumer Protection Laws
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                1. Product & Service Description
              </h3>
              <p>
                CareerBot AI (operated by Bamdalas) is an artificial intelligence-driven career discovery and application enablement software. Our services include live job crawling and indexing, algorithmic ATS resume scoring, AI-powered CV rebuilds, and personalized recruiter outreach generators.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                2. Pricing Transparency & Currency
              </h3>
              <p>
                All prices are explicitly listed in Nigerian Naira (₦ NGN) and United States Dollars ($ USD). Prices are fixed at the rates published on this page at the time of purchase. There are no recurring monthly charges or hidden subscription fees; all purchases are one-time credit top-ups that remain in your wallet balance until spent.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                3. Payment Methods & Security
              </h3>
              <p>
                All transactions are securely processed through <strong>Paystack Payments Limited</strong>, a licensed and PCI-DSS Level 1 certified payment service provider. We support Debit/Credit Cards (Mastercard, Visa, Verve), Bank Transfers, USSD, and Apple Pay. CareerBot AI never stores or processes raw credit card numbers or CVVs on its servers.
              </p>
            </div>

            <div id="refund-policy">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                4. Fulfillment & Instant Digital Delivery
              </h3>
              <p>
                All products on CareerBot AI are digital software credits. Upon successful payment verification by Paystack, purchased credits are automatically deposited into the user’s account instantaneously. Users can immediately spend credits on job searches, CV evaluations, and pitch tailoring without delay.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                5. Refund & Dispute Policy
              </h3>
              <p>
                We stand by the quality of CareerBot AI. If you are not satisfied with your purchase, you are eligible for a <strong>100% money-back refund on any unused credit balance within 7 days of purchase</strong>. To request a refund, email our support team at <a href="mailto:support@bamdalas.com" className="text-zinc-900 underline dark:text-white font-medium">support@bamdalas.com</a> with your registered email and transaction reference. Approved refunds are processed back to your original payment method via Paystack within 3 to 5 business days.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                6. Customer Support & Merchant Information
              </h3>
              <div className="rounded-2xl border border-black/5 bg-zinc-50 p-4 dark:border-white/5 dark:bg-zinc-800/40 mt-2 space-y-1">
                <p className="font-semibold text-zinc-900 dark:text-white">CareerBot AI (Bamdalas)</p>
                <p>Official Merchant Contact: <a href="mailto:support@bamdalas.com" className="underline font-medium">support@bamdalas.com</a></p>
                <p>Website: <a href="https://careerbot-ai-seven.vercel.app" className="underline font-medium">https://careerbot-ai-seven.vercel.app</a></p>
                <p>Location: Lagos, Nigeria</p>
                <p>Customer Support Hours: Monday – Saturday, 8:00 AM – 8:00 PM (WAT)</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-16">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-center mb-6 sm:mb-8">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                Do my credits ever expire?
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                No. Purchased credits and bonus referral credits remain active in your account balance indefinitely until you use them.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                Is this an automatic recurring subscription?
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                No. CareerBot AI does not automatically bill your card every month. You only purchase credits when you need them.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                Can I search jobs for free before purchasing?
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Yes! Every registered account receives 25 free credits upon sign-up and 5 free credits every week from the top-up menu. Free accounts can search, filter, and inspect verified job cards from 20+ sources without adding a credit card.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white py-8 sm:py-12 dark:border-white/10 dark:bg-black">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-xs text-zinc-500 sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} CareerBot AI. All rights reserved.</p>
          <div className="flex flex-wrap gap-4 sm:gap-6 font-medium justify-center">
            <button type="button" onClick={handleBack} className="hover:text-zinc-900 dark:hover:text-white cursor-pointer">Back</button>
            <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-white">Pricing Policy</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">Privacy Policy</Link>
            <a href="mailto:support@bamdalas.com" className="hover:text-zinc-900 dark:hover:text-white">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
