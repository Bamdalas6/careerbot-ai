'use client';

import React from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LinearLogosProps {
  onSelectCompany: (companyQuery: string) => void;
}

const COMPANIES = [
  { name: 'Linear', ats: 'Ashby', roles: '19 open', query: 'Linear engineering roles' },
  { name: 'OpenAI', ats: 'Greenhouse', roles: '48 open', query: 'OpenAI jobs remote' },
  { name: 'Stripe', ats: 'Greenhouse', roles: '110 open', query: 'Stripe software engineer' },
  { name: 'Vercel', ats: 'Workday', roles: '28 open', query: 'Vercel Next.js developer' },
  { name: 'Anthropic', ats: 'Greenhouse', roles: '35 open', query: 'Anthropic AI engineer' },
  { name: 'Figma', ats: 'Greenhouse', roles: '42 open', query: 'Figma product designer engineer' },
  { name: 'Supabase', ats: 'Workday', roles: '24 open', query: 'Supabase backend remote' },
  { name: 'Cursor / Anysphere', ats: 'Ashby', roles: '12 open', query: 'Cursor AI engineer' },
];

export const LinearLogos: React.FC<LinearLogosProps> = ({ onSelectCompany }) => {
  const handleClick = (query: string) => {
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.6 },
    });
    onSelectCompany(query);
  };

  return (
    <section id="companies" className="py-14 border-y border-white/[0.06] bg-[#08090a]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Live Verified Career Feeds
            </p>
            <h2 className="text-lg font-semibold text-white tracking-tight mt-0.5">
              Direct ATS pipelines for modern engineering teams
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>8 verified integrations active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {COMPANIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleClick(c.query)}
              className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition duration-200 hover:border-white/[0.16] hover:bg-white/[0.05] hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs tracking-tight group-hover:text-[#8a99f8] transition">
                  {c.name}
                </span>
                <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-white transition" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>{c.roles}</span>
                <span className="rounded bg-white/[0.04] px-1 py-0.5 text-zinc-400">{c.ats}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
