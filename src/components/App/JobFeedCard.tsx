'use client';

import React from 'react';
import { Bookmark, BookmarkCheck, Clock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { JobListing } from '@/types/job';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';

interface JobFeedCardProps {
  job: JobListing;
  isSaved?: boolean;
  onToggleSave?: (job: JobListing) => void;
  onOpenTailor?: (job: JobListing) => void;
  onViewJob?: (job: JobListing) => void;
}

export const JobFeedCard: React.FC<JobFeedCardProps> = ({
  job,
  isSaved = false,
  onToggleSave,
  onOpenTailor,
  onViewJob,
}) => {
  const { requireAuth, credits, openCreditModal } = useAuth();
  const companyInitial = (job.company || 'S').charAt(0).toUpperCase();

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

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      className="w-full bg-white rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-blue-200/80 hover:shadow-[0_12px_28px_-6px_rgba(0,100,255,0.12)] transition-colors select-none"
    >
      {/* Top Row: Blue rounded squircle company logo, title, and bookmark icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Blue squircle company logo badge with bouncy hover */}
          <motion.div
            whileHover={{ scale: 1.12, rotate: 6 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
          >
            {companyInitial}
          </motion.div>
          <div 
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => {
              if (!requireAuth()) return;
              onViewJob?.(job);
            }}
          >
            <p className="text-xs font-semibold text-slate-400 truncate">
              {job.company}
            </p>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-1 hover:text-blue-600 transition-colors">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Outline / Filled Bookmark Button with Bouncy Spring */}
        <motion.button
          type="button"
          onClick={handleSave}
          whileTap={{ scale: 0.72, rotate: 15 }}
          whileHover={{ scale: 1.15 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="p-1.5 rounded-full hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
          title={isSaved ? 'Remove Bookmark' : 'Bookmark Job'}
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-blue-600 fill-blue-600" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Salary & Project Type line */}
      <div className="my-2.5 flex items-baseline gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 text-sm sm:text-base font-black text-blue-700 tracking-tight shadow-2xs">
          {job.salary_formatted || (job.salary_min ? `₦${(job.salary_min / 1000).toFixed(0)}k/mo` : '$3,500')}
        </span>
        <span className="text-xs font-semibold text-slate-400">
          {job.job_type || 'Fixed Project'}
        </span>
      </div>

      {/* Dark/Black Pill Tags with soft spring hover */}
      <div className="flex flex-wrap items-center gap-1.5 my-3">
        {(job.tags || [job.experience_level || 'React Native', job.is_remote ? 'Remote' : 'iOS/Android', 'API']).slice(0, 3).map((tag, idx) => (
          <motion.span
            key={idx}
            whileHover={{ scale: 1.06 }}
            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white tracking-wide shadow-2xs cursor-default"
          >
            {tag}
          </motion.span>
        ))}
      </div>

      {/* Bottom Row: Clock + time on left, Tailor & filled Apply Now on right */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.posted_at || '5 hours ago'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Tailor Pitch Button */}
          {onOpenTailor && (
            <motion.button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                if (credits <= 0) {
                  openCreditModal();
                  return;
                }
                onOpenTailor(job);
              }}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs border border-transparent hover:border-blue-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Tailor Cover Letter & Pitch"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Tailor</span>
            </motion.button>
          )}

          {/* Filled Blue Apply Now Button */}
          <motion.button
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
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#0080ff] to-[#0060e6] hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold text-xs shadow-[0_4px_14px_rgba(0,128,255,0.4)] flex items-center gap-1 cursor-pointer"
          >
            <span>Apply Now</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
