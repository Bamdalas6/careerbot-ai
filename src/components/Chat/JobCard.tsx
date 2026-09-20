'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  DollarSign, 
  ExternalLink, 
  Sparkles, 
  Bookmark, 
  BookmarkCheck, 
  Briefcase, 
  Share2,
  Search
} from 'lucide-react';
import { JobListing } from '@/types/job';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';

interface JobCardProps {
  job: JobListing;
  isSaved: boolean;
  onToggleSave: (job: JobListing) => void;
  onOpenTailor: (job: JobListing) => void;
  onSearch?: (query: string) => void;
  onViewJob?: (job: JobListing) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  onToggleSave,
  onOpenTailor,
  onSearch,
  onViewJob,
}) => {
  const router = useRouter();
  const { user, credits, requireAuth, openCreditModal } = useAuth();

  const handleSearchJob = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (credits <= 0) {
      openCreditModal();
      return;
    }
    onSearch?.(query);
  };
  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (!isSaved) {
      // Trigger subtle celebratory confetti
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ffffff', '#f7f8f8', '#8a8f98', '#62666d']
      });
    }
    onToggleSave(job);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} at ${job.company}`,
          text: `Check out this ${job.title} position at ${job.company}:`,
          url: job.apply_url,
        });
      } catch {
        // Share cancelled or not supported
      }
    } else {
      navigator.clipboard.writeText(job.apply_url);
      alert('Application link copied to clipboard!');
    }
  };

  const score = job.match_score || 80;
  const matchPillClasses = score >= 90
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300  #f7f8f8] '
    : score >= 75
    ? 'bg-indigo-100 text-indigo-800 border-indigo-300 .06] #c9cbd0] .14]'
    : 'bg-zinc-200/80 text-zinc-700 border-zinc-300 .03] #8a8f98] ';

  return (
    <div className="panel group relative flex flex-col justify-between rounded-2xl p-5 shadow-xs transition-all duration-200">
      {/* Top Bar: Company info & Actions */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-lg font-bold text-zinc-900 shadow-xs   ">
              {(job.company || '?').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-zinc-900 transition hover:text-black  :text-white truncate">
                  {job.company}
                </span>
                <span className="rounded-md border border-zinc-200/80 bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600   ">
                  {job.source}
                </span>
              </div>
              <p className="text-xs text-zinc-500 ">{job.posted_at}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => handleSearchJob(e, job.title)}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800  :bg-zinc-800 :text-zinc-200 transition"
              title={`Search for "${job.title}" roles`}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800  :bg-zinc-800 :text-zinc-200 transition"
              title="Share job link"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              className={`rounded-lg p-1.5 transition ${
                isSaved
                  ? 'bg-zinc-900 text-white  #f7f8f8]'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800  :bg-zinc-800 :text-zinc-200'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save job'}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Job Title - click to search */}
        <h3
          onClick={(e) => handleSearchJob(e, job.title)}
          className="mt-3.5 text-base font-bold text-zinc-900 group-hover:text-black  :text-[#f7f8f8] transition line-clamp-2 leading-snug cursor-pointer hover:underline"
          title={`Click to search roles for "${job.title}"`}
        >
          {job.title}
        </h3>

        {/* Badges: Location, Remote, Salary */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {job.location && (
            <span className="flex items-center gap-1 rounded-md border border-zinc-200/80 bg-zinc-100 px-2 py-1 font-medium text-zinc-700   ">
              <MapPin className="h-3 w-3 text-zinc-500 " />
              {job.location}
            </span>
          )}

          {job.is_remote && (
            <span className="flex items-center gap-1 rounded-md border border-blue-200/80 bg-blue-50 px-2 py-1 font-semibold text-blue-700  .07] #c9cbd0]">
              Remote
            </span>
          )}

          {job.experience_level && (
            <span className="flex items-center gap-1 rounded-md border border-zinc-200/80 bg-zinc-100 px-2 py-1 font-medium text-zinc-700   ">
              <Briefcase className="h-3 w-3 text-zinc-500 " />
              {job.experience_level}
            </span>
          )}

          {job.salary_formatted && (
            <span className="flex items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700  .07] #f7f8f8]">
              <DollarSign className="h-3 w-3" />
              {job.salary_formatted}
            </span>
          )}
        </div>

        {/* AI Match Reason Box */}
        {job.match_score && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3  ">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-900 ">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 #8a8f98]" />
                <span>AI Match Fit</span>
              </div>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${matchPillClasses}`}>
                {job.match_score}% Match
              </span>
            </div>
            {job.match_reason && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 ">
                {job.match_reason}
              </p>
            )}
          </div>
        )}

        {/* Snippet preview */}
        {job.snippet && (
          <p className="mt-3 text-xs leading-relaxed text-zinc-600  line-clamp-2">
            {job.snippet}
          </p>
        )}

        {/* Tags */}
        {Array.isArray(job.tags) && job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 4).map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSearchJob(e, tag)}
                className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-200    :border-zinc-600 :bg-zinc-700/60 transition cursor-pointer"
                title={`Search for "${tag}" jobs`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA Actions */}
      <div className="mt-5 flex items-center gap-2 pt-3 border-t border-zinc-200 ">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!requireAuth()) return;
            if (credits <= 0) {
              openCreditModal();
              return;
            }
            try {
              localStorage.setItem('career_bot_active_tailor_job', JSON.stringify(job));
            } catch {}
            router.push(`/tailor?id=${encodeURIComponent(job.id)}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-400 .14] .05] #f7f8f8] :bg-white/[0.09] :border-white/25 cursor-pointer relative z-10 active:scale-[0.98] select-none"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 #8a8f98] pointer-events-none" />
          <span className="pointer-events-none">Tailor Pitch</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black :bg-zinc-100 shadow-xs cursor-pointer relative z-10 active:scale-[0.98] select-none"
        >
          <span>Apply Now</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
