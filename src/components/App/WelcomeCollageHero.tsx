'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Upload, MapPin, ArrowRight, FileText, Target, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { JobListing } from '@/types/job';
import { CompanyAvatar } from './CompanyAvatar';
import { Logo } from '@/components/Brand/Logo';
import { formatJobSalary, isRemoteJob, shortLocation } from '@/lib/job-display';

interface WelcomeCollageHeroProps {
  jobs: JobListing[];
  onStart: () => void;
  onOpenResume: () => void;
}

// Where the company bubbles orbit the live card; float classes stagger the bobbing.
const BUBBLE_SLOTS = [
  { className: 'top-3 left-5 sm:left-10', size: 'lg' as const, float: 'animate-bubble-float-1' },
  { className: 'top-1 right-16 sm:right-24', size: 'md' as const, float: 'animate-bubble-float-2' },
  { className: 'top-[42%] -left-1 sm:left-2', size: 'md' as const, float: 'animate-bubble-float-3' },
  { className: 'top-[38%] right-0 sm:right-3', size: 'lg' as const, float: 'animate-bubble-float-1' },
  { className: 'bottom-3 left-10 sm:left-16', size: 'sm' as const, float: 'animate-bubble-float-2' },
  { className: 'bottom-6 right-10 sm:right-16', size: 'md' as const, float: 'animate-bubble-float-3' },
];

const ROTATE_MS = 2800;

function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular-nums">{display}</span>;
}

export const WelcomeCollageHero: React.FC<WelcomeCollageHeroProps> = ({ jobs, onStart, onOpenResume }) => {
  const featured = useMemo(() => jobs.filter((j) => formatJobSalary(j)).slice(0, 10), [jobs]);
  const companies = useMemo(() => {
    // Skip companies already rotating through the live card so the collage shows more variety.
    const seen = new Set(featured.map((j) => j.company.toLowerCase()));
    const list: string[] = [];
    for (const job of jobs) {
      const key = job.company.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(job.company);
      }
      if (list.length === BUBBLE_SLOTS.length) break;
    }
    return list;
  }, [jobs, featured]);
  const stats = useMemo(
    () => ({
      roles: jobs.length,
      companies: new Set(jobs.map((j) => j.company.toLowerCase())).size,
      remote: jobs.filter(isRemoteJob).length,
    }),
    [jobs]
  );

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % featured.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [featured.length]);

  const activeJob = featured[activeIdx % Math.max(1, featured.length)];

  const handleStartWithPop = () => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.85 },
      colors: ['#0080ff', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'],
    });
    onStart();
  };

  return (
    <div className="relative flex flex-col items-center min-h-[100dvh] px-4 sm:px-6 pt-4 pb-10 max-w-md sm:max-w-xl mx-auto w-full text-center select-none overflow-hidden">
      {/* Atmosphere */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-gradient-to-b from-blue-200/70 via-sky-100/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/4 -left-16 w-52 h-52 bg-violet-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-16 w-52 h-52 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top bar */}
      <div className="w-full flex items-center justify-between py-1 z-10">
        <Logo size="md" animated />
        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.92 }}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
        >
          <span>Explore Jobs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Collage: real companies orbiting a live opening card */}
      <div className="relative w-full h-[330px] sm:h-[360px] flex items-center justify-center mt-2">
        <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-dashed border-blue-200/70 pointer-events-none animate-spin-very-slow" />
        <div className="absolute w-80 h-80 sm:w-[22rem] sm:h-[22rem] rounded-full border border-sky-100 pointer-events-none" />

        {companies.map((company, i) => {
          const slot = BUBBLE_SLOTS[i];
          return (
            <motion.div
              key={company}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 + i * 0.08 }}
              className={`absolute ${slot.className}`}
              title={company}
            >
              <div className={slot.float}>
                <CompanyAvatar company={company} size={slot.size} className="shadow-lg ring-4" />
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <span className="animate-bubble-float-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-lg">
            🏝️ {stats.remote} remote
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="absolute bottom-[18%] right-[14%] sm:right-[20%] z-30"
        >
          <span className="animate-bubble-float-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-700 text-[10px] font-extrabold shadow-md">
            ⚡ 1-tap AI pitch
          </span>
        </motion.div>

        {/* Live opening card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.25 }}
          className="relative z-20 w-[15.5rem] sm:w-64"
        >
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-blue-500/25 to-violet-400/25 blur-xl animate-bubble-pulse-ring" />
          <div className="relative rounded-3xl bg-white/95 backdrop-blur border border-white shadow-[0_24px_50px_-16px_rgba(30,64,175,0.35)] p-4 text-left overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Hiring now
              </span>
              <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                {featured.length > 0 ? `${(activeIdx % featured.length) + 1}/${featured.length}` : ''}
              </span>
            </div>

            <div className="h-[92px]">
              <AnimatePresence mode="wait">
                {activeJob && (
                  <motion.div
                    key={activeJob.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CompanyAvatar company={activeJob.company} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold text-slate-900 leading-tight line-clamp-1">{activeJob.title}</p>
                        <p className="text-[11px] font-semibold text-slate-500 truncate">{activeJob.company}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-black text-blue-700 truncate max-w-full">
                        {formatJobSalary(activeJob)}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 truncate">
                        <MapPin className="w-3 h-3" />
                        {shortLocation(activeJob)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Progress until the next opening rotates in */}
            <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                key={activeIdx}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }}
                className="h-full rounded-full bg-gradient-to-r from-[#0080ff] to-violet-500"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-1 max-w-sm mx-auto"
      >
        <h1 className="text-[28px] sm:text-4xl font-black text-slate-900 tracking-tight leading-[1.1]">
          Land your next role
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            faster
          </span>{' '}
          <span className="inline-block animate-bounce">🚀</span>
        </h1>
        <p className="mt-2.5 text-slate-500 text-sm font-medium px-2 leading-relaxed">
          Verified openings matched to your CV, with AI that writes a tailored pitch in one tap.
        </p>
      </motion.div>

      {/* Real numbers from the live board */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-5 w-full max-w-xs grid grid-cols-3 rounded-2xl bg-white/80 backdrop-blur border border-slate-100 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.15)] divide-x divide-slate-100"
      >
        {[
          { value: stats.roles, label: 'Open roles' },
          { value: stats.companies, label: 'Companies' },
          { value: stats.remote, label: 'Remote' },
        ].map((s) => (
          <div key={s.label} className="py-2.5">
            <div className="text-lg font-black text-slate-900 leading-none">
              <CountUp value={s.value} />
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* How it works */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600">
        {[
          { icon: FileText, label: 'Upload CV' },
          { icon: Target, label: 'Get matched' },
          { icon: Sparkles, label: 'Apply with AI' },
        ].map((step, i) => (
          <React.Fragment key={step.label}>
            {i > 0 && <span className="text-slate-300">→</span>}
            <span className="inline-flex items-center gap-1">
              <step.icon className="w-3.5 h-3.5 text-blue-500" />
              {step.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* CTAs */}
      <div className="w-full max-w-xs mt-6 space-y-2.5">
        <motion.button
          type="button"
          onClick={handleStartWithPop}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="group relative w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#0080ff] via-[#0070f3] to-indigo-600 text-white font-extrabold text-sm shadow-[0_12px_28px_-6px_rgba(0,128,255,0.55)] flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
        >
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span className="relative">Let&apos;s Start</span>
          <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
        </motion.button>

        <motion.button
          type="button"
          onClick={onOpenResume}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-full py-3 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-blue-600" />
          <span>Upload CV to Auto-Match</span>
        </motion.button>
      </div>
    </div>
  );
};
