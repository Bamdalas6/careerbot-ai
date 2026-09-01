'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'How does CareerBot guarantee direct career page / ATS links?',
    a: 'CareerBot parses live job postings and company databases (Greenhouse, Lever, Ashby, Workday, Remotive, Arbeitnow) to resolve direct destination URLs. We strip out tracking parameters and middleman aggregator forms so your application lands directly on the employer’s authentic portal.',
  },
  {
    q: 'Do I need an API key to start searching jobs?',
    a: 'No API keys required. CareerBot AI comes with zero-config live job providers out of the box. You can start searching immediately. Optional external keys for Gemini, OpenAI, or RapidAPI can be configured in settings if you want custom LLM endpoints.',
  },
  {
    q: 'How does the AI Match Score (0–100%) work?',
    a: 'Our matching model compares your query or resume competencies against the job description’s required tech stack, seniority requirements, location/remote constraints, and compensation. It delivers a concise 2-sentence rationale explaining the alignment.',
  },
  {
    q: 'Is my uploaded resume stored on external servers?',
    a: 'No. Resume extraction runs locally in your session or within secure API routes. Your resume text is not sold, retained, or shared with third-party recruiters.',
  },
  {
    q: 'How does the 1-Click Application Pitch generator work?',
    a: 'When you click "Tailor Pitch" on any job card, CareerBot analyzes the job requirements and writes 3 targeted bullet points, an introductory outreach note, and role-specific interview prep tips with 1-click clipboard copy.',
  },
];

export const LinearFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#08090a] border-t border-white/[0.06]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-center sm:text-left">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a99f8]">
            Frequently Asked Questions
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
            Everything you need to know
          </h2>
        </div>

        <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#0d0e11] px-6">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between text-left transition text-white"
                >
                  <span className="text-sm sm:text-base font-medium tracking-tight pr-4">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-xs sm:text-sm text-[#8a8f98] leading-relaxed pr-6">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
