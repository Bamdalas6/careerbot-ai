'use client';

import React from 'react';
import { Sparkles, Terminal, Laptop, Globe, TrendingUp } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt }) => {
  const prompts = [
    {
      label: 'Remote React & Next.js Roles',
      icon: Laptop,
      text: 'Find remote Senior React and Next.js developer jobs with high salary',
    },
    {
      label: 'AI & Python Engineer at Startups',
      icon: Terminal,
      text: 'Show me AI, PyTorch and Python Machine Learning roles at top startups',
    },
    {
      label: 'Full Stack in Europe / UK',
      icon: Globe,
      text: 'Find full stack engineer positions open to Europe and UK candidates',
    },
    {
      label: 'Stripe, Linear & Vercel Openings',
      icon: TrendingUp,
      text: 'Show open software engineering positions at Stripe, Linear, and Vercel',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto w-full">
      {prompts.map((p, idx) => {
        const Icon = p.icon;
        return (
          <button
            key={idx}
            onClick={() => onSelectPrompt(p.text)}
            className="flex items-center gap-3 p-3 text-left rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 transition group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-[#8a8f98] group-hover:bg-white/15 group-hover:text-white transition">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                {p.label}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {p.text}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
