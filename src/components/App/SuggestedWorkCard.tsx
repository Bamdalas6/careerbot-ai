'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  MapPin,
  X,
  Heart,
  RotateCcw,
  Info,
  PartyPopper,
} from 'lucide-react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import confetti from 'canvas-confetti';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { compactSalary, companyInitials, formatJobSalary, shortLocation } from '@/lib/job-display';
import { DAILY_REVIEW_GOAL, recordReview, useEngagement } from '@/lib/engagement';
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
}

const SEGMENT_THEMES: SegmentTheme[] = [
  { gradient: 'from-[#0084ff] via-[#0076f5] to-[#0060e6]', shadow: 'shadow-[0_18px_36px_-14px_rgba(0,120,255,0.6)]' },
  { gradient: 'from-[#0d9488] via-[#0f766e] to-[#115e59]', shadow: 'shadow-[0_18px_36px_-14px_rgba(13,148,136,0.6)]' },
  { gradient: 'from-[#6366f1] via-[#4f46e5] to-[#4338ca]', shadow: 'shadow-[0_18px_36px_-14px_rgba(99,102,241,0.6)]' },
  { gradient: 'from-[#ea580c] via-[#c2410c] to-[#9a3412]', shadow: 'shadow-[0_18px_36px_-14px_rgba(234,88,12,0.6)]' },
  { gradient: 'from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]', shadow: 'shadow-[0_18px_36px_-14px_rgba(139,92,246,0.6)]' },
  { gradient: 'from-[#059669] via-[#047857] to-[#065f46]', shadow: 'shadow-[0_18px_36px_-14px_rgba(5,150,105,0.6)]' },
  { gradient: 'from-[#e11d48] via-[#be123c] to-[#9f1239]', shadow: 'shadow-[0_18px_36px_-14px_rgba(225,29,72,0.6)]' },
  { gradient: 'from-[#0284c7] via-[#0369a1] to-[#075985]', shadow: 'shadow-[0_18px_36px_-14px_rgba(2,132,199,0.6)]' },
];

const DECK_SIZE = 12;
const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 500;
const FLY_DISTANCE = 560;
const VISIBLE_BEHIND = 2;

type Decision = 'skip' | 'save';

interface HistoryEntry {
  index: number;
  decision: Decision;
  /** True when the swipe saved a job that was not saved before, so undo can unsave it. */
  addedSave: boolean;
}

function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

export const SuggestedWorkCard: React.FC<SuggestedWorkCardProps> = ({
  jobs = [],
  savedJobIds,
  onToggleSave,
  onOpenTailor,
  onViewAll,
  onViewJob,
}) => {
  const { user, requireAuth, credits, openCreditModal } = useAuth();
  const { reviewedToday, goalReached } = useEngagement();
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const busyRef = useRef(false);
  const draggedRef = useRef(false);

  // Drag position of the top card drives its tilt and the SKIP / SAVE stamps.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-14, 0, 14]);
  const skipStamp = useTransform(x, [-110, -25], [1, 0]);
  const saveStamp = useTransform(x, [25, 110], [0, 1]);

  // If SunFi is present in jobs, prioritize it at the front of the suggested deck to match mockup
  const cardList = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const sunfi = jobs.find((j) => j.company.toLowerCase().includes('sunfi'));
    const ordered = sunfi ? [sunfi, ...jobs.filter((j) => j.id !== sunfi.id)] : jobs;
    return ordered.slice(0, DECK_SIZE);
  }, [jobs]);

  if (cardList.length === 0) {
    return null;
  }

  const isFinished = index >= cardList.length;
  const savedThisRound = history.filter((h) => h.decision === 'save').length;

  const guardCredits = () => {
    if (!requireAuth()) return false;
    if (credits <= 0) {
      openCreditModal();
      return false;
    }
    return true;
  };

  const celebrateGoal = (reviewed: number) => {
    if (reviewed !== DAILY_REVIEW_GOAL) return;
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors: ['#0080ff', '#8b5cf6', '#fbbf24', '#34d399', '#f472b6'] });
    showToast({ emoji: '🏆', message: `Daily goal done — ${DAILY_REVIEW_GOAL} picks reviewed!`, tone: 'celebrate', durationMs: 3200 });
  };

  /** Fly the top card off-screen, then commit the decision. */
  const decide = (decision: Decision) => {
    if (busyRef.current || isFinished) return;
    const job = cardList[index];

    if (decision === 'save' && !user) {
      // Saving needs an account: put the card back and open sign-in instead.
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 32 });
      requireAuth();
      return;
    }

    busyRef.current = true;
    haptic(decision === 'save' ? 14 : 8);
    const alreadySaved = savedJobIds?.has(job.id) ?? false;
    const direction = decision === 'save' ? 1 : -1;

    animate(x, direction * FLY_DISTANCE, { duration: 0.26, ease: [0.4, 0, 1, 1] }).then(() => {
      if (decision === 'save' && !alreadySaved) {
        onToggleSave?.(job);
        confetti({ particleCount: 30, spread: 55, origin: { x: 0.75, y: 0.45 }, colors: ['#f472b6', '#fb7185', '#fbbf24'] });
        showToast({ emoji: '💖', message: `Saved ${job.title}`, tone: 'success' });
      } else if (decision === 'save') {
        showToast({ emoji: '📌', message: 'Already in your saved jobs' });
      }
      setHistory((prev) => [...prev, { index, decision, addedSave: decision === 'save' && !alreadySaved }]);
      setIndex((i) => i + 1);
      x.set(0);
      busyRef.current = false;
      celebrateGoal(recordReview(1));
    });
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last || busyRef.current) return;
    busyRef.current = true;
    haptic(6);
    if (last.addedSave) onToggleSave?.(cardList[last.index]);
    setHistory((prev) => prev.slice(0, -1));
    setIndex(last.index);
    recordReview(-1);
    // Bring the card back in from the side it left.
    x.set(last.decision === 'save' ? FLY_DISTANCE : -FLY_DISTANCE);
    animate(x, 0, { type: 'spring', stiffness: 380, damping: 30 }).then(() => {
      busyRef.current = false;
    });
  };

  const restart = () => {
    setHistory([]);
    setIndex(0);
    x.set(0);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) decide('skip');
    else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) decide('save');
    else animate(x, 0, { type: 'spring', stiffness: 500, damping: 32 });
    // The click that ends a drag must not count as a tap.
    setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  };

  const openDetails = (job: JobListing) => {
    if (!guardCredits()) return;
    if (onViewJob) onViewJob(job);
    else window.open(job.apply_url, '_blank');
  };

  const renderCardContent = (job: JobListing) => {
    const salary = formatJobSalary(job);
    return (
      <div className="relative h-full flex flex-col justify-between">
        <div className="pointer-events-none absolute -top-20 -right-12 w-44 h-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-40 h-40 rounded-full bg-black/10" />

        <div className="relative flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 text-white font-black text-sm">
            {companyInitials(job.company)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/85 truncate">{job.company}</p>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight truncate">{job.title}</h3>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 text-xs font-semibold text-white/80 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{shortLocation(job)}</span>
          {job.job_type && <span className="text-white/60 shrink-0">• {job.job_type}</span>}
        </div>

        <div className="relative flex items-center gap-1.5 overflow-hidden">
          {(job.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/10 truncate max-w-[130px]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="relative flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 text-[15px] font-black text-white tracking-tight truncate">
            {salary ? compactSalary(salary) : 'Pay not disclosed'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenTailor && (
              <button
                type="button"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (guardCredits()) onOpenTailor(job);
                }}
                className="w-9 h-9 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center border border-white/20 active:scale-95 transition-all cursor-pointer"
                title="Tailor application pitch"
                aria-label="Tailor application pitch"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>
            )}
            <button
              type="button"
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openDetails(job);
              }}
              className="px-3.5 py-2 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>View Job</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Top card plus the ones peeking behind it, rendered back-to-front.
  const stack = cardList
    .map((job, i) => ({ job, i, depth: i - index }))
    .filter(({ depth }) => depth >= 0 && depth <= VISIBLE_BEHIND + 1)
    .reverse();

  const goalProgress = Math.min(1, reviewedToday / DAILY_REVIEW_GOAL);

  return (
    <section className="w-full my-4 select-none" aria-roledescription="carousel" aria-label="Suggested jobs">
      <div className="flex items-center justify-between mb-3 px-1">
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

      {/* Daily goal */}
      <div className="mb-3 px-1 flex items-center gap-2.5">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${goalReached ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-[#0080ff] to-violet-500'}`}
            initial={false}
            animate={{ width: `${goalProgress * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
        <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
          {goalReached ? '🏆 Daily goal done' : `🎯 ${reviewedToday}/${DAILY_REVIEW_GOAL} picks today`}
        </span>
      </div>

      {/* Deck: fixed height so nothing below it moves while swiping */}
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') decide('skip');
          else if (e.key === 'ArrowRight') decide('save');
          else if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') undo();
          else if (e.key === 'Enter' && !isFinished) openDetails(cardList[index]);
        }}
        className="relative h-[236px] sm:h-[246px] rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4"
        aria-label="Swipe left to skip, right to save. Arrow keys work too."
      >
        {isFinished ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="absolute inset-x-0 top-0 h-[212px] sm:h-[222px] rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 text-white p-6 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <motion.div
              animate={{ rotate: [0, -12, 12, -6, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1, delay: 0.2 }}
              className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-3"
            >
              <PartyPopper className="w-6 h-6 text-amber-300" />
            </motion.div>
            <p className="text-lg font-black tracking-tight">You&apos;re all caught up!</p>
            <p className="mt-1 text-xs text-white/70">
              {cardList.length} picks reviewed · {savedThisRound} saved
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={restart}
                className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Review again
              </button>
              {onViewAll && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="px-4 py-2 rounded-full bg-white text-slate-900 text-xs font-extrabold flex items-center gap-1 hover:bg-slate-100 transition-colors"
                >
                  See all jobs
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          stack.map(({ job, i, depth }) => {
            const theme = SEGMENT_THEMES[i % SEGMENT_THEMES.length];
            const isTop = depth === 0;
            const hidden = depth > VISIBLE_BEHIND;
            return (
              <motion.div
                key={job.id}
                initial={false}
                animate={{
                  scale: 1 - depth * 0.05,
                  y: depth * 12,
                  opacity: hidden ? 0 : 1,
                  filter: isTop ? 'brightness(1)' : `brightness(${1 - depth * 0.05})`,
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                style={isTop ? { x, rotate, zIndex: 30 } : { zIndex: 30 - depth }}
                drag={isTop ? 'x' : false}
                dragDirectionLock
                dragMomentum={false}
                onDragStart={() => {
                  draggedRef.current = true;
                }}
                onDragEnd={isTop ? handleDragEnd : undefined}
                onClick={() => {
                  if (!isTop || draggedRef.current) return;
                  decide('skip');
                }}
                className={`absolute inset-x-0 top-0 h-[212px] sm:h-[222px] origin-bottom rounded-3xl bg-gradient-to-br ${theme.gradient} ${
                  isTop ? theme.shadow : ''
                } p-5 text-white overflow-hidden touch-pan-y ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                aria-hidden={!isTop}
                aria-label={isTop ? `${i + 1} of ${cardList.length}: ${job.title} at ${job.company}` : undefined}
              >
                {renderCardContent(job)}

                {isTop && (
                  <>
                    <motion.span
                      style={{ opacity: skipStamp }}
                      className="pointer-events-none absolute top-5 right-5 -rotate-12 px-3 py-1 rounded-xl border-[3px] border-white text-white text-lg font-black tracking-widest bg-rose-500/80"
                    >
                      SKIP
                    </motion.span>
                    <motion.span
                      style={{ opacity: saveStamp }}
                      className="pointer-events-none absolute top-5 left-5 rotate-12 px-3 py-1 rounded-xl border-[3px] border-white text-white text-lg font-black tracking-widest bg-emerald-500/80"
                    >
                      SAVE
                    </motion.span>
                  </>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Action bar */}
      <div className="mt-1 flex items-center justify-center gap-4">
        <DeckButton label="Undo last swipe" onClick={undo} disabled={history.length === 0} size="sm">
          <RotateCcw className="w-4 h-4 text-amber-500" />
        </DeckButton>
        <DeckButton label="Skip job" onClick={() => decide('skip')} disabled={isFinished} size="lg">
          <X className="w-6 h-6 text-rose-500 stroke-[3]" />
        </DeckButton>
        <DeckButton label="Save job" onClick={() => decide('save')} disabled={isFinished} size="lg" accent>
          <Heart className="w-6 h-6 text-white fill-white" />
        </DeckButton>
        <DeckButton
          label="Job details"
          onClick={() => !isFinished && openDetails(cardList[index])}
          disabled={isFinished}
          size="sm"
        >
          <Info className="w-4 h-4 text-blue-500" />
        </DeckButton>
      </div>
      <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
        {isFinished ? 'Nice work! Come back tomorrow for fresh picks.' : `Swipe ← skip · save → · ${index + 1} of ${cardList.length}`}
      </p>
    </section>
  );
};

function DeckButton({
  label,
  onClick,
  disabled,
  size,
  accent = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size: 'sm' | 'lg';
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileHover={disabled ? undefined : { scale: 1.1, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={`rounded-full flex items-center justify-center transition-opacity disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
        size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'
      } ${
        accent
          ? 'bg-gradient-to-br from-pink-500 to-rose-500 shadow-[0_10px_24px_-8px_rgba(244,63,94,0.7)]'
          : 'bg-white border border-slate-100 shadow-[0_8px_20px_-10px_rgba(15,23,42,0.35)]'
      }`}
    >
      {children}
    </motion.button>
  );
}
