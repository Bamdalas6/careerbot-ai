'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface LinearFooterProps {
  onStartSearch: () => void;
  onOpenResume: () => void;
}

export const LinearFooter: React.FC<LinearFooterProps> = ({
  onStartSearch,
  onOpenResume,
}) => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#08090a] py-14 text-xs text-[#8a8f98]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5e6ad2] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-white font-mono text-sm">CareerBot AI</span>
            </div>
            <p className="text-xs text-[#8a8f98] max-w-xs leading-relaxed">
              The modern conversational job discovery platform with direct ATS deep-linking, explainable fit scoring, and 1-click tailored pitches.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>All ATS Integrations Operational</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white font-mono uppercase tracking-wider text-[11px] mb-3">
              Platform
            </p>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={onStartSearch}
                  className="hover:text-white transition"
                >
                  AI Job Search
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="hover:text-white transition"
                >
                  Resume Parser
                </button>
              </li>
              <li>
                <a href="#matcher" className="hover:text-white transition">
                  Compensation Matcher
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition">
                  1-Click Pitches
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-white font-mono uppercase tracking-wider text-[11px] mb-3">
              Direct Portals
            </p>
            <ul className="space-y-2">
              <li><span className="hover:text-white transition cursor-pointer">Greenhouse ATS</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Lever ATS</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Ashby ATS</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Workday Direct</span></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-white font-mono uppercase tracking-wider text-[11px] mb-3">
              Company
            </p>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              <li><span className="hover:text-white transition cursor-pointer">Privacy First</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Zero Recruiter Spam</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Changelog</span></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/[0.04] pt-8 text-[11px] text-zinc-500 font-mono">
          <p>© 2026 CareerBot AI. Engineered for modern candidates.</p>
          <p className="mt-2 sm:mt-0">Linear-grade speed & craft.</p>
        </div>
      </div>
    </footer>
  );
};
