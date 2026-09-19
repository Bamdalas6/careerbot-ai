'use client';

import React, { useState } from 'react';
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
    shadow: 'shadow-[0_20px_45px_-12px_rgba(0,120,255,0.45)]',
    stackLayer1: 'bg-[#1a8cff]/50 border-white/20',
    stackLayer2: 'bg-[#3399ff]/30 border-white/10',
    dotColor: 'bg-[#0084ff]',
  },
  {
    gradient: 'from-[#0d9488] via-[#0f766e] to-[#115e59]',
    shadow: 'shadow-[0_20px_45px_-12px_rgba(13,148,136,0.45)]',
    stackLayer1: 'bg-[#14b8a6]/50 border-white/20',
    stackLayer2: 'bg-[#2dd4bf]/30 border-white/10',
    dotColor: 'bg-[#0d9488]',
  },
  {
    gradient: 'from-[#6366f1] via-[#4f46e5] to-[#4338ca]',
    shadow: 'shadow-[0_20px_45px_-12px_rgba(99,102,241,0.45)]',
    stackLayer1: 'bg-[#818cf8]/50 border-white/20',
    stackLayer2: 'bg-[#a5b4fc]/30 border-white/10',
    dotColor: 'bg-[#6366f1]',
  },
  {
    gradient: 'from-[#ea580c] via-[#c2410c] to-[#9a3412]',
    shadow: 'shadow-[0_20px_45px_-12px_rgba(234,88,12,0.45)]',
    stackLayer1: 'bg-[#f97316]/50 border-white/20',
    stackLayer2: 'bg-[#fb923c]/30 border-white/10',
    dotColor: 'bg-[#ea580c]',
  },
  {
    gradient: 'from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]',
    shadow: 'shadow-[0_20px_45px_-12px_rgba(139,92,246,0.45)]',
    stackLayer1: 'bg-[#a78bfa]/50 border-white/20',
    stackLayer2: 'bg-[#c4b5fd]/30 border-white/10',
    dotColor: 'bg-[#8b5cf6]',
  },
  {
    gradient: 'from-[#059669] via-[#047857] to-[#065f46]',
    shadow: 'shadow-[0_20px_45px_-12px_rgba(5,150,105,0.45)]',
    stackLayer1: 'bg-[#10b981]/50 border-white/20',
    stackLayer2: 'bg-[#34d399]/30 border-white/10',
    dotColor: 'bg-[#059669]',
  },
];

export const SuggestedWorkCard: React.FC<SuggestedWorkCardProps> = ({
  jobs = [],
  isSaved = false,
  onToggleSave,
  onOpenTailor,
  onViewAll,
  onViewJob,
}) => {
  const { requireAuth } = useAuth();

  if (!jobs || jobs.length === 0) {
    return null;
  }

  const cardList = jobs.slice(0, 12);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingCard, setAnimatingCard] = useState<{
    job: JobListing;
    theme: SegmentTheme;
    isExit: boolean;
  } | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const safeIndex = currentIndex % cardList.length;
  const currentJob = cardList[safeIndex] || cardList[0];
  const nextJob = cardList[(safeIndex + 1) % cardList.length];
  const thirdJob = cardList[(safeIndex + 2) % cardList.length];

  const currentTheme = SEGMENT_THEMES[safeIndex % SEGMENT_THEMES.length];
  const nextTheme = SEGMENT_THEMES[(safeIndex + 1) % SEGMENT_THEMES.length];
  const thirdTheme = SEGMENT_THEMES[(safeIndex + 2) % SEGMENT_THEMES.length];

  // Tap or swipe-to-reveal: smoothly animates the active card away while bringing the next card up
  const handleCardTap = () => {
    if (cardList.length <= 1 || animatingCard) return;

    const exiting = { job: currentJob, theme: currentTheme, isExit: false };
    setAnimatingCard(exiting);

    requestAnimationFrame(() => {
      setAnimatingCard({ job: currentJob, theme: currentTheme, isExit: true });
    });

    setCurrentIndex((prev) => (prev + 1) % cardList.length);

    setTimeout(() => {
      setAnimatingCard(null);
    }, 420);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = touchStartY - e.changedTouches[0].clientY;
    // Swipe up detected (swiped up by > 25px)
    if (diff > 25) {
      handleCardTap();
    }
    setTouchStartY(null);
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
                if (!requireAuth()) return;
                onOpenTailor(job);
              }}
              className="px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Tailor Application Pitch"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Pitch</span>
            </button>
          )}

          {/* View Job Button: Crisp white pill button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!requireAuth()) return;
              if (onViewJob) {
                onViewJob(job);
              } else {
                window.open(job.apply_url, '_blank');
              }
            }}
            className="px-4 py-2 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
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

      {/* Main Stacked Deck Container: Users tap directly on the card or swipe up to reveal next job */}
      <div
        onClick={handleCardTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-[200px] sm:h-[210px] ${
          cardList.length > 1 ? 'cursor-pointer select-none' : ''
        }`}
        title={cardList.length > 1 ? 'Tap or swipe up to reveal next suggested job' : undefined}
      >
        {/* Layer 3: Farthest back stack card (Card 2) */}
        {cardList.length > 2 && thirdJob && (
          <div
            className={`absolute inset-x-0 top-0 h-[190px] sm:h-[200px] rounded-3xl bg-gradient-to-br ${thirdTheme.gradient} p-5 sm:p-6 text-white shadow-sm overflow-hidden pointer-events-none transition-all duration-300 ease-out`}
            style={{
              zIndex: 10,
              transform: 'translateY(10px) scale(0.92)',
              opacity: 0.65,
            }}
          >
            {renderCardContent(thirdJob)}
          </div>
        )}

        {/* Layer 2: Middle stack card (Card 1, right underneath active) */}
        {cardList.length > 1 && nextJob && (
          <div
            className={`absolute inset-x-0 top-0 h-[190px] sm:h-[200px] rounded-3xl bg-gradient-to-br ${nextTheme.gradient} p-5 sm:p-6 text-white shadow-md overflow-hidden pointer-events-none transition-all duration-300 ease-out`}
            style={{
              zIndex: 20,
              transform: 'translateY(5px) scale(0.96)',
              opacity: 0.88,
            }}
          >
            {renderCardContent(nextJob)}
          </div>
        )}

        {/* Layer 1: Front Active Card (Card 0) */}
        {currentJob && (
          <div
            className={`absolute inset-x-0 top-0 h-[190px] sm:h-[200px] rounded-3xl bg-gradient-to-br ${currentTheme.gradient} ${currentTheme.shadow} p-5 sm:p-6 text-white overflow-hidden transition-all duration-300 ease-out`}
            style={{
              zIndex: 30,
              transform: 'translateY(0px) scale(1)',
              opacity: 1,
            }}
          >
            {renderCardContent(currentJob)}
          </div>
        )}

        {/* Exiting Card Overlay: Smoothly floats up and fades out when card is swiped or tapped */}
        {animatingCard && (
          <div
            className={`absolute inset-x-0 top-0 h-[190px] sm:h-[200px] rounded-3xl bg-gradient-to-br ${animatingCard.theme.gradient} ${animatingCard.theme.shadow} p-5 sm:p-6 text-white overflow-hidden pointer-events-none transition-all duration-400 ease-out`}
            style={{
              zIndex: 40,
              transform: animatingCard.isExit
                ? 'translateY(-130%) rotate(-4deg) scale(0.94)'
                : 'translateY(0px) rotate(0deg) scale(1)',
              opacity: animatingCard.isExit ? 0 : 1,
            }}
          >
            {renderCardContent(animatingCard.job)}
          </div>
        )}
      </div>
    </div>
  );
};
