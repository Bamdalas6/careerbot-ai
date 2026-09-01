'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Bot, 
  Building2, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onOpenResume: () => void;
}

const SAMPLE_SEARCHES = [
  'Senior React & Next.js Developer Remote $150k+',
  'AI / Machine Learning Engineer at OpenAI or Anthropic',
  'Lead Product & UI/UX Designer Remote',
  'Staff DevOps & Kubernetes Engineer $180k',
  'Full Stack TypeScript & Python Developer'
];

const TRENDING_TAGS = [
  { label: '🌐 Remote React', query: 'Senior React Developer Remote' },
  { label: '🤖 AI / LLM Engineer', query: 'AI Machine Learning Engineer $160k+' },
  { label: '🎨 Senior Product Designer', query: 'Senior Product Designer Remote' },
  { label: '⚡ Next.js / TypeScript', query: 'Next.js TypeScript Developer' },
  { label: '🛡️ DevOps & Cloud', query: 'DevOps Cloud Engineer AWS' },
  { label: '🚀 Startups ($140k+)', query: 'Tech Startup Remote $140k' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch, onOpenResume }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [previewLiked, setPreviewLiked] = useState(false);

  // Rotate placeholder text smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SAMPLE_SEARCHES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const triggerFunConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'],
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryToUse = searchQuery.trim() || SAMPLE_SEARCHES[placeholderIndex];
    triggerFunConfetti();
    onSearch(queryToUse);
  };

  const handleTagClick = (query: string) => {
    triggerFunConfetti();
    onSearch(query);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/20 to-pink-500/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Floating Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/50 px-4 py-1.5 text-xs sm:text-sm font-medium text-indigo-300 shadow-inner backdrop-blur-md transition hover:border-indigo-500/50 hover:bg-indigo-900/40">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-emerald-400">Live ATS Feeds</span>
            <span className="text-zinc-600">•</span>
            <span>Direct Greenhouse, Lever & Workday Links</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          </div>
        </div>

        {/* Hero Headline */}
        <div className="mt-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Talk to AI.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">
              Skip The Recruiter Traps.
            </span>
            <br />
            Apply Directly.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
            The conversational job discovery engine that queries live company career portals, calculates true skill match scores, and provides <strong className="text-zinc-200">1-click direct links</strong> to real company ATS applications without middleman clutter.
          </p>
        </div>

        {/* Hero Search Box (The Main Fun Interactive Element) */}
        <div className="mx-auto mt-10 max-w-3xl">
          <form
            onSubmit={handleFormSubmit}
            className="group relative rounded-2xl border-2 border-zinc-800 bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/60 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex flex-1 items-center w-full pl-3">
                <Search className="h-5 w-5 text-indigo-400 shrink-0 mr-2.5 transition group-focus-within:text-indigo-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Try: "${SAMPLE_SEARCHES[placeholderIndex]}"`}
                  className="w-full bg-transparent py-3 pr-4 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div className="flex w-full sm:w-auto items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700 hover:text-white transition"
                  title="Drop your resume to auto-search"
                >
                  <Briefcase className="h-4 w-4 text-indigo-400" />
                  <span>Resume Match</span>
                </button>

                <button
                  type="submit"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-4 w-4 text-amber-300 animate-bounce" />
                  <span>Search Jobs</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Quick Trending Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <span className="text-amber-400">🔥</span> Trending:
            </span>
            {TRENDING_TAGS.map((tag, idx) => (
              <button
                key={idx}
                onClick={() => handleTagClick(tag.query)}
                className="group inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-xs font-medium text-zinc-400 backdrop-blur-sm transition hover:border-indigo-500/40 hover:bg-zinc-800 hover:text-indigo-200"
              >
                <span>{tag.label}</span>
                <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-indigo-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Floating Preview Card Showcase */}
        <div className="mt-14 lg:mt-16 mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
            {/* Header of the interactive demo */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-md">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Live AI Match Preview
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Direct ATS Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Calculated for: <span className="text-zinc-200 font-medium">&quot;Senior Frontend Engineer (React, Next.js, TypeScript)&quot;</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewLiked(!previewLiked);
                  if (!previewLiked) triggerFunConfetti();
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  previewLiked
                    ? 'border-pink-500/50 bg-pink-500/10 text-pink-300 shadow-sm'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span>{previewLiked ? '❤️ Saved to Pipeline' : '🤍 Save Example'}</span>
              </button>
            </div>

            {/* Simulated Live Card Body */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 font-black text-white text-lg shadow-md">
                    S
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Staff Frontend Engineer — Platform UI
                      </h3>
                    </div>
                    <p className="text-xs font-semibold text-indigo-300">Stripe • Global Infrastructure Team</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">
                    <MapPin className="h-3 w-3 text-indigo-400" /> Remote (US / EMEA)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-emerald-400 font-semibold">
                    <DollarSign className="h-3 w-3" /> $190,000 – $245,000 / yr + Equity
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-400">
                    <Building2 className="h-3 w-3" /> Greenhouse ATS
                  </span>
                </div>

                {/* AI Rationale */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-3 text-xs text-indigo-200">
                  <p className="flex items-center gap-1.5 font-semibold text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    AI Match Insight:
                  </p>
                  <p className="mt-1 text-zinc-300 leading-relaxed">
                    96% alignment with your React 19, TypeScript architecture, and design system performance optimization experience.
                  </p>
                </div>
              </div>

              {/* Right Side: Score Meter & Direct Action */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 p-1 shadow-lg shadow-indigo-500/20">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950">
                    <span className="text-xl font-black text-white">96%</span>
                  </div>
                </div>
                <span className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Exceptional Fit
                </span>

                <button
                  type="button"
                  onClick={() => handleTagClick('Staff Frontend Engineer Stripe')}
                  className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition"
                >
                  <span>Direct Apply Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Social Proof Stats Bar */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">12,500+</p>
            <p className="mt-1 text-xs font-medium text-zinc-400">Live Roles Sourced</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">100%</p>
            <p className="mt-1 text-xs font-medium text-zinc-400">Verified Direct Links</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">0%</p>
            <p className="mt-1 text-xs font-medium text-zinc-400">Recruiter Spam / Trap</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <p className="text-2xl sm:text-3xl font-extrabold text-pink-400">&lt; 2.5s</p>
            <p className="mt-1 text-xs font-medium text-zinc-400">Instant AI Matching</p>
          </div>
        </div>
      </div>
    </section>
  );
};
