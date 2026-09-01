'use client';

import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';

export const ComparisonTable: React.FC = () => {
  const comparisons = [
    {
      feature: 'Application Destination',
      traditional: 'Third-party boards / recruiter email harvesting forms',
      careerBot: 'Direct 1-Click verified company ATS portals (Greenhouse, Lever, Workday)',
    },
    {
      feature: 'Search Experience',
      traditional: '25 rigid dropdown filter menus & sponsored ad listings',
      careerBot: 'Natural language AI chat with instant parameter understanding',
    },
    {
      feature: 'Match Transparency',
      traditional: 'Vague black-box recommendations without reason',
      careerBot: 'Quantified 0-100% score with specific skill breakdown',
    },
    {
      feature: 'Application Tailoring',
      traditional: 'Manual hours rewriting bullets and cover letters',
      careerBot: '1-Click customized pitch bullets & interview tips generated instantly',
    },
    {
      feature: 'Resume Input',
      traditional: 'Repetitive manual profile form filling',
      careerBot: '1-Click resume drop with automated skill extraction',
    },
    {
      feature: 'Tracking Pipeline',
      traditional: 'Manual spreadsheets that get abandoned',
      careerBot: 'Built-in celebratory pipeline with instant local persistence',
    },
  ];

  return (
    <section className="py-20 bg-zinc-950 border-t border-zinc-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Head-to-Head Comparison
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Traditional Job Boards vs CareerBot AI
          </h2>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            See how conversational AI changes the rules of job hunting.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-zinc-800 bg-zinc-900/90 text-xs font-bold uppercase tracking-wider text-zinc-400 p-4 sm:p-5">
            <div className="md:col-span-4 text-white">Feature / Workflow</div>
            <div className="md:col-span-4 text-rose-400 hidden md:block">Old Traditional Way</div>
            <div className="md:col-span-4 text-indigo-400 hidden md:block flex items-center gap-1">
              <span>CareerBot AI</span>
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {comparisons.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-3 md:gap-4 items-center hover:bg-zinc-850/50 transition"
              >
                <div className="md:col-span-4 font-bold text-white text-sm">
                  {row.feature}
                </div>

                <div className="md:col-span-4 text-xs text-zinc-400 flex items-start gap-2">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 mt-0.5">
                    <X className="h-3 w-3" />
                  </div>
                  <span>{row.traditional}</span>
                </div>

                <div className="md:col-span-4 text-xs text-indigo-200 flex items-start gap-2 font-medium bg-indigo-950/20 md:bg-transparent p-2 md:p-0 rounded-xl">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>{row.careerBot}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
