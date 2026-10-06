'use client';

import React, { useState, useMemo, useRef } from 'react';
import { ArrowUpRight, Sparkles, ChevronRight, Bookmark, BookmarkCheck, MapPin, Hand } from 'lucide-react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { companyInitials, formatJobSalary, shortLocation } from '@/lib/job-display';

interface SuggestedWorkCardProps {
  jobs: JobListing[];
  savedJobIds?: Set<string>;
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
}

const SEGMENT_THEMES: SegmentTheme[] = [
  {
    // Electric Blue
    gradient: 'from-[#0084ff] via-[#0076f5] to-[#0060e6]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(0,120,255,0.45)]',
    stackLayer1: 'bg-[#4da6ff]/90',
    stackLayer2: 'bg-[#99ccff]/80',
  },
  {
    // Emerald & Teal
    gradient: 'from-[#0d9488] via-[#0f766e] to-[#115e59]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(13,148,136,0.45)]',
    stackLayer1: 'bg-[#2dd4bf]/90',
    stackLayer2: 'bg-[#5eead4]/80',
  },
  {
    // Royal Indigo & Violet
    gradient: 'from-[#6366f1] via-[#4f46e5] to-[#4338ca]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(99,102,241,0.45)]',
    stackLayer1: 'bg-[#818cf8]/90',
    stackLayer2: 'bg-[#a5b4fc]/80',
  },
  {
    // Sunset Coral & Orange
    gradient: 'from-[#ea580c] via-[#c2410c] to-[#9a3412]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(234,88,12,0.45)]',
    stackLayer1: 'bg-[#fb923c]/90',
    stackLayer2: 'bg-[#fdba74]/80',
  },
  {
    // Amethyst Purple
    gradient: 'from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(139,92,246,0.45)]',
    stackLayer1: 'bg-[#a78bfa]/90',
    stackLayer2: 'bg-[#c4b5fd]/80',
  },
  {
    // Jade Green
    gradient: 'from-[#059669] via-[#047857] to-[#065f46]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(5,150,105,0.45)]',
    stackLayer1: 'bg-[#34d399]/90',
    stackLayer2: 'bg-[#6ee7b7]/80',
  },
  {
    // Crimson Rose
    gradient: 'from-[#e11d48] via-[#be123c] to-[#9f1239]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(225,29,72,0.45)]',
    stackLayer1: 'bg-[#fb7185]/90',
    stackLayer2: 'bg-[#fda4af]/80',
  },
  {
    // Deep Ocean Azure
    gradient: 'from-[#0284c7] via-[#0369a1] to-[#075985]',
    shadow: 'shadow-[0_16px_36px_-10px_rgba(2,132,199,0.45)]',
    stackLayer1: 'bg-[#38bdf8]/90',
    stackLayer2: 'bg-[#7dd3fc]/80',
  },
];

const SWIPE_THRESHOLD = 70;

const cardVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 70 : -70, opacity: 0, scale: 0.95, rotate: 0 }),
  center: { x: 0, opacity: 1, scale: 1, rotate: 0 },
  exit: (direction: number) => ({
    x: direction > 0 ? -280 : 280,
    opacity: 0,
    rotate: direction > 0 ? -10 : 10,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export const SuggestedWorkCard: React.FC<SuggestedWorkCardProps> = ({
  jobs = [],
  savedJobIds,
  onToggleSave,
  onOpenTailor,
  onViewAll,
  onViewJob,
}) => {
  const { requireAuth, credits, openCreditModal } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const draggedRef = useRef(false);

  // If SunFi is present in jobs, prioritize it at the front of the suggested deck to match mockup
  const cardList = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const sunfi = jobs.find((j) => j.company.toLowerCase().includes('sunfi'));
    const ordered = sunfi ? [sunfi, ...jobs.filter((j) => j.id !== sunfi.id)] : jobs;
    return ordered.slice(0, 12);
  }, [jobs]);

  if (cardList.length === 0) {
    return null;
  }

  const safeIndex = currentIndex % cardList.length;
  const currentJob = cardList[safeIndex];
  const currentTheme = SEGMENT_THEMES[safeIndex % SEGMENT_THEMES.length];
  const layer2Theme = SEGMENT_THEMES[(safeIndex + 1) % SEGMENT_THEMES.length];
  const layer3Theme = SEGMENT_THEMES[(safeIndex + 2) % SEGMENT_THEMES.length];
  const canPaginate = cardList.length > 1;

  const paginate = (step: 1 | -1) => {
    if (!canPaginate) return;
    setHasInteracted(true);
    setDirection(step);
    setCurrentIndex((prev) => (prev + step + cardList.length) % cardList.length);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -SWIPE_THRESHOLD) paginate(1);
    else if (swipe > SWIPE_THRESHOLD) paginate(-1);
    // Let the click that ends a drag be ignored, then re-arm tap-to-advance.
    setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  };

  const guardCredits = () => {
    if (!requireAuth()) return false;
    if (credits <= 0) {
      openCreditModal();
      return false;
    }
    return true;
  };

  const renderCardContent = (job: JobListing) => {
    const salary = formatJobSalary(job);
    const isSaved = savedJobIds?.has(job.id) ?? false;
    return (
      <>
        {/* Decorative depth bubbles */}
        <div className="pointer-events-none absolute -top-16 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 w-40 h-40 rounded-full bg-black/10" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 text-white font-black text-sm shadow-inner">
              {companyInitials(job.company)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/85 truncate">{job.company}</p>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight line-clamp-1">
                {job.title}
              </h3>
            </div>
          </div>

          {onToggleSave && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!requireAuth()) return;
                onToggleSave(job);
              }}
              whileTap={{ scale: 0.75 }}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0 cursor-pointer"
              aria-label={isSaved ? 'Remove bookmark' : 'Bookmark job'}
              aria-pressed={isSaved}
            >
              {isSaved ? <BookmarkCheck className="w-4.5 h-4.5 fill-white" /> : <Bookmark className="w-4.5 h-4.5" />}
            </motion.button>
          )}
        </div>

        <div className="relative mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-white/80">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{shortLocation(job)}</span>
          {job.job_type && <span className="text-white/60">• {job.job_type}</span>}
        </div>

        <div className="relative flex flex-wrap items-center gap-1.5 my-3 sm:my-3.5">
          {(job.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/10 truncate max-w-[140px]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="relative flex items-center justify-between gap-2 pt-0.5">
          <span className="min-w-0 flex-1 text-sm sm:text-base font-black text-white tracking-tight leading-tight line-clamp-2">
            {salary ?? 'Pay not disclosed'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenTailor && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (guardCredits()) onOpenTailor(job);
                }}
                className="px-3.5 py-2 sm:py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                title="Tailor application pitch"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Pitch</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!guardCredits()) return;
                if (onViewJob) onViewJob(job);
                else window.open(job.apply_url, '_blank');
              }}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
            >
              <span>View Job</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <section className="w-full my-4 select-none" aria-roledescription="carousel" aria-label="Suggested jobs">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap">Suggested Works</h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-blue-500 fill-blue-500" />
            <span>For You</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors cursor-pointer active:scale-95"
            >
              <span>See all</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      <div
        tabIndex={canPaginate ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') paginate(1);
          if (e.key === 'ArrowLeft') paginate(-1);
        }}
        className="relative w-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {/* Peek tabs hint at the cards waiting behind the active one */}
        {cardList.length > 2 && (
          <div className={`mx-8 h-2.5 rounded-t-2xl ${layer3Theme.stackLayer2} transition-colors duration-300`} />
        )}
        {canPaginate && (
          <div className={`mx-4 h-2.5 rounded-t-2xl ${layer2Theme.stackLayer1} -mt-1 transition-colors duration-300`} />
        )}

        <div className={`relative ${canPaginate ? '-mt-1' : ''}`}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentJob.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              drag={canPaginate ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragStart={() => {
                draggedRef.current = true;
              }}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (draggedRef.current) return;
                paginate(1);
              }}
              whileTap={canPaginate ? { scale: 0.985 } : undefined}
              className={`relative rounded-3xl bg-gradient-to-br ${currentTheme.gradient} ${currentTheme.shadow} p-5 sm:p-6 text-white overflow-hidden ${
                canPaginate ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              aria-label={`${safeIndex + 1} of ${cardList.length}: ${currentJob.title} at ${currentJob.company}`}
            >
              {renderCardContent(currentJob)}
            </motion.div>
          </AnimatePresence>
        </div>

        {canPaginate && (
          <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-400">
            {!hasInteracted && (
              <span className="flex items-center gap-1.5">
                <motion.span
                  animate={{ x: [0, -6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex"
                >
                  <Hand className="w-3.5 h-3.5" />
                </motion.span>
                Swipe or tap to browse
              </span>
            )}
            <span className="flex items-center gap-1" aria-hidden="true">
              {cardList.map((job, i) => (
                <span
                  key={job.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === safeIndex ? 'w-4 bg-[#0080ff]' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
