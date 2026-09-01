'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface Capability {
  /** Linear numbers its sections 1.0, 2.0, … with sub-items at 1.1, 1.2, … */
  index: string;
  kicker: string;
  title: string;
  body: string;
  items: { id: string; label: string; detail: string }[];
  /** Rows for the small glass preview panel beside the copy. */
  panel: { title: string; rows: { left: string; right: string }[] };
}

const CAPABILITIES: Capability[] = [
  {
    index: '1.0',
    kicker: 'Intake',
    title: 'Describe the job in your own words',
    body: 'No dropdowns, no boolean syntax. Say what you want the way you would say it to a friend, and the intent parser pulls out the role, stack, seniority, location and pay.',
    items: [
      { id: '1.1', label: 'Role and seniority', detail: 'Extracts the job title and experience level from plain prose.' },
      { id: '1.2', label: 'Tech stack', detail: 'Recognises frameworks and languages named anywhere in the sentence.' },
      { id: '1.3', label: 'Location and remote', detail: 'Understands “remote”, hybrid, and named cities or regions.' },
      { id: '1.4', label: 'Compensation floor', detail: 'Reads salary expressions like “$150k+” and filters below them.' },
    ],
    panel: {
      title: 'Parsed intent',
      rows: [
        { left: 'Role', right: 'Senior React developer' },
        { left: 'Stack', right: 'React · TypeScript' },
        { left: 'Location', right: 'Remote' },
        { left: 'Minimum', right: '$150,000' },
      ],
    },
  },
  {
    index: '2.0',
    kicker: 'Sources',
    title: 'Aggregate live roles, skip the resellers',
    body: 'Every search hits three sources in parallel and merges the results. Postings come from the companies themselves, so the link you click is the one you apply through.',
    items: [
      { id: '2.1', label: 'Remotive', detail: 'Remote-first listings across engineering, design and data.' },
      { id: '2.2', label: 'Arbeitnow', detail: 'European and visa-sponsored roles with direct company links.' },
      { id: '2.3', label: 'Direct ATS feeds', detail: 'Curated Greenhouse, Lever and Workday boards, read at the source.' },
      { id: '2.4', label: 'Deduplication', detail: 'The same role posted to two feeds is collapsed into one result.' },
    ],
    panel: {
      title: 'Result provenance',
      rows: [
        { left: 'greenhouse.io', right: 'Direct' },
        { left: 'jobs.lever.co', right: 'Direct' },
        { left: 'myworkdayjobs.com', right: 'Direct' },
        { left: 'Aggregator middlemen', right: '0' },
      ],
    },
  },
  {
    index: '3.0',
    kicker: 'Scoring',
    title: 'Know why a role fits before you open it',
    body: 'Each result carries a 0–100 suitability score against what you asked for, plus a single line explaining the number. No badge without a reason behind it.',
    items: [
      { id: '3.1', label: 'Requirement overlap', detail: 'Compares the posting’s requirements against your stated stack.' },
      { id: '3.2', label: 'Seniority alignment', detail: 'Flags roles pitched above or below the level you asked for.' },
      { id: '3.3', label: 'Stated rationale', detail: 'Every score ships with the one-line reason it landed there.' },
    ],
    panel: {
      title: 'Match breakdown',
      rows: [
        { left: 'Stack overlap', right: '4 of 5' },
        { left: 'Seniority', right: 'Aligned' },
        { left: 'Location', right: 'Remote ✓' },
        { left: 'Score', right: '88 / 100' },
      ],
    },
  },
  {
    index: '4.0',
    kicker: 'Resume',
    title: 'Let your resume do the searching',
    body: 'Paste or drop your resume. The parser lifts out your technical skills and runs the search for you, so the first list you see is already shaped by what you actually do.',
    items: [
      { id: '4.1', label: 'Skill extraction', detail: 'Pulls languages, frameworks and tools out of raw resume text.' },
      { id: '4.2', label: 'Auto-search', detail: 'Turns the extracted profile straight into a first query.' },
      { id: '4.3', label: 'Stays local', detail: 'Parsing happens for this session; the text is not stored server-side.' },
    ],
    panel: {
      title: 'Extracted profile',
      rows: [
        { left: 'Languages', right: 'TypeScript · Go' },
        { left: 'Frameworks', right: 'React · Next.js' },
        { left: 'Infra', right: 'Postgres · AWS' },
        { left: 'Suggested query', right: 'Senior full-stack' },
      ],
    },
  },
  {
    index: '5.0',
    kicker: 'Pitch',
    title: 'Tailor talking points in one click',
    body: 'For any result in the list, generate a three-point pitch bridging your profile to the job spec, a first-draft cover note, and three questions to ask in the screen.',
    items: [
      { id: '5.1', label: 'Role bridge', detail: 'Maps what you know directly to the gaps named in the posting.' },
      { id: '5.2', label: 'Draft cover note', detail: 'Plain-spoken, unbloated outreach text ready to paste.' },
      { id: '5.3', label: 'Interview prep', detail: 'Three sharp technical questions tailored to that team.' },
    ],
    panel: {
      title: 'Generated assets',
      rows: [
        { left: 'Pitch bullets', right: '3' },
        { left: 'Cover note', right: 'Ready' },
        { left: 'Prep topics', right: '5' },
        { left: 'Time to produce', right: '1 click' },
      ],
    },
  },
  {
    index: '6.0',
    kicker: 'Pipeline',
    title: 'Track every application in one place',
    body: 'Save a role and it enters your pipeline. Move it through four stages as things progress. Everything stays in your browser — no account, no export wall.',
    items: [
      { id: '6.1', label: 'Four stages', detail: 'Saved, Applied, Interviewing and Offer, moved with one click.' },
      { id: '6.2', label: 'Local persistence', detail: 'Kept in local storage on your device, not on a server.' },
      { id: '6.3', label: 'No account', detail: 'Nothing to sign up for and nothing to cancel later.' },
    ],
    panel: {
      title: 'Pipeline',
      rows: [
        { left: 'Saved', right: '12' },
        { left: 'Applied', right: '7' },
        { left: 'Interviewing', right: '3' },
        { left: 'Offer', right: '1' },
      ],
    },
  },
];

export const CapabilitiesSection: React.FC = () => {
  return (
    <section id="capabilities" className="rule-t relative w-full">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Fig 0.2 — What it does</span>
          <h2 className="max-w-2xl text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-zinc-900 dark:text-[#f7f8f8] sm:text-[40px]">
            Six things it does properly,
            <span className="text-zinc-500 dark:text-[#8a8f98]"> end to end.</span>
          </h2>
        </div>

        <div className="mt-16 flex flex-col">
          {CAPABILITIES.map((cap) => (
            <CapabilityRow key={cap.index} capability={cap} />
          ))}
        </div>
      </div>
    </section>
  );
};

const CapabilityRow: React.FC<{ capability: Capability }> = ({ capability }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-8 border-t border-black/10 dark:border-white/[0.08] py-12 lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,20rem)] lg:gap-12">
      {/* Number + kicker */}
      <div className="flex items-baseline gap-3 lg:flex-col lg:gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] text-zinc-500 dark:text-[#62666d]">
          {capability.index}
        </span>
        <span className="text-[13px] font-semibold text-zinc-900 dark:text-[#f7f8f8]">{capability.kicker}</span>
      </div>

      {/* Copy + sub-items */}
      <div className="flex flex-col gap-4">
        <h3 className="max-w-lg text-[20px] font-semibold leading-snug tracking-[-0.02em] text-zinc-900 dark:text-[#f7f8f8] sm:text-[24px]">
          {capability.title}
        </h3>
        <p className="max-w-xl text-[14.5px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
          {capability.body}
        </p>

        <ul className="mt-2 flex max-w-xl flex-col">
          {capability.items.map((item) => {
            const open = openId === item.id;
            return (
              <li key={item.id} className="border-t border-black/10 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="group flex w-full items-center gap-3 py-3 text-left"
                >
                  <span className="font-mono text-[11px] tracking-[0.14em] text-zinc-500 dark:text-[#62666d]">
                    {item.id}
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-zinc-900 dark:text-[#f7f8f8]">{item.label}</span>
                  <Plus
                    className={`h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-[#62666d] transition-transform duration-200 group-hover:text-zinc-900 dark:group-hover:text-[#f7f8f8] ${
                      open ? 'rotate-45' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <p className="overflow-hidden pb-3 pl-[2.4rem] pr-8 text-[13.5px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
                    {item.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Glass preview panel */}
      <div className="glass self-start rounded-2xl p-4 bg-white dark:bg-white/[0.045] border border-black/10 dark:border-white/[0.09] shadow-xs">
        <span className="eyebrow">{capability.panel.title}</span>
        <div className="mt-3 flex flex-col">
          {capability.panel.rows.map((row, i) => (
            <div
              key={row.left}
              className={`flex items-center justify-between gap-4 py-2.5 text-[13px] ${
                i > 0 ? 'border-t border-black/10 dark:border-white/[0.07]' : ''
              }`}
            >
              <span className="text-zinc-600 dark:text-[#8a8f98]">{row.left}</span>
              <span className="text-right font-semibold text-zinc-900 dark:text-[#f7f8f8]">{row.right}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
