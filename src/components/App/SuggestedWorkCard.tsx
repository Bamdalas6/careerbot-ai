'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles, ChevronRight, Bookmark, BookmarkCheck, MapPin, Hand } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { compactSalary, companyInitials, formatJobSalary, shortLocation } from '@/lib/job-display';
import { showToast } from './ToastHost';

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

// The outgoing card flies off on top while the incoming one rises from underneath,
// both fully opaque, so the two never blend into each other.
const cardVariants = {
  enter: { x: 0, rotate: 0, scale: 0.94, y: 12, zIndex: 1 },
  center: { x: 0, rotate: 0, scale: 1, y: 0, zIndex: 2 },
  exit: (direction: number) => ({
    x: direction > 0 ? -460 : 460,
    rotate: direction > 0 ? -10 : 10,
    zIndex: 3,
    opacity: 0,
    transition: {
      x: { duration: 0.32, ease: [0.4, 0, 0.6, 1] as const },
      rotate: { duration: 0.32 },
      opacity: { duration: 0.32, ease: [0.7, 0, 1, 1] as const },
    },
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

  const guardCredits = () => {
    if (!requireAuth()) return false;
    if (credits <= 0) {
      openCreditModal();
      return false;
    }
    return true;
  };

  const handleSave = (job: JobListing) => {
    if (!requireAuth()) return;
    const isSaved = savedJobIds?.has(job.id) ?? false;
    onToggleSave?.(job);
    showToast(
      isSaved
        ? { emoji: '🗑️', message: 'Removed from saved jobs' }
        : { emoji: '📌', message: 'Saved — find it under bookmarks', tone: 'success' }
    );
  };

  const handleView = (job: JobListing) => {
    if (!guardCredits()) return;
    onViewJob?.(job);
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
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
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

        {/* Fixed height: swiping never changes the layout below the deck */}
        <div className={`relative h-[212px] sm:h-[222px] ${canPaginate ? '-mt-1' : ''}`}>
          <AnimatePresence initial={false} custom={direction}>
            <DeckCard
              key={currentJob.id}
              job={currentJob}
              theme={currentTheme}
              direction={direction}
              draggable={canPaginate}
              isSaved={savedJobIds?.has(currentJob.id) ?? false}
              position={`${safeIndex + 1} of ${cardList.length}`}
              onNext={() => paginate(1)}
              onPrev={() => paginate(-1)}
              onSave={onToggleSave ? handleSave : undefined}
              onPitch={onOpenTailor ? (job) => guardCredits() && onOpenTailor(job) : undefined}
              onView={handleView}
            />
          </AnimatePresence>
        </div>

        {canPaginate && (
          <div className="mt-3 h-4 flex items-center justify-center gap-3 text-[11px] leading-none font-semibold text-slate-400">
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

interface DeckCardProps {
  job: JobListing;
  theme: SegmentTheme;
  direction: number;
  draggable: boolean;
  isSaved: boolean;
  position: string;
  onNext: () => void;
  onPrev: () => void;
  onSave?: (job: JobListing) => void;
  onPitch?: (job: JobListing) => void;
  onView: (job: JobListing) => void;
}

/** One card in the deck. Owns its drag position so it tilts with the finger and exits from where it was let go. */
const DeckCard = React.forwardRef<HTMLDivElement, DeckCardProps>(function DeckCard(
  { job, theme, direction, draggable, isSaved, position, onNext, onPrev, onSave, onPitch, onView },
  ref
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-8, 0, 8]);
  const draggedRef = useRef(false);
  const salary = formatJobSalary(job);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -SWIPE_THRESHOLD) onNext();
    else if (swipe > SWIPE_THRESHOLD) onPrev();
    // The click that ends a drag must not count as a tap.
    setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  };

  // Buttons inside the card must not start a drag or count as a tap on the card.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      style={{ x, rotate }}
      drag={draggable ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.85}
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      onClick={() => {
        if (!draggedRef.current && draggable) onNext();
      }}
      className={`absolute inset-0 origin-bottom rounded-3xl bg-gradient-to-br ${theme.gradient} ${theme.shadow} p-5 sm:p-6 text-white overflow-hidden touch-pan-y ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      aria-label={`${position}: ${job.title} at ${job.company}`}
    >
      <div className="pointer-events-none absolute -top-16 -right-10 w-44 h-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-8 w-40 h-40 rounded-full bg-black/10" />

      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 text-white font-black text-sm">
              {companyInitials(job.company)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/85 truncate">{job.company}</p>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight truncate">{job.title}</h3>
            </div>
          </div>

          {onSave && (
            <motion.button
              type="button"
              onPointerDownCapture={stop}
              onClick={(e) => {
                e.stopPropagation();
                onSave(job);
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

        <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{shortLocation(job)}</span>
          {job.job_type && <span className="text-white/60 shrink-0">• {job.job_type}</span>}
        </div>

        <div className="flex items-center gap-1.5 overflow-hidden">
          {(job.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/10 truncate max-w-[130px]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 text-sm sm:text-[15px] font-black text-white tracking-tight leading-tight line-clamp-2">
            {salary ? compactSalary(salary) : 'Pay not disclosed'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {onPitch && (
              <button
                type="button"
                onPointerDownCapture={stop}
                onClick={(e) => {
                  e.stopPropagation();
                  onPitch(job);
                }}
                className="px-3 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 active:scale-95 transition-all cursor-pointer"
                title="Tailor application pitch"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Pitch</span>
              </button>
            )}
            <button
              type="button"
              onPointerDownCapture={stop}
              onClick={(e) => {
                e.stopPropagation();
                onView(job);
              }}
              className="px-3.5 py-2 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>View Job</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
