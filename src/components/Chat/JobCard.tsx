'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowUpRight, Sparkles, Bookmark, BookmarkCheck, Briefcase, Share2, Search } from 'lucide-react';
import { JobListing } from '@/types/job';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { CompanyAvatar } from '@/components/App/CompanyAvatar';
import { formatJobSalary, getApplyDestination, isFreshJob, openApplyDestination, shortLocation } from '@/lib/job-display';

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
  onSearch,
  onViewJob,
}) => {
  const router = useRouter();
  const { credits, requireAuth, openCreditModal } = useAuth();

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
        colors: ['#0080ff', '#38bdf8', '#34d399', '#fbbf24', '#f472b6']
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
          url: getApplyDestination(job).url,
        });
      } catch {
        // Share cancelled or not supported
      }
    } else {
      navigator.clipboard.writeText(getApplyDestination(job).url);
      alert('Application link copied to clipboard!');
    }
  };

  const salary = formatJobSalary(job);
  const score = job.match_score;
  const matchPillClasses =
    score && score >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score && score >= 75
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';
  const iconButton = 'rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer';

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] hover:border-blue-200 hover:shadow-[0_14px_30px_-12px_rgba(0,100,255,0.22)] hover:-translate-y-0.5 transition-all duration-200">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyAvatar company={job.company} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-slate-600 truncate">{job.company}</span>
                {isFreshJob(job) && (
                  <span className="shrink-0 px-1.5 py-px rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                    New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {job.posted_at}
                {job.source ? ` · via ${job.source}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center -mr-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => handleSearchJob(e, job.title)}
              className={iconButton}
              aria-label={`Search for more "${job.title}" roles`}
            >
              <Search className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleShare} className={iconButton} aria-label="Share job link">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              className={isSaved ? 'rounded-full p-2 bg-blue-50 text-blue-600 transition cursor-pointer' : iconButton}
              aria-label={isSaved ? 'Remove from saved' : 'Save job'}
              aria-pressed={isSaved}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4 fill-blue-600/20" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <h3
          onClick={(e) => handleSearchJob(e, job.title)}
          className="mt-3 text-[15px] font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug cursor-pointer"
          title={`Search roles like "${job.title}"`}
        >
          {job.title}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2 py-1 text-slate-600">
            <MapPin className="h-3 w-3 text-slate-400" />
            <span className="truncate max-w-[140px]">{shortLocation(job)}</span>
          </span>
          {job.is_remote && shortLocation(job) !== 'Remote' && (
            <span className="rounded-full bg-sky-50 border border-sky-100 px-2 py-1 text-sky-700">🏝️ Remote</span>
          )}
          {job.experience_level && (
            <span className="flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2 py-1 text-slate-600">
              <Briefcase className="h-3 w-3 text-slate-400" />
              {job.experience_level}
            </span>
          )}
        </div>

        {salary && (
          <div className="mt-2.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 text-[13px] font-black text-blue-700">
              {salary}
            </span>
          </div>
        )}

        {score ? (
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border border-indigo-100 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                AI match
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${matchPillClasses}`}>{score}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#0080ff] to-violet-500" style={{ width: `${Math.min(100, score)}%` }} />
            </div>
            {job.match_reason && <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{job.match_reason}</p>}
          </div>
        ) : (
          job.snippet && <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-2">{job.snippet}</p>
        )}

        {Array.isArray(job.tags) && job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 4).map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSearchJob(e, tag)}
                className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-blue-600 transition cursor-pointer"
                title={`Search for "${tag}" jobs`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
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
          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Tailor Pitch
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
              openApplyDestination(job);
            }
          }}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#0080ff] to-[#0060e6] px-3 py-2 text-xs font-extrabold text-white shadow-[0_4px_14px_rgba(0,128,255,0.4)] transition cursor-pointer active:scale-95"
        >
          Apply Now
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
