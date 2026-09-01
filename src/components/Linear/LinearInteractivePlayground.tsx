'use client';

import React, { useState } from 'react';
import { 
  Sliders, 
  DollarSign, 
  Briefcase, 
  Check, 
  ArrowRight, 
  MapPin, 
  Zap, 
  Star,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LinearInteractivePlaygroundProps {
  onSearchWithFilters: (query: string) => void;
}

const TECH_OPTIONS = [
  'React',
  'Next.js',
  'TypeScript',
  'Python',
  'AI / LLM',
  'AWS',
  'Rust',
  'Go',
  'Figma',
  'Tailwind CSS',
  'PostgreSQL',
  'Kubernetes',
  'GraphQL',
];

const EXPERIENCE_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Staff / Lead'];

const SIMULATED_RESULTS = [
  {
    role: 'Senior Full Stack Engineer',
    company: 'Linear',
    location: 'Remote (Global)',
    salary: '$170,000 - $220,000',
    tags: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    ats: 'Ashby',
    matchScore: 98,
  },
  {
    role: 'AI Product Engineer',
    company: 'Anthropic',
    location: 'Remote (US/EU)',
    salary: '$190,000 - $265,000',
    tags: ['Python', 'AI / LLM', 'TypeScript', 'Next.js'],
    ats: 'Greenhouse',
    matchScore: 96,
  },
  {
    role: 'Design Systems Architect',
    company: 'Vercel',
    location: 'Remote',
    salary: '$180,000 - $235,000',
    tags: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Figma'],
    ats: 'Workday',
    matchScore: 94,
  },
];

export const LinearInteractivePlayground: React.FC<LinearInteractivePlaygroundProps> = ({
  onSearchWithFilters,
}) => {
  const [minSalary, setMinSalary] = useState(150);
  const [experience, setExperience] = useState('Senior');
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [selectedTech, setSelectedTech] = useState<string[]>([
    'React',
    'TypeScript',
    'Next.js',
  ]);

  const toggleTech = (tech: string) => {
    if (selectedTech.includes(tech)) {
      if (selectedTech.length > 1) {
        setSelectedTech(selectedTech.filter((t) => t !== tech));
      }
    } else {
      setSelectedTech([...selectedTech, tech]);
      if (selectedTech.length >= 3) {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
        });
      }
    }
  };

  const handleLaunchSearch = () => {
    const remoteStr = remoteOnly ? 'Remote' : '';
    const query = `${experience} ${selectedTech.join(' ')} Developer ${remoteStr} $${minSalary}k+`;
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
    onSearchWithFilters(query.trim());
  };

  return (
    <section id="matcher" className="py-24 bg-[#08090a] border-t border-white/[0.06] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a99f8]">
            Interactive Compensation & Stack Playground
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
            Fine-tune your target role and salary expectations
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#8a8f98]">
            Adjust the parameters below to compute match density and preview verified opportunities in real time.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            {/* Salary Range Slider */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                  Target Base Compensation
                </label>
                <span className="text-sm font-bold text-white font-mono">
                  ${minSalary},000+ <span className="text-xs text-zinc-500 font-normal">/ yr</span>
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="280"
                step="10"
                value={minSalary}
                onChange={(e) => setMinSalary(Number(e.target.value))}
                className="mt-3 w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#5e6ad2]"
              />
              <div className="mt-2 flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>$60k</span>
                <span>$150k</span>
                <span>$220k</span>
                <span>$280k+</span>
              </div>
            </div>

            {/* Seniority Level */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                Seniority Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperience(lvl)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition text-center ${
                      experience === lvl
                        ? 'bg-[#5e6ad2] text-white shadow-md shadow-indigo-500/20'
                        : 'border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Remote Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/40 p-4">
              <div>
                <p className="text-xs font-semibold text-white">Remote Roles Only</p>
                <p className="text-[11px] text-zinc-500">Global & region-flexible openings</p>
              </div>
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  remoteOnly ? 'bg-[#5e6ad2]' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    remoteOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tech Stack Select */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Select Technologies ({selectedTech.length} selected)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TECH_OPTIONS.map((tech) => {
                  const isSelected = selectedTech.includes(tech);
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => toggleTech(tech)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-white/[0.12] border border-white/[0.2] text-white shadow-sm'
                          : 'border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-[#8a99f8]" />}
                      <span>{tech}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleLaunchSearch}
              className="linear-button-primary w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-semibold text-white transition hover:scale-[1.01]"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Launch AI Search with Exact Parameters</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                Live Matched Roles
              </span>
              <span className="text-xs font-mono text-[#8a99f8]">
                Real-Time Sourced
              </span>
            </div>

            {SIMULATED_RESULTS.map((item, idx) => (
              <div
                key={idx}
                className="group rounded-xl border border-white/[0.08] bg-[#0d0e11] p-4 sm:p-5 transition-all duration-200 hover:border-white/[0.18] hover:bg-[#121316]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                      {item.salary}
                    </span>
                    <h3 className="mt-2 text-sm sm:text-base font-semibold text-white group-hover:text-[#8a99f8] transition">
                      {item.role}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span className="text-zinc-200 font-medium">{item.company}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <MapPin className="h-3 w-3 text-indigo-400" />
                        {item.location}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-bold text-white">
                      {item.matchScore}%
                    </div>
                    <span className="mt-1 text-[9px] text-zinc-500 uppercase font-mono">
                      {item.ats}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Direct verified ATS posting
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      confetti({ particleCount: 30, spread: 50 });
                      onSearchWithFilters(`${item.role} ${item.company}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#8a99f8] hover:text-white transition"
                  >
                    <span>View in AI Bot</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
