'use client';

import React from 'react';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote:
      'I was tired of third-party recruiter email traps and ghost jobs. CareerBot got me direct to Stripe’s Greenhouse page in 5 seconds and generated a tailored pitch that landed me the first-round interview.',
    author: 'Elena Rostova',
    role: 'Staff Frontend Engineer',
    company: 'Ex-Meta, now Stripe',
  },
  {
    quote:
      'The resume skill extractor understood my niche distributed systems background better than most human headhunters. Found 3 remote roles matching my $180k target immediately.',
    author: 'Marcus Chen',
    role: 'Senior Backend Engineer',
    company: 'Distributed Systems Lead',
  },
  {
    quote:
      'The 1-click pitch tool is pure magic. It connects candidate achievements directly to job requirements without the generic AI fluff. Super clean UI.',
    author: 'Sarah Jenkins',
    role: 'Principal Product Designer',
    company: 'Design Systems Lead',
  },
];

export const LinearTestimonials: React.FC = () => {
  return (
    <section className="py-24 bg-[#08090a] border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a99f8]">
            Feedback & Impact
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
            Loved by engineers, designers, and tech leaders
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/[0.08] bg-[#0d0e11] p-6 sm:p-7 flex flex-col justify-between hover:border-white/[0.16] transition"
            >
              <div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#d0d6e0] leading-relaxed">
                  &quot;{t.quote}&quot;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <p className="text-xs font-semibold text-white">{t.author}</p>
                <p className="text-[11px] text-zinc-500 font-mono">{t.role} • {t.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
