'use client';

import React from 'react';
import { MessageSquare, Cpu, Rocket, ArrowRight } from 'lucide-react';

interface LinearWorkflowProps {
  onStartJobSearch: () => void;
}

const STEPS = [
  {
    step: '01',
    icon: MessageSquare,
    title: 'Prompt or drop your resume',
    description:
      'Describe your dream role in natural language, or upload your CV to extract technical skills and experience levels automatically.',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'Live ATS scan & match scoring',
    description:
      'Our engine queries verified company career portals in real time, calculating transparent 0-100% suitability scores with concrete match rationale.',
  },
  {
    step: '03',
    icon: Rocket,
    title: 'Direct 1-click apply & tailored pitch',
    description:
      'Generate customized pitch bullets and outreach notes with 1 click, then apply directly on the company’s official ATS page.',
  },
];

export const LinearWorkflow: React.FC<LinearWorkflowProps> = ({ onStartJobSearch }) => {
  return (
    <section className="py-24 bg-[#08090a] border-t border-white/[0.06] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a99f8]">
            Workflow
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
            How modern candidates find their next role
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#8a8f98]">
            From conversational prompt to verified application in three frictionless steps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 hover:border-white/[0.18] transition duration-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white">
                    <Icon className="h-5 w-5 text-[#8a99f8]" />
                  </div>
                  <span className="text-xs font-mono text-zinc-600 font-bold">
                    STEP {s.step}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
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
            className="linear-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-semibold text-white transition hover:scale-[1.02]"
          >
            <span>Start Searching Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
