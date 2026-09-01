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
      {/* key forces a remount so the word-by-word animation replays each rotation */}
      <h1
        key={index}
        className="max-w-[44rem] text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-zinc-900 dark:text-[#f7f8f8] sm:text-[40px] lg:max-w-[52rem] lg:text-[52px]"
      >
        <span className="block">
          {leadWords.map((word, i) => (
            <span
              key={`${index}-lead-${i}`}
              className="word-rise inline-block whitespace-pre"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {word}{' '}
            </span>
          ))}
        </span>
        <span className="block text-zinc-500 dark:text-[#8a8f98]">
          {punchWords.map((word, i) => (
            <span
              key={`${index}-punch-${i}`}
              className="word-rise inline-block whitespace-pre"
              style={{ animationDelay: `${(leadWords.length + i) * 50 + 60}ms` }}
            >
              {word}{' '}
            </span>
          ))}
        </span>
      </h1>

      <p className="max-w-[34rem] text-[15px] leading-relaxed text-zinc-600 dark:text-[#8a8f98] sm:text-base">
        Live roles pulled straight from company career pages. Direct apply links, an
        honest match score, and exactly zero recruiter spam.
      </p>
    </div>
  );
};
