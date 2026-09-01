'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  BookmarkCheck, 
  Zap, 
  ArrowRight,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LinearBentoProps {
  onOpenResume: () => void;
  onSearch: (query: string) => void;
}

export const LinearBento: React.FC<LinearBentoProps> = ({ onOpenResume, onSearch }) => {
  return (
    <section id="features" className="py-24 bg-[#08090a] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a99f8]">
            Engineered for Precision & Speed
          </p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-white">
            Built from the ground up for modern engineers and builders
          </h2>
          <p className="mt-4 text-base text-[#8a8f98] leading-relaxed">
            Every layer of CareerBot is optimized to eliminate friction: zero recruiter email walls, direct ATS deep-linking, explainable AI scoring, and instant application tailoring.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Direct ATS Deep-Linking (2 columns) */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 relative overflow-hidden group hover:border-white/[0.18] transition duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#8a99f8] mb-6">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              100% Direct Career Page & ATS Deep-Linking
            </h3>
            <p className="mt-2 text-sm text-[#8a8f98] leading-relaxed">
              Every job card links directly to the company’s verified hiring portal (Greenhouse, Lever, Ashby, Workday). Your application goes straight into the hiring team’s pipeline.
            </p>

            <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/40 p-3.5 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Target ATS Endpoint:
                </span>
                <span className="text-[#8a99f8] truncate max-w-[220px]">
                  boards.greenhouse.io/stripe/jobs/59182
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 pt-1 border-t border-white/[0.04]">
                <span>Middleman Intermediaries:</span>
                <span className="text-emerald-400 font-bold">0 (Bypassed)</span>
              </div>
            </div>
          </div>

          {/* Card 2: AI Fit Scoring */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 relative overflow-hidden group hover:border-white/[0.18] transition duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-6">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Explainable AI Match Fit
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
              Understand why each job matches your skillset with quantified 0-100% suitability scores and tailored match rationales.
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">98%</span>
              <span className="text-xs text-emerald-400 font-mono">High Affinity</span>
            </div>
          </div>

          {/* Card 3: 1-Click Pitch Generator */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 relative overflow-hidden group hover:border-white/[0.18] transition duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mb-6">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              1-Click Pitch Generator
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
              Auto-generate custom bullet points, introductory outreach notes, and interview prep questions tailored to the exact role.
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-[11px] font-mono text-zinc-300">
                ✨ Ready-to-copy snippet
              </span>
            </div>
          </div>

          {/* Card 4: Resume-Aware Matching (2 columns) */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 relative overflow-hidden group hover:border-white/[0.18] transition duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-6">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              Instant Resume Skill Parsing
            </h3>
            <p className="mt-2 text-sm text-[#8a8f98] leading-relaxed">
              Drop or paste your CV. Our AI parses technical competencies, seniority level, and previous titles to immediately query matched openings across verified career portals.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  confetti({ particleCount: 30, spread: 50 });
                  onOpenResume();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:border-white/[0.16] hover:bg-white/[0.08] transition"
              >
                <span>Open Resume Parser</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 5: Pipeline Kanban (2 columns) */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 relative overflow-hidden group hover:border-white/[0.18] transition duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
              <BookmarkCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              Built-in Opportunity Pipeline
            </h3>
            <p className="mt-2 text-sm text-[#8a8f98] leading-relaxed">
              Save favorite roles with confetti celebrations. Track applications through stages: <span className="font-mono text-zinc-300">Saved</span> → <span className="font-mono text-zinc-300">Applied</span> → <span className="font-mono text-indigo-300">Interviewing</span> → <span className="font-mono text-emerald-400">Offer</span>.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="rounded bg-white/[0.04] px-2 py-1 text-zinc-400 border border-white/[0.06]">Saved (3)</span>
              <span className="text-zinc-600">→</span>
              <span className="rounded bg-white/[0.04] px-2 py-1 text-zinc-400 border border-white/[0.06]">Applied (2)</span>
              <span className="text-zinc-600">→</span>
              <span className="rounded bg-[#5e6ad2]/20 px-2 py-1 text-[#8a99f8] border border-[#5e6ad2]/30">Interviewing (1)</span>
              <span className="text-zinc-600">→</span>
              <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-400 border border-emerald-500/30">Offer ($190k) 🎉</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
