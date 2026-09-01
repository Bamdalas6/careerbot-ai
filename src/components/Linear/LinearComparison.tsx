'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

export const LinearComparison: React.FC = () => {
  const comparisons = [
    {
      feature: 'Application Target',
      traditional: 'Third-party boards & recruiter lead-gen forms',
      careerBot: 'Direct 1-Click verified company ATS portals (Greenhouse, Lever, Ashby, Workday)',
    },
    {
      feature: 'Discovery Experience',
      traditional: '25 rigid dropdown filter menus & sponsored junk',
      careerBot: 'Natural language AI chat with instant parameter understanding',
    },
    {
      feature: 'Match Transparency',
      traditional: 'Black-box algorithms without explanation',
      careerBot: 'Explainable 0-100% score with specific skill breakdown',
    },
    {
      feature: 'Application Outreach',
      traditional: 'Hours spent rewriting bullets manually',
      careerBot: '1-Click tailored pitch bullets & interview prep questions',
    },
    {
      feature: 'Resume Processing',
      traditional: 'Manual profile form filling across dozens of portals',
      careerBot: 'Automated skill extraction from PDF / text CV',
    },
    {
      feature: 'Opportunity Pipeline',
      traditional: 'Scattered spreadsheets with manual updates',
      careerBot: 'Built-in local pipeline tracker with celebratory status stages',
    },
  ];

  return (
    <section className="py-24 bg-[#08090a] border-t border-white/[0.06]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a99f8]">
            Comparison
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
            Traditional Job Boards vs CareerBot
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#8a8f98]">
            Why top candidates are switching to conversational ATS sourcing.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0e11]">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/[0.08] bg-[#121316] text-[11px] font-mono uppercase tracking-wider text-zinc-500 p-4 sm:p-5">
            <div className="md:col-span-4 text-zinc-300">Feature / Standard</div>
            <div className="md:col-span-4 text-rose-400 hidden md:block">Legacy Job Boards</div>
            <div className="md:col-span-4 text-[#8a99f8] hidden md:block">CareerBot 2.0</div>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {comparisons.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-3 md:gap-4 items-center hover:bg-white/[0.02] transition"
              >
                <div className="md:col-span-4 font-medium text-white text-xs sm:text-sm">
                  {row.feature}
                </div>

                <div className="md:col-span-4 text-xs text-zinc-400 flex items-start gap-2">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/10 text-rose-400 mt-0.5">
                    <X className="h-3 w-3" />
                  </div>
                  <span>{row.traditional}</span>
                </div>

                <div className="md:col-span-4 text-xs text-zinc-200 flex items-start gap-2 font-medium bg-white/[0.02] md:bg-transparent p-2.5 md:p-0 rounded-lg">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="text-[#d0d6e0]">{row.careerBot}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
