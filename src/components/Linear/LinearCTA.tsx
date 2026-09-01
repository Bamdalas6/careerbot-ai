'use client';

import React from 'react';
import { Zap, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LinearCTAProps {
  onStartSearch: () => void;
}

export const LinearCTA: React.FC<LinearCTAProps> = ({ onStartSearch }) => {
  const handleClick = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#5e6ad2', '#8a99f8', '#ec4899', '#38bdf8'],
    });
    onStartSearch();
  };

  return (
    <section className="py-24 bg-[#08090a] border-t border-white/[0.06] relative overflow-hidden">
      {/* Ambient bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[300px] linear-spotlight-indigo pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs font-medium text-zinc-300 backdrop-blur-md mb-6">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Zero Recruiter Spam • 100% Direct ATS Verification</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-white">
          Ready to experience the future <br className="hidden sm:inline" />
          of job hunting?
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-[#8a8f98]">
          Join thousands of engineers and builders discovering verified opportunities without middleman delays.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleClick}
            className="linear-button-primary flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.02] shadow-xl"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            <span>Launch AI Job Assistant</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
