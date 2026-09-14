'use client';

import React, { useEffect, useState } from 'react';

/**
 * Two-part lines: the setup stays put, the punchline rotates. Linear's headline
 * treatment is plain white with tight tracking, so the humour has to come from
 * the words rather than from colour.
 */
const LINES: { lead: string; punch: string }[] = [
  { lead: 'Hello jobless human.', punch: 'Which role are you hunting today?' },
  { lead: 'Your profile says “open to work.”', punch: 'Bold. Let’s make it obsolete.' },
  { lead: 'Ah, a fellow professional', punch: 'refresher of job boards.' },
  { lead: 'Name the dream job.', punch: 'I’ll pretend the market is fine.' },
  { lead: 'Recruiters ghosted you?', punch: 'Rude. I never sleep. Let’s go.' },
  { lead: 'Type any role.', punch: '“Vibes engineer” is technically valid.' },
  { lead: 'I read job posts for a living.', punch: 'Somebody has to. Where to?' },
  { lead: 'Between opportunities?', punch: 'Gorgeous phrasing. What’s next?' },
];

const ROTATE_MS = 5400;

export const FunnyHeadline: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LINES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const line = LINES[index];
  const leadWords = line.lead.split(' ');
  const punchWords = line.punch.split(' ');

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Playful rotating status pill */}
      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-1 text-xs font-medium text-zinc-700 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#8a8f98]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span key={index} className="word-rise inline-block">
          {line.lead} {line.punch}
        </span>
      </div>

      <h1 className="max-w-[44rem] text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-zinc-900 dark:text-[#f7f8f8] sm:text-[44px] lg:max-w-[54rem] lg:text-[54px]">
        <span className="block">Stop applying blindly.</span>
        <span className="block text-zinc-500 dark:text-[#8a8f98]">
          Find jobs you’re actually qualified for.
        </span>
      </h1>

      <p className="max-w-[36rem] text-[15px] leading-relaxed text-zinc-600 dark:text-[#8a8f98] sm:text-base">
        CareerBot matches your CV to live opportunities, tells you why you’re a fit, and helps you build a stronger application.
      </p>
    </div>
  );
};
