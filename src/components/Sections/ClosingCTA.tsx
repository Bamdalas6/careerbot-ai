'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ClosingCTAProps {
  onStartSearch: () => void;
  onOpenResume: () => void;
}

export const ClosingCTA: React.FC<ClosingCTAProps> = ({ onStartSearch, onOpenResume }) => {
  return (
    <section id="start" className="rule-t relative w-full overflow-hidden">
      <div aria-hidden="true" className="hero-wash pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-5 py-24 text-center sm:px-8 sm:py-32">
        <div className="flex flex-col gap-4">
          <span className="eyebrow">Fig 0.3 — Now then</span>
          <h2 className="max-w-2xl text-[30px] font-medium leading-[1.12] tracking-[-0.03em] text-zinc-900 dark:text-[#f7f8f8] sm:text-[46px]">
            Still unemployed?
            <span className="block text-zinc-500 dark:text-[#8a8f98]">Let’s ruin that streak.</span>
          </h2>
          <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
            One sentence about the job you want is enough to start. No account, no
            onboarding, no seventeen-field profile builder.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onStartSearch}
            className="btn-light inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs"
          >
            Start searching
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenResume}
            className="glass-chip rounded-xl px-5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-[#f7f8f8]"
          >
            Upload a resume instead
          </button>
        </div>
      </div>
    </section>
  );
};
