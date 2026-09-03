'use client';

import React from 'react';

/**
 * Facts, not marketing numbers.
 *
 * Every figure here is a property of how the app actually works — the number of
 * job sources it aggregates, the match-score range, the pipeline stages — rather
 * than an invented user count. If a claim changes in the code, change it here.
 */
const FACTS: { value: string; label: string; detail: string }[] = [
  {
    value: '20+',
    label: 'Live job sources',
    detail: 'Direct employer career boards — Renmoney, Kuda, Jumia, Interswitch, Andela — plus regional harvesters and remote feeds.',
  },
  {
    value: '0',
    label: 'Hidden middlemen',
    detail: 'Board results link to the employer’s own form. Aggregator results say so on the card.',
  },
  {
    value: '0–100',
    label: 'Match score range',
    detail: 'Each role gets a suitability score plus the actual evidence behind it.',
  },
  {
    value: '4',
    label: 'Pipeline stages',
    detail: 'Saved → Applied → Interviewing → Offer, tracked in your browser.',
  },
  {
    value: '1',
    label: 'Click to a pitch',
    detail: 'Tailored bullets, a cover note and interview prep, generated per role.',
  },
  {
    value: 'None',
    label: 'Sign-up required',
    detail: 'No account, no email. Saved roles live in local storage on your device.',
  },
];

export const FactsSection: React.FC = () => {
  return (
    <section id="facts" className="rule-t relative w-full">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Fig 0.1 — The short version</span>
          <h2 className="max-w-2xl text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-zinc-900 dark:text-[#f7f8f8] sm:text-[40px]">
            A job search that behaves like a tool,
            <span className="text-zinc-500 dark:text-[#8a8f98]"> not a funnel.</span>
          </h2>
        </div>

        {/* gap-px over a lit container background is what draws the hairlines */}
        <dl className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 dark:border-white/[0.08] dark:bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              className="group relative flex flex-col gap-2 bg-white p-6 transition-colors hover:bg-zinc-50 dark:bg-black dark:hover:bg-[#0b0b0b]"
            >
              <dt className="text-[32px] font-medium leading-none tracking-[-0.03em] text-zinc-900 dark:text-[#f7f8f8]">
                {fact.value}
              </dt>
              <dd className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-[#f7f8f8]">{fact.label}</span>
                <span className="text-[13px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
                  {fact.detail}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
