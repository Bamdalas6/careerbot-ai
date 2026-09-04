'use client';

import React from 'react';
import { X, Bookmark, ExternalLink, Trash2, MapPin, DollarSign, ArrowRight, Briefcase, Sparkles } from 'lucide-react';
import { SavedJob, JobListing } from '@/types/job';

interface SavedJobsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: SavedJob[];
  onRemoveSaved: (id: string) => void;
  onUpdateStatus: (id: string, status: SavedJob['status']) => void;
  onOpenTracker?: () => void;
  onOpenTailor?: (job: JobListing) => void;
}

export const SavedJobsDrawer: React.FC<SavedJobsDrawerProps> = ({
  isOpen,
  onClose,
  savedJobs,
  onRemoveSaved,
  onUpdateStatus,
  onOpenTracker,
  onOpenTailor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-black/10 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-zinc-800 px-5 sm:px-6 py-4 bg-black/[0.02] dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-zinc-900 dark:text-[#f7f8f8] border border-black/10 dark:border-white/10">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Saved Opportunities</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {savedJobs.length} {savedJobs.length === 1 ? 'role' : 'roles'} in your pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition"
            aria-label="Close saved drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {savedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-400 dark:text-zinc-500">
              <Bookmark className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">No saved jobs yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Click the bookmark icon on any job card to save it to your pipeline.
              </p>
            </div>
          ) : (
            savedJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col rounded-2xl border border-black/10 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-4 space-y-3 shadow-xs hover:border-black/20 dark:hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{job.company}</span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">{job.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSaved(job.id)}
                    className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-white transition"
                    title="Remove from saved"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {job.location}
                  </span>
                  {job.salary_formatted && (
                    <span className="flex items-center gap-1 font-medium text-zinc-800 dark:text-[#c9cbd0]">
                      <DollarSign className="h-3 w-3" />
                      {job.salary_formatted}
                    </span>
                  )}
                </div>

                {/* Status selector */}
                <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Status:</label>
                    <select
                      value={job.status}
                      onChange={(e) => onUpdateStatus(job.id, e.target.value as SavedJob['status'])}
                      className="rounded-lg border border-black/15 dark:border-zinc-700 bg-black/[0.03] dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none font-medium"
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
                    {onOpenTailor && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenTailor(job);
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition cursor-pointer"
                        title="Tailor pitch for this role"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Tailor Pitch</span>
                      </button>
                    )}
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-[#8a8f98] hover:text-zinc-900 dark:hover:text-[#f7f8f8] transition"
                    >
                      <span>Apply</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {onOpenTracker && (
          <div className="border-t border-black/10 dark:border-zinc-800 bg-black/[0.02] dark:bg-zinc-900/60 p-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTracker();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 dark:border-white/10 bg-zinc-900 dark:bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white dark:text-[#f7f8f8] transition hover:opacity-90 dark:hover:bg-white/[0.08]"
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
