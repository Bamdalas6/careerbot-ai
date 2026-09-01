'use client';

import React from 'react';

interface SiteFooterProps {
  onStartSearch: () => void;
  onOpenResume: () => void;
  onOpenSaved: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onStartSearch,
  onOpenResume,
  onOpenSaved,
}) => {
  const columns: { heading: string; links: { label: string; onClick?: () => void; href?: string }[] }[] = [
    {
      heading: 'Product',
      links: [
        { label: 'Search roles', onClick: onStartSearch },
        { label: 'Resume matching', onClick: onOpenResume },
        { label: 'Saved pipeline', onClick: onOpenSaved },
        { label: 'Capabilities', href: '#capabilities' },
      ],
    },
    {
      heading: 'Capabilities',
      links: [
        { label: 'Intent parsing', href: '#capabilities' },
        { label: 'Match scoring', href: '#capabilities' },
        { label: 'Pitch generation', href: '#capabilities' },
        { label: 'Pipeline tracking', href: '#capabilities' },
      ],
    },
    {
      heading: 'Sources',
      links: [
        { label: 'Remotive', href: 'https://remotive.com' },
        { label: 'Arbeitnow', href: 'https://arbeitnow.com' },
        { label: 'Greenhouse boards', href: 'https://www.greenhouse.io' },
        { label: 'Lever boards', href: 'https://www.lever.co' },
      ],
    },
    {
      heading: 'Facts',
      links: [
        { label: 'How results are ranked', href: '#facts' },
        { label: 'What is stored', href: '#facts' },
        { label: 'Why no sign-up', href: '#facts' },
      ],
    },
  ];

  return (
    <footer className="rule-t w-full">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,auto))] lg:gap-16">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[18px] w-[18px] text-zinc-900 dark:text-[#f7f8f8]">
                <path fill="currentColor" d="M8 0a8 8 0 1 0 8 8h-2.4A5.6 5.6 0 1 1 8 2.4V0Z" />
                <circle cx="8" cy="8" r="2.6" fill="currentColor" />
              </svg>
              <span className="text-[14px] font-semibold tracking-tight text-zinc-900 dark:text-[#f7f8f8]">
                CareerBot
              </span>
            </div>
            <p className="max-w-[15rem] text-[13px] leading-relaxed text-zinc-600 dark:text-[#62666d]">
              Conversational job discovery with direct links to the company’s own
              application page.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading} className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-zinc-900 dark:text-[#f7f8f8]">{column.heading}</span>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.onClick ? (
                      <button
                        type="button"
                        onClick={link.onClick}
                        className="text-left text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        {...(link.href?.startsWith('http')
                          ? { target: '_blank', rel: 'noreferrer noopener' }
                          : {})}
                        className="text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-black/10 dark:border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[12.5px] text-zinc-500 dark:text-[#62666d]">
            Saved roles are stored in your browser. Nothing leaves your device unless you
            click through to apply.
          </span>
          <span className="text-[12.5px] text-zinc-500 dark:text-[#62666d]">MIT licensed</span>
        </div>
      </div>
    </footer>
  );
};
