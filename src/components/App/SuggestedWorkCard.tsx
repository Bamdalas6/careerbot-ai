'use client';

import React, { useState } from 'react';
import { ExternalLink, Sparkles, MoreHorizontal, ChevronRight } from 'lucide-react';
import { JobListing } from '@/types/job';

interface SuggestedWorkCardProps {
  jobs: JobListing[];
  isSaved?: boolean;
  onToggleSave?: (job: JobListing) => void;
  onOpenTailor?: (job: JobListing) => void;
  onViewAll?: () => void;
}

interface SegmentTheme {
  gradient: string;
  shadow: string;
  stackLayer1: string;
  stackLayer2: string;
  dotColor: string;
}

const SEGMENT_THEMES: SegmentTheme[] = [
  {
    gradient: 'from-[#0084ff] via-[#0076f5] to-[#0066ee]',
    shadow: 'shadow-[0_12px_32px_-6px_rgba(0,120,255,0.45)]',
    stackLayer1: 'bg-[#60a5fa]',
    stackLayer2: 'bg-[#bfdbfe]',
    dotColor: 'bg-[#0084ff]',
  },
  {
    gradient: 'from-[#7c3aed] via-[#6d28d9] to-[#5b21b6]',
    shadow: 'shadow-[0_12px_32px_-6px_rgba(124,58,237,0.45)]',
    stackLayer1: 'bg-[#a78bfa]',
    stackLayer2: 'bg-[#ddd6fe]',
    dotColor: 'bg-[#7c3aed]',
  },
  {
    gradient: 'from-[#059669] via-[#0d9488] to-[#0f766e]',
    shadow: 'shadow-[0_12px_32px_-6px_rgba(5,150,105,0.45)]',
    stackLayer1: 'bg-[#34d399]',
    stackLayer2: 'bg-[#a7f3d0]',
    dotColor: 'bg-[#059669]',
  },
  {
    gradient: 'from-[#ea580c] via-[#f97316] to-[#c2410c]',
    shadow: 'shadow-[0_12px_32px_-6px_rgba(234,88,12,0.45)]',
    stackLayer1: 'bg-[#fb923c]',
    stackLayer2: 'bg-[#fed7aa]',
    dotColor: 'bg-[#ea580c]',
  },
  {
    gradient: 'from-[#0284c7] via-[#0369a1] to-[#075985]',
    shadow: 'shadow-[0_12px_32px_-6px_rgba(2,132,199,0.45)]',
    stackLayer1: 'bg-[#38bdf8]',
    stackLayer2: 'bg-[#bae6fd]',
    dotColor: 'bg-[#0284c7]',
  },
  {
    gradient: 'from-[#db2777] via-[#be185d] to-[#9d174d]',
    shadow: 'shadow-[0_12px_32px_-6px_rgba(219,39,119,0.45)]',
    stackLayer1: 'bg-[#f472b6]',
    stackLayer2: 'bg-[#fbcfe8]',
    dotColor: 'bg-[#db2777]',
  },
];

export const SuggestedWorkCard: React.FC<SuggestedWorkCardProps> = ({
  jobs = [],
  isSaved = false,
  onToggleSave,
  onOpenTailor,
  onViewAll,
}) => {
  if (!jobs || jobs.length === 0) {
    return null;
  }

  const cardList = jobs.slice(0, 12);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const safeIndex = currentIndex % cardList.length;
  const currentJob = cardList[safeIndex] || cardList[0];
  const nextJob = cardList[(safeIndex + 1) % cardList.length];

  const currentTheme = SEGMENT_THEMES[safeIndex % SEGMENT_THEMES.length];
  const nextTheme = SEGMENT_THEMES[(safeIndex + 1) % SEGMENT_THEMES.length];

  // Tap-to-swipe handler: user taps the card to animate and swipe to the next card in the deck
  const handleCardTap = () => {
    if (cardList.length <= 1 || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cardList.length);
      setIsAnimating(false);
    }, 360);
  };

  // Format salary cleanly without awkward duplicates or collisions
  const formatSalary = (job: JobListing) => {
    if (job.salary_formatted) {
      return job.salary_formatted.replace(/\/month\s*\/hour/gi, '/month');
    }
    if (job.salary_min) {
      if (job.salary_max && job.salary_max > job.salary_min) {
        return `₦${(job.salary_min / 1000).toFixed(0)}k - ₦${(job.salary_max / 1000).toFixed(0)}k`;
      }
      return `₦${(job.salary_min / 1000).toFixed(0)}k / month`;
    }
    return '$45 - $60 / hour';
  };

  const renderCardContent = (job: JobListing) => (
    <>
      {/* Top row: Green flower company logo, title, and three dots */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Company Logo Badge: Dark circle with bright green floral clover icon */}
          <div className="w-12 h-12 rounded-full bg-[#112418] border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-6 h-6 text-emerald-400 fill-current" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2.5" />
              <circle cx="12" cy="19" r="2.5" />
              <circle cx="5" cy="12" r="2.5" />
              <circle cx="19" cy="12" r="2.5" />
              <circle cx="7.05" cy="7.05" r="2.2" />
              <circle cx="16.95" cy="16.95" r="2.2" />
              <circle cx="7.05" cy="16.95" r="2.2" />
              <circle cx="16.95" cy="7.05" r="2.2" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/80 truncate">
              {job.company}
            </p>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight line-clamp-1">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Three dots menu */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTailor?.(job);
          }}
          className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-white/90 hover:text-white transition-colors shrink-0"
          title="Tailor Pitch & Options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Middle row: Translucent pill tags */}
      <div className="flex flex-wrap items-center gap-1.5 my-3.5">
        {(job.tags || ['Verified', 'High Match', job.location || 'Remote']).slice(0, 3).map((tag, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/10 shadow-inner truncate max-w-[150px]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Bottom row: Salary on left, Action buttons on right */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <span className="text-sm sm:text-base font-black text-white tracking-tight truncate block">
            {formatSalary(job)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Tailor Pitch Button */}
          {onOpenTailor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTailor(job);
              }}
              className="px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 backdrop-blur-md shadow-xs active:scale-95 transition-all"
              title="Tailor Application Pitch"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Pitch</span>
            </button>
          )}

          {/* View Job Button: Crisp white pill button */}
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>View Job</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>
      </div>
    </>
  );

  return (
    <div className="w-full my-4 select-none">
      {/* Section Header: "Suggested Works" left, Color Segments Indicator, "See all >" right */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Suggested Works
          </h2>

          {/* Color Segments Bar replacing the numbering */}
          {cardList.length > 1 && (
            <div className="flex items-center gap-1.5 ml-0.5">
              {cardList.slice(0, Math.min(cardList.length, 6)).map((_, idx) => {
                const isActive = idx === safeIndex % Math.min(cardList.length, 6);
                const theme = SEGMENT_THEMES[idx % SEGMENT_THEMES.length];
                return (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? `${theme.dotColor} w-5 sm:w-6 shadow-xs`
                        : 'bg-slate-200 w-2 hover:bg-slate-300'
                    }`}
                    title={`Segment ${idx + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Main Stacked Deck Container: Users tap directly on the card to animate and swipe to the next card in the stack */}
      <div
        onClick={handleCardTap}
        className={`relative w-full ${
          cardList.length > 1 ? 'cursor-pointer active:scale-[0.99] transition-transform duration-150' : ''
        }`}
        title={cardList.length > 1 ? 'Tap card to swipe to next job' : undefined}
      >
        {/* Layer 3: Farthest top curved stack layer */}
        {cardList.length > 2 && (
          <div
            className={`mx-8 h-2.5 rounded-t-2xl transition-all duration-300 ${currentTheme.stackLayer2} ${
              isAnimating ? 'opacity-90 -translate-y-1' : 'opacity-80'
            }`}
          />
        )}

        {/* Layer 2: Middle top curved stack layer */}
        {cardList.length > 1 && (
          <div
            className={`mx-4 h-2.5 rounded-t-2xl transition-all duration-300 ${currentTheme.stackLayer1} ${
              cardList.length > 2 ? '-mt-1' : ''
            } ${isAnimating ? 'opacity-100 -translate-y-1' : 'opacity-90'}`}
          />
        )}

        {/* Layer Beneath: Pre-renders nextJob with nextTheme so it seamlessly surfaces when the top card swipes away */}
        {cardList.length > 1 && nextJob && (
          <div
            className={`absolute inset-x-0 bottom-0 rounded-3xl bg-gradient-to-br ${nextTheme.gradient} p-5 sm:p-6 text-white shadow-md overflow-hidden pointer-events-none transition-all duration-350 ease-out ${
              isAnimating
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-90 scale-[0.97] -translate-y-1'
            }`}
            style={{ zIndex: 10 }}
          >
            {renderCardContent(nextJob)}
          </div>
        )}

        {/* Front Active Card: Styled with currentTheme and swipes away when tapped */}
        <div
          className={`relative rounded-3xl bg-gradient-to-br ${currentTheme.gradient} ${currentTheme.shadow} p-5 sm:p-6 text-white overflow-hidden transition-all duration-360 ease-out ${
            cardList.length > 1 ? '-mt-1' : ''
          } ${
            isAnimating
              ? '-translate-y-20 -rotate-3 opacity-0 scale-95 pointer-events-none'
              : 'translate-y-0 rotate-0 opacity-100 scale-100'
          }`}
          style={{ zIndex: 20 }}
        >
          {renderCardContent(currentJob)}
        </div>
      </div>
    </div>
  );
};
