'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Scale, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-900 selection:text-white dark:bg-black dark:text-[#f7f8f8]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/80">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to CareerBot</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/pricing" className="hover:underline">Pricing Policy</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Terms of Service</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Effective Date: September 2026</p>
          </div>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-zinc-600 dark:text-zinc-400">
          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or using CareerBot AI (&quot;the Service&quot;), operated by Babalola Ayodele Mathew (&quot;Bamdalas&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">2. Description of Services</h2>
            <p>
              CareerBot AI provides automated career navigation, live job opportunity aggregation, ATS resume evaluation, AI resume restructuring, and outreach pitch generation. We index and link to verified publicly available career pages, company ATS portals, and recruitment platforms.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">3. User Accounts & Security</h2>
            <p>
              When creating an account, you must provide accurate, current, and complete information. You are responsible for safeguarding your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">4. Pricing, Payments & Credits</h2>
            <p>
              Access to specialized AI services (such as in-depth CV rebuilds and tailored pitch drafting) is facilitated through pay-as-you-go credit packages. All payments are processed securely via <strong>Paystack Payments Limited</strong>. Prices are clearly displayed in Nigerian Naira (NGN) and United States Dollars (USD) on our <Link href="/pricing" className="text-zinc-900 dark:text-white underline font-medium">Pricing Policy page</Link>. Credits are non-transferable, do not expire, and are delivered immediately upon confirmed payment.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">5. Refund & Cancellation Policy</h2>
            <p>
              We provide a <strong>7-day money-back guarantee</strong> on any unused purchased credits. If you are dissatisfied with the service or encounter technical issues, contact <a href="mailto:hello@bamdalas.com" className="underline text-zinc-900 dark:text-white font-medium">hello@bamdalas.com</a> within 7 calendar days of your transaction. Approved refunds will be credited back via Paystack to your original payment card or bank account within 3 to 5 business days.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">6. Prohibited Activities</h2>
            <p>
              Users may not: (a) abuse, reverse engineer, or exploit the platform or payment systems; (b) create automated accounts or fake referrals to defraud credit bonuses; (c) transmit malicious software; or (d) scrape the platform without express written permission.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">7. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from or relating to these Terms shall be resolved amicably, failing which they shall be submitted to the competent courts in Lagos State, Nigeria.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">8. Contact Information</h2>
            <p>
              If you have any questions regarding these Terms or need assistance, contact:
              <br />
              <strong>Babalola Ayodele Mathew / Bamdalas</strong>
              <br />
              Email: <a href="mailto:hello@bamdalas.com" className="underline font-medium">hello@bamdalas.com</a>
              <br />
              Lagos, Nigeria
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white py-8 dark:border-white/10 dark:bg-black">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} CareerBot AI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white">Home</Link>
            <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-white">Pricing Policy</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
