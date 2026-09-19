'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, Bookmark, ExternalLink, Trash2, MapPin, DollarSign, ArrowRight, Briefcase, Sparkles } from 'lucide-react';
import { SavedJob, JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';

interface SavedJobsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: SavedJob[];
  onRemoveSaved: (id: string) => void;
  onUpdateStatus: (id: string, status: SavedJob['status']) => void;
  onOpenTracker?: () => void;
  onOpenTailor?: (job: JobListing) => void;
  onViewJob?: (job: JobListing) => void;
}

export const SavedJobsDrawer: React.FC<SavedJobsDrawerProps> = ({
  isOpen,
  onClose,
  savedJobs,
  onRemoveSaved,
  onUpdateStatus,
  onOpenTracker,
  onOpenTailor,
  onViewJob,
}) => {
  const router = useRouter();
  const { requireAuth } = useAuth();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-black/10 border-slate-200 bg-white bg-white text-zinc-900 text-slate-900 shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-black/10 border-slate-200 px-5 sm:px-6 py-4 bg-black/[0.02] bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] .06] text-zinc-900 #f7f8f8] border border-black/10 ">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-slate-900 text-base">Saved Opportunities</h3>
              <p className="text-xs text-zinc-600 text-slate-500">
                {savedJobs.length} {savedJobs.length === 1 ? 'role' : 'roles'} in your pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] hover:bg-slate-100 hover:text-zinc-900 hover:text-slate-900 transition"
            aria-label="Close saved drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {savedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-400 ">
              <Bookmark className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-zinc-700 text-slate-500">No saved jobs yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Click the bookmark icon on any job card to save it to your pipeline.
              </p>
            </div>
          ) : (
            savedJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col rounded-2xl border border-black/10 border-slate-200 bg-white bg-white/80 p-4 space-y-3 shadow-xs hover:border-black/20 :border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 text-slate-500">{job.company}</span>
                    <h4 className="text-sm font-bold text-zinc-900 text-slate-900 leading-snug">{job.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSaved(job.id)}
                    className="p-1 text-zinc-400 hover:text-rose-600 hover:text-slate-900 transition"
                    title="Remove from saved"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {job.location}
                  </span>
                  {job.salary_formatted && (
                    <span className="flex items-center gap-1 font-medium text-zinc-800 #c9cbd0]">
                      <DollarSign className="h-3 w-3" />
                      {job.salary_formatted}
                    </span>
                  )}
                </div>

                {/* Status selector */}
                <div className="flex items-center justify-between pt-2 border-t border-black/10 border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-zinc-500 text-slate-500">Status:</label>
                    <select
                      value={job.status}
                      onChange={(e) => onUpdateStatus(job.id, e.target.value as SavedJob['status'])}
                      className="rounded-lg border border-black/15  bg-black/[0.03] bg-slate-100 px-2 py-0.5 text-xs text-zinc-900  focus:outline-none font-medium"
                    >
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="followed_up">Followed Up</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offer">Offer Received 🎉</option>
                      <option value="rejected">Archived</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireAuth()) return;
                        try {
                          localStorage.setItem('career_bot_active_tailor_job', JSON.stringify(job));
                        } catch {}
                        onClose();
                        router.push(`/tailor?id=${encodeURIComponent(job.id)}`);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                      title="Tailor pitch for this role"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Tailor Pitch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireAuth()) return;
                        if (onViewJob) {
                          onViewJob(job);
                        } else {
                          window.open(job.apply_url, '_blank');
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 transition cursor-pointer"
                    >
                      <span>Apply</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {onOpenTracker && (
          <div className="border-t border-black/10 border-slate-200 bg-black/[0.02] bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTracker();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15  bg-zinc-900 .04] px-4 py-2.5 text-xs font-semibold text-white #f7f8f8] transition hover:opacity-90 :bg-white/[0.08]"
            >
              <Briefcase className="h-4 w-4" />
              <span>Open Application Tracker (Kanban & DMs)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
