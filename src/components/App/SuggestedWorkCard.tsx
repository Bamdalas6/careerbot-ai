'use client';

import React, { useState, useMemo } from 'react';
import { ExternalLink, Sparkles, MoreHorizontal, ChevronRight } from 'lucide-react';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';

interface SuggestedWorkCardProps {
  jobs: JobListing[];
  isSaved?: boolean;
  onToggleSave?: (job: JobListing) => void;
  onOpenTailor?: (job: JobListing) => void;
  onViewAll?: () => void;
  onViewJob?: (job: JobListing) => void;
}

export const SuggestedWorkCard: React.FC<SuggestedWorkCardProps> = ({
  jobs = [],
  isSaved = false,
  onToggleSave,
  onOpenTailor,
  onViewAll,
  onViewJob,
}) => {
  const { requireAuth, credits, openCreditModal } = useAuth();

  // If SunFi is present in jobs, prioritize it at the front of the suggested deck to match mockup
  const prioritizedJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const sunfi = jobs.find((j) => j.company.toLowerCase().includes('sunfi'));
    if (sunfi) {
      return [sunfi, ...jobs.filter((j) => j.id !== sunfi.id)];
    }
    return jobs;
  }, [jobs]);

  if (!prioritizedJobs || prioritizedJobs.length === 0) {
    return null;
  }

  const cardList = prioritizedJobs.slice(0, 12);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitingCard, setExitingCard] = useState<{
    job: JobListing;
    direction: 'up' | 'down';
    phase: 'start' | 'animating';
  } | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const safeIndex = currentIndex % cardList.length;
  const currentJob = cardList[safeIndex] || cardList[0];

  // Advance smoothly to next suggested card (slide up)
  const handleNext = () => {
    if (cardList.length <= 1 || exitingCard) return;

    const departingJob = cardList[safeIndex];
    setExitingCard({ job: departingJob, direction: 'up', phase: 'start' });

    // Instantly advance the underlying card so it is in place beneath the exiting overlay
    setCurrentIndex((prev) => (prev + 1) % cardList.length);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setExitingCard((prev) => (prev ? { ...prev, phase: 'animating' } : null));
      });
    });

    setTimeout(() => {
      setExitingCard(null);
    }, 320);
  };

  // Return smoothly to previous suggested card (slide down)
  const handlePrev = () => {
    if (cardList.length <= 1 || exitingCard) return;

    const departingJob = cardList[safeIndex];
    setExitingCard({ job: departingJob, direction: 'down', phase: 'start' });

    setCurrentIndex((prev) => (prev - 1 + cardList.length) % cardList.length);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setExitingCard((prev) => (prev ? { ...prev, phase: 'animating' } : null));
      });
    });

    setTimeout(() => {
      setExitingCard(null);
    }, 320);
  };

  // Touch gesture support: swipe up for next card, swipe down for previous card
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = touchStartY - e.changedTouches[0].clientY;
    if (diff > 35) {
      handleNext();
    } else if (diff < -35) {
      handlePrev();
    }
    setTouchStartY(null);
  };

  // Format salary cleanly matching screenshot format
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
    return '$45 - $60';
  };

  const renderCardContent = (job: JobListing) => (
    <>
      {/* Top row: Company Logo, Name, Role Title, and Three Dots */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Company Logo Badge: Dark circular background with floral clover icon */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0d2116] border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 fill-current" viewBox="0 0 24 24">
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
            <p className="text-xs font-medium text-white/85 truncate">
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
            if (!requireAuth()) return;
            onOpenTailor?.(job);
          }}
          className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-white/90 hover:text-white transition-colors shrink-0 cursor-pointer"
          title="Tailor Pitch & Options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Middle row: Translucent pill tags */}
      <div className="flex flex-wrap items-center gap-1.5 my-3 sm:my-3.5">
        {(job.tags || ['Customer Success', 'Fintech', 'Clean Energy']).slice(0, 3).map((tag, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/10 shadow-inner truncate max-w-[140px]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Bottom row: Salary on left, Action buttons on right */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm sm:text-base font-black text-white tracking-tight truncate">
            {formatSalary(job)}
          </span>
          {!formatSalary(job).includes('/') && (
            <span className="text-xs font-medium text-white/70">
              /hour
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Tailor Pitch Button */}
          {onOpenTailor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!requireAuth()) return;
                if (credits <= 0) {
                  openCreditModal();
                  return;
                }
                onOpenTailor(job);
              }}
              className="px-3.5 py-2 sm:py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Tailor Application Pitch"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Pitch</span>
            </button>
          )}

          {/* View Job Button: Crisp white button on a single line */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!requireAuth()) return;
              if (credits <= 0) {
                openCreditModal();
                return;
              }
              if (onViewJob) {
                onViewJob(job);
              } else {
                window.open(job.apply_url, '_blank');
              }
            }}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
          >
            <span>View Job</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="w-full my-4 select-none">
      {/* Section Header: "Suggested Works" left, "✨ Special for you" badge, "See all >" right */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Suggested Works
          </h2>

          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center gap-1 shadow-2xs">
            <Sparkles className="w-3 h-3 text-blue-500 fill-blue-500" />
            <span>Special for you</span>
          </span>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Main Stacked Deck Container with floating navigation buttons */}
      <div className="relative w-full">
        {/* The Card Deck (tap or swipe up/down to navigate) */}
        <div
          onClick={handleNext}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative w-full ${cardList.length > 1 ? 'cursor-pointer' : ''}`}
          title={cardList.length > 1 ? 'Tap or swipe to reveal next job' : undefined}
        >
          {/* Layer 3: Farthest top curved peek tab */}
          {cardList.length > 2 && (
            <div className="mx-8 h-2.5 rounded-t-2xl bg-[#99ccff]/80 dark:bg-blue-900/40 border-t border-x border-white/20 transition-all duration-300" />
          )}

          {/* Layer 2: Middle top curved peek tab */}
          {cardList.length > 1 && (
            <div className="mx-4 h-2.5 rounded-t-2xl bg-[#4da6ff]/90 dark:bg-blue-800/60 border-t border-x border-white/20 -mt-1 transition-all duration-300" />
          )}

          {/* Layer 1: Front Active Card (Steady solid electric blue) */}
          <div
            className={`relative rounded-3xl bg-[#0080ff] shadow-[0_16px_36px_-10px_rgba(0,128,255,0.45)] p-5 sm:p-6 text-white overflow-hidden ${
              cardList.length > 1 ? '-mt-1' : ''
            }`}
            style={{ zIndex: 20 }}
          >
            {renderCardContent(currentJob)}
          </div>

          {/* Exiting Card Overlay: Smoothly slides up/down and fades out with zero layout jump */}
          {exitingCard && (
            <div
              className={`absolute inset-x-0 bottom-0 top-[18px] rounded-3xl bg-[#0080ff] shadow-[0_16px_36px_-10px_rgba(0,128,255,0.45)] p-5 sm:p-6 text-white overflow-hidden pointer-events-none`}
              style={{
                zIndex: 35,
                transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out',
                transform:
                  exitingCard.phase === 'animating'
                    ? exitingCard.direction === 'up'
                      ? 'translateY(-50px) scale(0.95)'
                      : 'translateY(50px) scale(0.95)'
                    : 'translateY(0px) scale(1)',
                opacity: exitingCard.phase === 'animating' ? 0 : 1,
              }}
            >
              {renderCardContent(exitingCard.job)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
