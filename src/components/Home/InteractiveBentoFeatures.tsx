'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  BookmarkCheck, 
  TrendingUp, 
  Zap, 
  Cpu, 
  CheckCircle2, 
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractiveBentoFeaturesProps {
  onOpenResume: () => void;
  onSearch: (query: string) => void;
}

export const InteractiveBentoFeatures: React.FC<InteractiveBentoFeaturesProps> = ({
  onOpenResume,
  onSearch,
}) => {
  return (
    <section className="py-20 bg-zinc-950 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-400">
            <Zap className="h-3.5 w-3.5" />
            <span>Supercharged Job Hunting</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Built to Outsmart Traditional Job Boards
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            No sponsored ads, no outdated 6-month postings, and zero recruiter middleman games.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Bento Item 1: Direct ATS Deep Linking (Wide Card) */}
          <div className="md:col-span-2 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/50 transition duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition">
              100% Direct Career Page & ATS Deep-Linking
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Every job card links directly to the company’s verified hiring portal (Greenhouse, Lever, Ashby, Workday). Your application goes straight into the hiring team’s pipeline without third-party email harvesters.
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Verified Company URL:
                </span>
                <span className="font-mono text-indigo-400 truncate max-w-[200px]">
                  boards.greenhouse.io/stripe/jobs/59182
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Middleman Intermediaries:</span>
                <span className="text-emerald-400 font-bold">0 (Bypassed)</span>
              </div>
            </div>
          </div>

          {/* Bento Item 2: AI Match Scoring (Standard Card) */}
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-violet-500/50 transition duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-6">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-violet-300 transition">
              Explainable AI Match Fit
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Understand why each job fits your skillset with quantified 0-100% suitability scores and tailored match rationales.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="text-3xl font-black text-violet-400">97%</div>
              <div className="text-xs text-zinc-400 font-medium">
                High compatibility with TypeScript & React systems
              </div>
            </div>
          </div>

          {/* Bento Item 3: 1-Click Tailored Pitch (Standard Card) */}
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-pink-500/50 transition duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mb-6">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-pink-300 transition">
              1-Click Pitch Generator
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Auto-generate custom bullet points, introductory outreach notes, and interview prep questions for any opening with 1 click.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1 rounded-lg bg-pink-500/10 px-2.5 py-1 text-xs font-semibold text-pink-400 border border-pink-500/20">
                ✨ Ready to paste to recruiter
              </span>
            </div>
          </div>

          {/* Bento Item 4: Resume Match (Wide Card) */}
          <div className="md:col-span-2 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/50 transition duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-6">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition">
              Instant Resume Skill Extraction
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Paste or drop your CV. Our AI parses technical competencies, seniority level, and past titles to automatically query matched openings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  confetti({ particleCount: 30, spread: 50 });
                  onOpenResume();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
              >
                <span>Try Resume Parser Modal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Item 5: Pipeline & Application Tracker */}
          <div className="md:col-span-2 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/50 transition duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
              <BookmarkCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition">
              Confetti-Powered Opportunity Pipeline
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Bookmark target opportunities with celebratory confetti. Track your journey from <code className="text-zinc-200">Saved</code> to <code className="text-zinc-200">Applied</code> to <code className="text-emerald-400 font-semibold">Offer Received</code>.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">Saved</span>
              <span>→</span>
              <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">Applied</span>
              <span>→</span>
              <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-indigo-400">Interviewing</span>
              <span>→</span>
              <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-emerald-400 border border-emerald-500/30">Offer 🎉</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
