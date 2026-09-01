'use client';

import React from 'react';
import { MessageSquareText, SearchCode, Rocket, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onStartJobSearch: () => void;
}

const STEPS = [
  {
    step: '01',
    icon: MessageSquareText,
    color: 'from-indigo-500 to-violet-600',
    title: '1. Chat Naturally with the AI',
    description:
      'Tell the assistant what you are looking for—roles, remote preferences, tech stacks, minimum salaries, or specific dream companies. Or simply drop your resume to extract skills automatically.',
  },
  {
    step: '02',
    icon: SearchCode,
    color: 'from-violet-500 to-pink-600',
    title: '2. Live ATS Sourcing & AI Scoring',
    description:
      'CareerBot AI queries live ATS systems (Greenhouse, Lever, Workday) and public feeds, filtering out ghost jobs and calculating a transparent 0-100% suitability match score with detailed rationale.',
  },
  {
    step: '03',
    icon: Rocket,
    color: 'from-pink-500 to-amber-500',
    title: '3. 1-Click Direct Apply & Tailored Pitch',
    description:
      'Generate high-converting customized pitch bullets and outreach notes with 1 click, then click straight through to the verified company application portal without middleman spam.',
  },
];

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartJobSearch }) => {
  return (
    <section className="py-20 bg-zinc-900/40 border-t border-zinc-900 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Simple 3-Step Process
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            How CareerBot AI Accelerates Your Search
          </h2>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            From conversational prompt to verified application in under 60 seconds.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 backdrop-blur-md transition hover:border-indigo-500/50 hover:bg-zinc-850"
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr ${s.color} text-white shadow-lg`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-3xl font-black text-zinc-700 font-mono">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onStartJobSearch}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition hover:scale-105"
          >
            <span>Launch Live Job Search</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
