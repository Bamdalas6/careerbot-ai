'use client';

import React, { useState } from 'react';
import {
  Bell, Mail, ChevronRight, X,
} from 'lucide-react';

interface FollowUpItem {
  id: string;
  company: string;
  jobTitle: string;
  daysSince: number;
  followUpCount: number;
}

interface FollowUpBannerProps {
  items: FollowUpItem[];
  onGenerateEmail: (id: string) => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onOpenTracker: () => void;
}

export const FollowUpBanner: React.FC<FollowUpBannerProps> = ({
  items,
  onGenerateEmail,
  onDismiss,
  onDismissAll,
  onOpenTracker,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 mb-3">
      <div className="rounded-2xl border border-black/10 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-3 shadow-sm">
        {/* Collapsed summary */}
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex flex-1 items-center gap-2.5 text-left min-w-0"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">
                {items.length} follow-up{items.length !== 1 ? 's' : ''} due
              </p>
              <p className="truncate text-[11px] text-zinc-600 dark:text-[#8a8f98]">
                {items.slice(0, 2).map((i) => i.company).join(', ')}
                {items.length > 2 ? ` +${items.length - 2} more` : ''}
              </p>
            </div>
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-zinc-400 dark:text-[#62666d] transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenTracker}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-800 dark:text-[#8a8f98] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-[#f7f8f8] transition"
            >
              Open tracker
            </button>
            <button
              type="button"
              onClick={onDismissAll}
              className="rounded-lg p-1 text-zinc-400 dark:text-[#62666d] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-zinc-700 dark:hover:text-[#8a8f98] transition"
              title="Dismiss all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded list */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-black/10 dark:border-white/[0.06] pt-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-black/5 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-zinc-900 dark:text-[#f7f8f8]">{item.company}</p>
                  <p className="truncate text-[11px] text-zinc-600 dark:text-[#8a8f98]">
                    {item.jobTitle} · {item.daysSince}d ago ·{' '}
                    {item.followUpCount === 0 ? 'No follow-up yet' : `${item.followUpCount} follow-up${item.followUpCount !== 1 ? 's' : ''} sent`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onGenerateEmail(item.id)}
                    className="flex items-center gap-1 rounded-lg border border-black/10 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-zinc-900 dark:text-[#f7f8f8] transition hover:bg-black/[0.04] dark:hover:bg-white/[0.09]"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    className="rounded-lg p-1 text-zinc-400 dark:text-[#62666d] hover:text-zinc-700 dark:hover:text-[#8a8f98] transition"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
