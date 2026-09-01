'use client';

import React from 'react';
import { Building2, ArrowUpRight, CheckCircle2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LiveCompanyTickerProps {
  onSelectCompany: (company: string) => void;
}

const FEATURED_COMPANIES = [
  {
    name: 'OpenAI',
    initial: 'O',
    gradient: 'from-emerald-500 to-teal-700',
    ats: 'Greenhouse',
    rolesCount: '48+ roles',
    popularRole: 'Research & Frontend Engineer',
    query: 'OpenAI jobs remote',
  },
  {
    name: 'Stripe',
    initial: 'S',
    gradient: 'from-violet-600 to-indigo-700',
    ats: 'Greenhouse',
    rolesCount: '110+ roles',
    popularRole: 'Staff Infrastructure & React',
    query: 'Stripe engineering roles',
  },
  {
    name: 'Anthropic',
    initial: 'A',
    gradient: 'from-amber-600 to-orange-700',
    ats: 'Greenhouse',
    rolesCount: '35+ roles',
    popularRole: 'Full Stack & AI Safety',
    query: 'Anthropic jobs',
  },
  {
    name: 'Vercel',
    initial: 'V',
    gradient: 'from-zinc-700 to-zinc-900',
    ats: 'Workday',
    rolesCount: '28+ roles',
    popularRole: 'Next.js & DX Engineer',
    query: 'Vercel developer experience',
  },
  {
    name: 'Linear',
    initial: 'L',
    gradient: 'from-indigo-500 to-purple-600',
    ats: 'Ashby',
    rolesCount: '19+ roles',
    popularRole: 'Product & Desktop Engineer',
    query: 'Linear app developer remote',
  },
  {
    name: 'Figma',
    initial: 'F',
    gradient: 'from-pink-600 to-rose-700',
    ats: 'Greenhouse',
    rolesCount: '42+ roles',
    popularRole: 'Design Systems & Graphics',
    query: 'Figma software engineer',
  },
  {
    name: 'Supabase',
    initial: 'S',
    gradient: 'from-emerald-600 to-teal-800',
    ats: 'Workday',
    rolesCount: '24+ roles',
    popularRole: 'PostgreSQL & Cloud Platform',
    query: 'Supabase remote engineering',
  },
  {
    name: 'Datadog',
    initial: 'D',
    gradient: 'from-purple-600 to-violet-900',
    ats: 'Greenhouse',
    rolesCount: '85+ roles',
    popularRole: 'Observability & SRE',
    query: 'Datadog DevOps engineer',
  },
];

export const LiveCompanyTicker: React.FC<LiveCompanyTickerProps> = ({
  onSelectCompany,
}) => {
  const handleClick = (query: string) => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
    });
    onSelectCompany(query);
  };

  return (
    <section className="py-16 bg-zinc-900/30 border-y border-zinc-900 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Verified ATS Integrations</span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Hiring Now at Top Tech Companies
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400">
              Click any company to instantly inspect live career portals and matching roles.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Direct Greenhouse, Lever & Ashby deep-linking</span>
          </div>
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_COMPANIES.map((comp) => (
            <button
              key={comp.name}
              type="button"
              onClick={() => handleClick(comp.query)}
              className="group text-left rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/60 hover:bg-zinc-850 hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${comp.gradient} font-black text-white text-base shadow-md`}
                  >
                    {comp.initial}
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-indigo-300 transition text-sm">
                      {comp.name}
                    </h3>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {comp.rolesCount}
                    </span>
                  </div>
                </div>

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between pt-3 border-t border-zinc-800/80 text-[11px]">
                <span className="text-zinc-400 truncate max-w-[170px]">
                  {comp.popularRole}
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-400 text-[10px]">
                  {comp.ats}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
