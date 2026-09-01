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
  ChevronRight,
  Command,
  Flame,
  FileText,
  Sliders,
  Send,
  Layers,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LinearHeroProps {
  onSearch: (query: string) => void;
  onOpenResume: () => void;
}

const SAMPLE_SEARCHES = [
  'Senior React & Next.js Developer Remote $160k+',
  'AI / Machine Learning Engineer at OpenAI or Anthropic',
  'Lead Product & UI/UX Designer Remote',
  'Staff DevOps & Kubernetes Engineer $190k+',
  'Full Stack TypeScript & Python Developer'
];

const TRENDING_TAGS = [
  { label: 'Remote React & Next.js', query: 'Senior React Developer Remote' },
  { label: 'AI / LLM Engineer', query: 'AI Machine Learning Engineer $160k+' },
  { label: 'Lead Product Designer', query: 'Senior Product Designer Remote' },
  { label: 'DevOps / SRE $180k+', query: 'DevOps Cloud Engineer AWS' },
  { label: 'Founding Engineer', query: 'Founding Engineer Startup $150k+' },
];

export const LinearHero: React.FC<LinearHeroProps> = ({ onSearch, onOpenResume }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [activeMockTab, setActiveMockTab] = useState<'feed' | 'match' | 'pitch' | 'pipeline'>('feed');
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SAMPLE_SEARCHES.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  const triggerFunConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5e6ad2', '#8a99f8', '#ec4899', '#38bdf8'],
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim() || SAMPLE_SEARCHES[placeholderIndex];
    triggerFunConfetti();
    onSearch(query);
  };

  const handleTagClick = (query: string) => {
    triggerFunConfetti();
    onSearch(query);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 linear-grid">
      {/* Linear's signature top light spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] linear-spotlight pointer-events-none" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] linear-spotlight-indigo pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Linear-Style Announcement Pill */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onSearch('AI Engineer Greenhouse remote')}
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-md transition hover:border-white/[0.18] hover:bg-white/[0.06]"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#5e6ad2] shadow-[0_0_8px_#5e6ad2]" />
            <span className="font-semibold text-white">Introducing CareerBot 2.0</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Direct ATS Verification & Matching</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 text-zinc-300" />
          </button>
        </div>

        {/* Linear-Style Hero Title */}
        <div className="mt-8 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8] sm:text-6xl lg:text-7xl leading-[1.08]">
            CareerBot is a better way <br />
            <span className="bg-gradient-to-r from-[#d0d6e0] via-[#8a99f8] to-[#5e6ad2] bg-clip-text text-transparent">
              to find tech jobs
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#8a8f98] leading-relaxed">
            Meet the new standard for modern job discovery. Streamline your job hunt with conversational intelligence, verified ATS deep-links, and 1-click application pitches.
          </p>
        </div>

        {/* Hero Interactive Search Bar (Command Menu Style) */}
        <div className="mx-auto mt-10 max-w-3xl">
          <form
            onSubmit={handleFormSubmit}
            className="group relative rounded-2xl border border-white/[0.12] bg-[#121316]/90 p-2 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:border-white/[0.22] focus-within:border-[#5e6ad2] focus-within:ring-4 focus-within:ring-[#5e6ad2]/20"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex flex-1 items-center w-full pl-3">
                <Search className="h-4 w-4 text-zinc-400 shrink-0 mr-3 transition group-focus-within:text-[#8a99f8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Try: "${SAMPLE_SEARCHES[placeholderIndex]}"`}
                  className="w-full bg-transparent py-3 pr-3 text-sm text-white placeholder-[#62666d] focus:outline-none font-sans"
                />
                <div className="hidden sm:flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-[10px] font-mono text-zinc-500">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>

              <div className="flex w-full sm:w-auto items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-zinc-300 hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white transition"
                  title="Upload / Paste resume"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Resume</span>
                </button>

                <button
                  type="submit"
                  className="linear-button-primary flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Search Jobs</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </form>

          {/* Trending Suggestions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              <Flame className="h-3 w-3 text-amber-400" /> Hot:
            </span>
            {TRENDING_TAGS.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTagClick(tag.query)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs font-medium text-zinc-400 backdrop-blur-sm transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-zinc-200"
              >
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Linear-Style Interactive Product Frame Mockup */}
        <div className="mt-14 lg:mt-16 mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-white/[0.1] bg-[#0e0f12] shadow-[0_20px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden">
            {/* Window Top Bar (macOS style micro-controls) */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#121316] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/70" />
                <span className="ml-2 text-[11px] font-mono text-zinc-500">careerbot.app — live session</span>
              </div>

              {/* Interactive Tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/40 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveMockTab('feed')}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    activeMockTab === 'feed' ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ⚡ Live Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMockTab('match')}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    activeMockTab === 'match' ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🎯 AI Rationale
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMockTab('pitch')}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    activeMockTab === 'pitch' ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  📝 1-Click Pitch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMockTab('pipeline')}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    activeMockTab === 'pipeline' ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  📌 Pipeline
                </button>
              </div>
            </div>

            {/* Inner Interactive Card Showcase */}
            <div className="p-5 sm:p-7">
              {activeMockTab === 'feed' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#5e6ad2] to-[#8a99f8] font-bold text-white shadow-lg shadow-indigo-500/20">
                        L
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            Senior Frontend Systems Engineer
                          </h3>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                            Live ATS
                          </span>
                        </div>
                        <p className="text-xs text-[#8a8f98]">Linear • Core Product Experience</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-zinc-300">
                        <MapPin className="h-3 w-3 text-[#8a99f8]" /> Remote (US / EMEA / APAC)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400 font-medium">
                        <DollarSign className="h-3 w-3" /> $175,000 – $220,000 + Equity
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-zinc-400">
                        <Building2 className="h-3 w-3" /> Ashby ATS Verified
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-xs text-zinc-300">
                      <p className="flex items-center gap-1.5 font-semibold text-[#8a99f8]">
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        AI Suitability Insight:
                      </p>
                      <p className="mt-1 text-[#8a8f98] leading-relaxed">
                        98% alignment with your React 19, client-side caching, desktop electron experience, and high-performance UI optimization.
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#5e6ad2] to-[#8a99f8] p-[2px] shadow-lg shadow-indigo-500/20">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0e0f12]">
                        <span className="text-xl font-black text-white font-mono">98%</span>
                      </div>
                    </div>
                    <span className="mt-2 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                      Direct ATS Match
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTagClick('Senior Frontend Systems Linear')}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#5e6ad2] px-3 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#6875e5] transition"
                    >
                      <span>Direct Apply Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {activeMockTab === 'match' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="font-semibold text-white text-sm">Detailed Skill & Compatibility Matrix</span>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5">98% Match Rate</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-zinc-500 text-[10px] uppercase font-mono">Primary Tech Match</p>
                      <p className="font-bold text-white mt-1">React 19 & TypeScript</p>
                      <p className="text-emerald-400 mt-1">✓ 100% Alignment</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-zinc-500 text-[10px] uppercase font-mono">System Architecture</p>
                      <p className="font-bold text-white mt-1">Client Sync & MobX</p>
                      <p className="text-emerald-400 mt-1">✓ 96% Alignment</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-zinc-500 text-[10px] uppercase font-mono">Seniority & Comp</p>
                      <p className="font-bold text-white mt-1">$175k–$220k Range</p>
                      <p className="text-emerald-400 mt-1">✓ Within Target Band</p>
                    </div>
                  </div>
                </div>
              )}

              {activeMockTab === 'pitch' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div>
                      <span className="font-semibold text-white text-sm">Auto-Generated Hiring Manager Note</span>
                      <p className="text-zinc-400 text-[11px]">Personalized to Linear&apos;s Frontend opening</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCopiedPitch(true);
                        triggerFunConfetti();
                        setTimeout(() => setCopiedPitch(false), 2000);
                      }}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-zinc-300 hover:text-white transition flex items-center gap-1"
                    >
                      {copiedPitch ? <Check className="h-3 w-3 text-emerald-400" /> : <Layers className="h-3 w-3" />}
                      <span>{copiedPitch ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </button>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-zinc-300 font-sans leading-relaxed">
                    &quot;Hi Linear team — I saw your Senior Frontend role and wanted to apply directly. Over the last 4 years I specialized in sub-100ms client sync pipelines, complex React state abstractions, and snappy desktop-grade UX. Would love to contribute to Linear&apos;s craft!&quot;
                  </div>
                </div>
              )}

              {activeMockTab === 'pipeline' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="font-semibold text-white text-sm">Opportunity Pipeline Tracker</span>
                    <span className="text-zinc-500 font-mono">4 Active Opportunities</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono">Saved (2)</span>
                      <p className="font-bold text-white text-xs mt-1">Stripe, Figma</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono">Applied (1)</span>
                      <p className="font-bold text-white text-xs mt-1">Linear (Ashby)</p>
                    </div>
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5">
                      <span className="text-[10px] text-[#8a99f8] uppercase font-mono font-semibold">Interviewing (1)</span>
                      <p className="font-bold text-white text-xs mt-1">Vercel (Round 2)</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                      <span className="text-[10px] text-emerald-400 uppercase font-mono font-semibold">Offer 🎉</span>
                      <p className="font-bold text-white text-xs mt-1">$195k Received</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linear-Style Metric Strip */}
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8 border-t border-white/[0.06] pt-10">
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-white font-mono">12,500+</p>
            <p className="mt-1 text-xs text-zinc-500">Live Roles Sourced</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-[#8a99f8] font-mono">100%</p>
            <p className="mt-1 text-xs text-zinc-500">Direct ATS Deep-Links</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-emerald-400 font-mono">0%</p>
            <p className="mt-1 text-xs text-zinc-500">Recruiter Traps & Spam</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-zinc-300 font-mono">&lt; 50ms</p>
            <p className="mt-1 text-xs text-zinc-500">Query Resolution Speed</p>
          </div>
        </div>
      </div>
    </section>
  );
};
