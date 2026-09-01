'use client';

import React, { useState } from 'react';
import { 
  Sliders, 
  Sparkles, 
  DollarSign, 
  Briefcase, 
  Check, 
  ArrowRight, 
  Building, 
  MapPin, 
  Zap, 
  Star 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractiveSalaryMatcherProps {
  onSearchWithFilters: (query: string) => void;
}

const TECH_OPTIONS = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
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
    salary: '$165,000 - $210,000',
    tags: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    ats: 'Ashby',
    matchScore: 98,
  },
  {
    role: 'AI Product Engineer',
    company: 'Anthropic',
    location: 'Remote (US/EU)',
    salary: '$185,000 - $260,000',
    tags: ['Python', 'AI / LLM', 'TypeScript', 'Next.js'],
    ats: 'Greenhouse',
    matchScore: 95,
  },
  {
    role: 'Lead Design Systems Engineer',
    company: 'Vercel',
    location: 'Remote',
    salary: '$170,000 - $225,000',
    tags: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Figma'],
    ats: 'Lever',
    matchScore: 94,
  },
];

export const InteractiveSalaryMatcher: React.FC<InteractiveSalaryMatcherProps> = ({
  onSearchWithFilters,
}) => {
  const [minSalary, setMinSalary] = useState(140);
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
    <section className="py-16 md:py-24 bg-zinc-950 relative border-t border-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-400">
            <Sliders className="h-3.5 w-3.5" />
            <span>Interactive Match Playground</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Configure Your Ideal Compensation & Stack
          </h2>
          <p className="mt-3 text-zinc-400 text-sm sm:text-base">
            Adjust the sliders below to calculate live fit and instant career opportunities.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
            {/* Salary Range Slider */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Target Base Salary
                </label>
                <span className="text-base font-extrabold text-emerald-400">
                  ${minSalary},000+ <span className="text-xs text-zinc-400 font-normal">/ year</span>
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="280"
                step="10"
                value={minSalary}
                onChange={(e) => setMinSalary(Number(e.target.value))}
                className="mt-3 w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500 font-medium">
                <span>$60k</span>
                <span>$150k</span>
                <span>$220k</span>
                <span>$280k+</span>
              </div>
            </div>

            {/* Seniority Level */}
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-1.5 mb-2.5">
                <Briefcase className="h-4 w-4 text-indigo-400" />
                Seniority / Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperience(lvl)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition text-center ${
                      experience === lvl
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Remote Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div>
                <p className="text-sm font-bold text-white">Remote Roles Only</p>
                <p className="text-xs text-zinc-400">Worldwide & country-specific remote</p>
              </div>
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  remoteOnly ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    remoteOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tech Stack Select */}
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-1.5 mb-2.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Select Tech Stack & Focus Areas ({selectedTech.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {TECH_OPTIONS.map((tech) => {
                  const isSelected = selectedTech.includes(tech);
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => toggleTech(tech)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                          : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition hover:scale-[1.01]"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Search Live Roles with These Criteria</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                Live Matched Roles Preview
              </span>
              <span className="text-xs text-indigo-400 font-semibold">
                Updated in Real-Time
              </span>
            </div>

            {SIMULATED_RESULTS.map((item, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/50 hover:bg-zinc-900/90 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                      {item.salary}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-white group-hover:text-indigo-300 transition">
                      {item.role}
                    </h3>
                    <p className="text-xs font-medium text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span className="text-zinc-200 font-semibold">{item.company}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-indigo-400" />
                        {item.location}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-400">
                      {item.matchScore}%
                    </div>
                    <span className="mt-1 text-[10px] text-zinc-500 uppercase font-semibold">
                      {item.ats} ATS
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Direct 1-Click ATS Application Page
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      confetti({ particleCount: 40, spread: 60 });
                      onSearchWithFilters(`${item.role} ${item.company}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <span>View with AI Bot</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
