'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  X, Briefcase, Loader2, Trash2, ExternalLink, Plus,
  BarChart3, Clock, CheckCircle2, XCircle, ArrowRight,
  ChevronLeft, LayoutGrid, List,
} from 'lucide-react';
import { SavedJob, ApplicationEvent } from '@/types/job';
import { ApplicationDetailPanel } from './ApplicationDetailPanel';
import { useAuth } from '@/context/AuthContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApplicationRecord {
  id: string;
  user_id: string;
  job: SavedJob;
  status: SavedJob['status'];
  applied_at?: string;
  follow_up_at?: string;
  follow_up_count: number;
  contact_name?: string;
  contact_email?: string;
  contact_linkedin?: string;
  timeline: ApplicationEvent[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ApplicationTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Saved jobs from localStorage — imported as initial applications */
  localSavedJobs?: SavedJob[];
  onClearLocalSaved?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Column config                                                      */
/* ------------------------------------------------------------------ */

const COLUMNS: { status: SavedJob['status']; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'saved', label: 'Saved', icon: <Briefcase className="h-3.5 w-3.5 text-zinc-400" />, color: 'border-zinc-500/30' },
  { status: 'applied', label: 'Applied', icon: <ArrowRight className="h-3.5 w-3.5 text-blue-400" />, color: 'border-blue-500/30' },
  { status: 'followed_up', label: 'Followed Up', icon: <Clock className="h-3.5 w-3.5 text-amber-400" />, color: 'border-amber-500/30' },
  { status: 'interviewing', label: 'Interviewing', icon: <BarChart3 className="h-3.5 w-3.5 text-purple-400" />, color: 'border-purple-500/30' },
  { status: 'offer', label: 'Offer', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />, color: 'border-emerald-500/30' },
  { status: 'rejected', label: 'Archived', icon: <XCircle className="h-3.5 w-3.5 text-rose-400" />, color: 'border-rose-500/30' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  isOpen,
  onClose,
  localSavedJobs,
  onClearLocalSaved,
}) => {
  const { user, requireAuth } = useAuth();
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [generatedContent, setGeneratedContent] = useState<{ subject?: string; body: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [activeMobileColumn, setActiveMobileColumn] = useState<SavedJob['status'] | 'all'>('all');
  const [currentTimestamp] = useState(() => Date.now());

  /* ---- Fetch applications ---- */
  const fetchApps = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) setApps(data.applications || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!isOpen || !user) return;

    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setApps(data.applications || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, user]);

  /* ---- Import local saved jobs ---- */
  const handleImportLocal = useCallback(async () => {
    if (!localSavedJobs?.length || !requireAuth()) return;
    for (const job of localSavedJobs) {
      try {
        await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job, status: job.status || 'saved', notes: job.notes }),
        });
      } catch { /* continue */ }
    }
    onClearLocalSaved?.();
    fetchApps();
  }, [localSavedJobs, requireAuth, onClearLocalSaved, fetchApps]);

  /* ---- CRUD helpers ---- */
  const patchApp = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success && data.application) {
        setApps((prev) => prev.map((a) => (a.id === id ? data.application : a)));
        if (selectedApp?.id === id) setSelectedApp(data.application);
      }
    } catch { /* silent */ }
  }, [selectedApp]);

  const deleteApp = useCallback(async (id: string) => {
    try {
      await fetch('/api/applications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setApps((prev) => prev.filter((a) => a.id !== id));
      if (selectedApp?.id === id) setSelectedApp(null);
    } catch { /* silent */ }
  }, [selectedApp]);

  const generateFollowUp = useCallback(async (type: 'email' | 'cold_dm_linkedin' | 'cold_dm_twitter' | 'thank_you' | 'cold_outreach_story') => {
    if (!selectedApp) return;
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const res = await fetch('/api/applications/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: selectedApp.id, type, userName: user?.name }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setGeneratedContent(data.content);
      }
    } catch { /* silent */ }
    finally { setGenerating(false); }
  }, [selectedApp, user]);

  if (!isOpen) return null;

  const grouped = COLUMNS.map((col) => ({
    ...col,
    apps: apps.filter((a) => a.status === col.status),
  }));

  const totalApps = apps.length;
  const appliedCount = apps.filter((a) => ['applied', 'followed_up', 'interviewing', 'offer', 'accepted'].includes(a.status)).length;
  const interviewCount = apps.filter((a) => a.status === 'interviewing').length;
  const offerCount = apps.filter((a) => ['offer', 'accepted'].includes(a.status)).length;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-[#f7f8f8]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06]">
              <Briefcase className="h-5 w-5 text-zinc-900 dark:text-[#f7f8f8]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-[#f7f8f8]">Application Tracker</h3>
              <p className="text-xs text-zinc-600 dark:text-[#8a8f98]">
                Track, follow up, and manage your job applications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Stats */}
            <div className="mr-4 hidden items-center gap-4 sm:flex">
              <span className="text-[11px] text-zinc-600 dark:text-[#8a8f98]">
                <strong className="text-zinc-900 dark:text-[#f7f8f8]">{totalApps}</strong> total
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-[#8a8f98]">
                <strong className="text-zinc-900 dark:text-[#f7f8f8]">{appliedCount}</strong> applied
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-[#8a8f98]">
                <strong className="text-zinc-900 dark:text-[#f7f8f8]">{interviewCount}</strong> interviews
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-[#8a8f98]">
                <strong className="text-zinc-900 dark:text-[#f7f8f8]">{offerCount}</strong> offers
              </span>
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition rounded-l-lg ${
                  viewMode === 'board'
                    ? 'bg-black/10 dark:bg-white/[0.08] text-zinc-900 dark:text-[#f7f8f8] font-bold'
                    : 'text-zinc-500 dark:text-[#8a8f98] hover:text-zinc-900 dark:hover:text-[#f7f8f8]'
                }`}
                title="Board View"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition rounded-r-lg ${
                  viewMode === 'list'
                    ? 'bg-black/10 dark:bg-white/[0.08] text-zinc-900 dark:text-[#f7f8f8] font-bold'
                    : 'text-zinc-500 dark:text-[#8a8f98] hover:text-zinc-900 dark:hover:text-[#f7f8f8]'
                }`}
                title="List View"
              >
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 dark:text-[#8a8f98] transition hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-[#f7f8f8]"
              aria-label="Close tracker"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Stats & Stage Filter Pill Bar */}
        <div className="sm:hidden border-b border-black/10 dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01] px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveMobileColumn('all')}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              activeMobileColumn === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold'
                : 'bg-black/[0.04] dark:bg-white/[0.04] text-zinc-600 dark:text-[#8a8f98]'
            }`}
          >
            All Stages ({totalApps})
          </button>
          {COLUMNS.map((col) => {
            const count = apps.filter((a) => a.status === col.status).length;
            const isSelected = activeMobileColumn === col.status;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => setActiveMobileColumn(col.status)}
                className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold'
                    : 'bg-black/[0.04] dark:bg-white/[0.04] text-zinc-600 dark:text-[#8a8f98]'
                }`}
              >
                <span>{col.label}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Import banner */}
        {localSavedJobs && localSavedJobs.length > 0 && (
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.06] bg-amber-500/10 dark:bg-amber-500/5 px-4 sm:px-6 py-2.5">
            <p className="text-[11px] text-zinc-700 dark:text-[#8a8f98]">
              You have <strong className="text-zinc-900 dark:text-[#f7f8f8]">{localSavedJobs.length}</strong> saved job{localSavedJobs.length !== 1 ? 's' : ''} in browser memory.
            </p>
            <button
              type="button"
              onClick={handleImportLocal}
              className="flex items-center gap-1 rounded-lg border border-amber-600/30 dark:border-white/[0.12] bg-amber-500/20 dark:bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-900 dark:text-[#f7f8f8] transition hover:bg-amber-500/30"
            >
              <Plus className="h-3 w-3" /> Import all to Tracker
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className={`flex-1 overflow-auto ${selectedApp ? 'hidden md:block' : ''}`}>
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-[#8a8f98]" />
              </div>
            ) : apps.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-zinc-400 dark:text-[#62666d] opacity-40" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-[#8a8f98]">No applications tracked yet</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#62666d] max-w-sm">
                  Save jobs from search results, or import your saved jobs above to start tracking.
                </p>
              </div>
            ) : viewMode === 'board' ? (
              /* Kanban board */
              <div className="flex h-full gap-3 overflow-x-auto p-3 sm:p-4 snap-x">
                {grouped
                  .filter((col) => activeMobileColumn === 'all' || col.status === activeMobileColumn)
                  .map((col) => (
                    <div
                      key={col.status}
                      className="flex w-72 sm:w-64 shrink-0 snap-center flex-col rounded-2xl border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/[0.06] px-3.5 py-3 bg-black/[0.01] dark:bg-white/[0.01]">
                        {col.icon}
                        <span className="text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">{col.label}</span>
                        <span className="ml-auto rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-[#c9ccd1]">
                          {col.apps.length}
                        </span>
                      </div>

                      <div className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto p-2.5">
                        {col.apps.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-zinc-400 dark:text-[#62666d]">
                            No jobs in {col.label.toLowerCase()}
                          </div>
                        ) : (
                          col.apps.map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => {
                                setSelectedApp(app);
                                setGeneratedContent(null);
                              }}
                              className={`w-full rounded-xl border p-3 text-left transition shadow-xs ${
                                selectedApp?.id === app.id
                                  ? 'border-zinc-900 bg-zinc-900/5 dark:border-white/30 dark:bg-white/[0.08]'
                                  : 'border-black/10 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:border-black/20 dark:hover:border-white/[0.14]'
                              }`}
                            >
                              <p className="text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8] leading-snug line-clamp-2">
                                {app.job.title}
                              </p>
                              <p className="mt-1 text-[11px] font-medium text-zinc-600 dark:text-[#8a8f98]">
                                {app.job.company}
                              </p>
                              {app.job.location && (
                                <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-[#62666d]">
                                  {app.job.location}
                                </p>
                              )}
                              {app.follow_up_at && new Date(app.follow_up_at).getTime() < currentTimestamp && (
                                <div className="mt-2 flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Clock className="h-2.5 w-2.5" /> Follow-up due
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              /* List view */
              <div className="p-3 sm:p-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/[0.06] text-[10px] uppercase tracking-wider text-zinc-500 dark:text-[#62666d]">
                      <th className="pb-2.5 pr-3 font-semibold">Company</th>
                      <th className="pb-2.5 pr-3 font-semibold">Role</th>
                      <th className="pb-2.5 pr-3 font-semibold">Status</th>
                      <th className="pb-2.5 pr-3 font-semibold">Applied Date</th>
                      <th className="pb-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-black/5 dark:border-white/[0.04] transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-3 pr-3 text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">
                          {app.job.company}
                        </td>
                        <td className="py-3 pr-3 text-xs text-zinc-700 dark:text-[#c9ccd1]">{app.job.title}</td>
                        <td className="py-3 pr-3">
                          <span className="rounded-full border border-black/10 dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-zinc-800 dark:text-[#8a8f98]">
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-[11px] text-zinc-500 dark:text-[#62666d]">
                          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedApp(app);
                                setGeneratedContent(null);
                              }}
                              className="rounded-lg p-1.5 text-zinc-600 dark:text-[#8a8f98] transition hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-[#f7f8f8]"
                              title="View details"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteApp(app.id)}
                              className="rounded-lg p-1.5 text-zinc-400 dark:text-[#62666d] transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedApp && (
            <div className="w-full md:w-96 shrink-0 border-l border-black/10 dark:border-white/[0.08]">
              {/* Mobile Back Button */}
              <div className="md:hidden border-b border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5 flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Applications</span>
                </button>
              </div>

              <ApplicationDetailPanel
                job={{
                  ...selectedApp.job,
                  status: selectedApp.status,
                  contact_name: selectedApp.contact_name,
                  contact_email: selectedApp.contact_email,
                  contact_linkedin: selectedApp.contact_linkedin,
                  follow_up_at: selectedApp.follow_up_at,
                  follow_up_count: selectedApp.follow_up_count,
                  timeline: selectedApp.timeline,
                  notes: selectedApp.notes,
                }}
                onClose={() => setSelectedApp(null)}
                onUpdateStatus={(status) => {
                  const eventType = status === 'applied' ? 'applied'
                    : status === 'interviewing' ? 'interview_scheduled'
                    : status === 'offer' ? 'offer_received'
                    : status === 'rejected' ? 'rejected'
                    : status === 'accepted' ? 'accepted'
                    : null;
                  const updates: Record<string, unknown> = { status };
                  if (status === 'applied' && !selectedApp.applied_at) {
                    updates.applied_at = new Date().toISOString();
                  }
                  if (eventType) {
                    updates.event = { type: eventType, date: new Date().toISOString() };
                  }
                  patchApp(selectedApp.id, updates);
                }}
                onUpdateContact={(fields) => patchApp(selectedApp.id, fields)}
                onSetFollowUp={(date) => patchApp(selectedApp.id, { follow_up_at: new Date(date).toISOString() })}
                onAddNote={(note) => {
                  patchApp(selectedApp.id, {
                    notes: note,
                    event: { type: 'note' as const, date: new Date().toISOString(), note },
                  });
                }}
                onGenerateFollowUp={generateFollowUp}
                generatedContent={generatedContent}
                generating={generating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
