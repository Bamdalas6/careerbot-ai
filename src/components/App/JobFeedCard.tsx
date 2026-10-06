'use client';

import React from 'react';
import { Bookmark, BookmarkCheck, Clock, MapPin, Sparkles, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { JobListing } from '@/types/job';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { CompanyAvatar } from './CompanyAvatar';
import { FIT_LABELS, FitLevel, formatJobSalary, isFreshJob, shortLocation } from '@/lib/job-display';

interface JobFeedCardProps {
  job: JobListing;
  isSaved?: boolean;
  fitLevel?: FitLevel | null;
  onToggleSave?: (job: JobListing) => void;
  onOpenTailor?: (job: JobListing) => void;
  onViewJob?: (job: JobListing) => void;
}

export const JobFeedCard: React.FC<JobFeedCardProps> = ({
  job,
  isSaved = false,
  fitLevel = null,
  onToggleSave,
  onOpenTailor,
  onViewJob,
}) => {
  const { requireAuth, credits, openCreditModal } = useAuth();
  const salary = formatJobSalary(job);
  const isNew = isFreshJob(job);
  const tags = (job.tags || []).filter((t) => t.toLowerCase() !== 'remote').slice(0, 3);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (!isSaved) {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#0080ff', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'],
      });
    }
    onToggleSave?.(job);
  };

  const openDetails = () => {
    if (!requireAuth()) return;
    onViewJob?.(job);
  };

  const handleApply = (e: React.MouseEvent) => {
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
  };

  const handleTailor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (credits <= 0) {
      openCreditModal();
      return;
    }
    onOpenTailor?.(job);
  };

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetails();
        }
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      className="group relative w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.06)] hover:border-blue-200/80 hover:shadow-[0_16px_32px_-10px_rgba(0,100,255,0.18)] transition-[border-color,box-shadow] select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`${job.title} at ${job.company}`}
    >
      {/* Top row: avatar, company/title, bookmark */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyAvatar company={job.company} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs font-semibold text-slate-500 truncate">{job.company}</p>
              {isNew && (
                <span className="shrink-0 px-1.5 py-px rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                  New
                </span>
              )}
            </div>
            <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
              {job.title}
            </h3>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={handleSave}
          whileTap={{ scale: 0.72, rotate: 15 }}
          whileHover={{ scale: 1.15 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={`p-2 -m-1 rounded-full transition-colors shrink-0 cursor-pointer ${
            isSaved ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
          }`}
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark job'}
          aria-pressed={isSaved}
        >
          {isSaved ? <BookmarkCheck className="w-5 h-5 fill-blue-600/20" /> : <Bookmark className="w-5 h-5" />}
        </motion.button>
      </div>

      {/* Meta row: location, type, fit */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[160px]">{shortLocation(job)}</span>
        </span>
        {job.job_type && <span className="text-slate-400">• {job.job_type}</span>}
        {fitLevel && (
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${FIT_LABELS[fitLevel].className}`}>
            🎯 {FIT_LABELS[fitLevel].label}
          </span>
        )}
      </div>

      {/* Salary */}
      <div className="mt-3">
        {salary ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 text-sm font-black text-blue-700 tracking-tight">
            {salary}
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-500">
            Pay not disclosed
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900 text-white tracking-wide truncate max-w-[140px]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{job.posted_at || 'Recently'}</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTailor && (
            <motion.button
              type="button"
              onClick={handleTailor}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Tailor cover letter & pitch"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Tailor</span>
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={handleApply}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            className="pl-4 pr-3 py-1.5 rounded-full bg-gradient-to-r from-[#0080ff] to-[#0060e6] text-white font-extrabold text-xs shadow-[0_4px_14px_rgba(0,128,255,0.4)] flex items-center gap-1 cursor-pointer"
          >
            <span>Apply</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
