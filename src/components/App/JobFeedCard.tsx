'use client';

import React from 'react';
import { Bookmark, BookmarkCheck, Clock, Sparkles } from 'lucide-react';
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
      });
    }
    onToggleSave?.(job);
  };

  return (
    <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:shadow-md transition-all duration-200 select-none">
      {/* Top Row: Blue rounded squircle company logo, title, and bookmark icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Blue squircle company logo badge matching screenshot */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
            {companyInitial}
          </div>
          <div 
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => {
              if (!requireAuth()) return;
              onViewJob?.(job);
            }}
          >
            <p className="text-xs font-medium text-slate-400 truncate">
              {job.company}
            </p>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-1 hover:text-blue-600 transition-colors">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Outline Bookmark Button */}
        <button
          type="button"
          onClick={handleSave}
          className="p-1 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
          title={isSaved ? 'Remove Bookmark' : 'Bookmark Job'}
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-blue-600 fill-blue-600" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Salary & Project Type line matching screenshot ("$3,500 Fixed Project") */}
      <div className="my-2.5 flex items-baseline gap-1.5">
        <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
          {job.salary_formatted || (job.salary_min ? `₦${(job.salary_min / 1000).toFixed(0)}k/mo` : '$3,500')}
        </span>
        <span className="text-xs font-medium text-slate-400">
          {job.job_type || 'Fixed Project'}
        </span>
      </div>

      {/* Dark/Black Pill Tags matching screenshot ("React Native", "iOS/Android", "API") */}
      <div className="flex flex-wrap items-center gap-1.5 my-3">
        {(job.tags || [job.experience_level || 'React Native', job.is_remote ? 'Remote' : 'iOS/Android', 'API']).slice(0, 3).map((tag, idx) => (
          <span
            key={idx}
            className="px-3 py-1 rounded-md text-xs font-bold bg-slate-900 text-white tracking-wide"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Bottom Row: Clock + time on left, Tailor & filled Apply Now on right */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{job.posted_at || '5 hours ago'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Tailor Pitch Button */}
          {onOpenTailor && (
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                if (credits <= 0) {
                  openCreditModal();
                  return;
                }
                onOpenTailor(job);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Tailor Cover Letter & Pitch"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Tailor</span>
            </button>
          )}

          {/* Filled Blue Apply Now Button - opens job info modal before applying */}
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
            className="px-4 py-1.5 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white font-extrabold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Apply Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
