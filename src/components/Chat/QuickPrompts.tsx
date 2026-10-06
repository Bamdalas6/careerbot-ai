'use client';

import React from 'react';
import { motion } from 'motion/react';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const PROMPTS = [
  {
    emoji: '🏝️',
    label: 'Remote virtual assistant roles',
    text: 'Find remote virtual assistant and executive assistant jobs open to Nigerians',
    tone: 'from-sky-50 to-blue-50 border-sky-100',
  },
  {
    emoji: '🎨',
    label: 'Product & UI/UX designers',
    text: 'Show me remote UI/UX and product designer roles using Figma',
    tone: 'from-violet-50 to-fuchsia-50 border-violet-100',
  },
  {
    emoji: '💻',
    label: 'React & Next.js developers',
    text: 'Find remote React and Next.js developer jobs with good salary',
    tone: 'from-emerald-50 to-teal-50 border-emerald-100',
  },
  {
    emoji: '🌱',
    label: 'Entry-level & graduate jobs in Lagos',
    text: 'Show entry-level, graduate trainee and internship jobs in Lagos',
    tone: 'from-amber-50 to-orange-50 border-amber-100',
  },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto w-full">
    {PROMPTS.map((p, idx) => (
      <motion.button
        key={p.label}
        type="button"
        onClick={() => onSelectPrompt(p.text)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 + idx * 0.07 }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.97 }}
        className={`group flex items-center gap-3 p-3.5 text-left rounded-2xl border bg-gradient-to-br ${p.tone} hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,0.25)] transition-shadow cursor-pointer`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm group-hover:scale-110 transition-transform">
          {p.emoji}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold text-slate-900 truncate">{p.label}</span>
          <span className="block text-[11px] text-slate-500 truncate">{p.text}</span>
        </span>
      </motion.button>
    ))}
  </div>
);
