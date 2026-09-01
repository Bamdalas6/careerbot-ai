'use client';

import React, { useState } from 'react';
import {
  X, Mail, MessageSquare, Clock, Check, User, Link2, Loader2,
  Calendar, Plus, Copy, ExternalLink, PenLine,
} from 'lucide-react';
import { SavedJob, ApplicationEvent } from '@/types/job';

interface ApplicationDetailPanelProps {
  job: SavedJob;
  onClose: () => void;
  onUpdateStatus: (status: SavedJob['status']) => void;
  onUpdateContact: (fields: { contact_name?: string; contact_email?: string; contact_linkedin?: string }) => void;
  onSetFollowUp: (date: string) => void;
  onAddNote: (note: string) => void;
  onGenerateFollowUp: (type: 'email' | 'cold_dm_linkedin' | 'cold_dm_twitter' | 'thank_you' | 'cold_outreach_story') => void;
  generatedContent: { subject?: string; body: string } | null;
  generating: boolean;
}

const STATUS_OPTIONS: { value: SavedJob['status']; label: string; dotColor: string }[] = [
  { value: 'saved', label: 'Saved', dotColor: 'bg-zinc-500' },
  { value: 'applied', label: 'Applied', dotColor: 'bg-blue-500' },
  { value: 'followed_up', label: 'Followed Up', dotColor: 'bg-amber-500' },
  { value: 'interviewing', label: 'Interviewing', dotColor: 'bg-purple-500' },
  { value: 'offer', label: 'Offer', dotColor: 'bg-emerald-500' },
  { value: 'rejected', label: 'Archived', dotColor: 'bg-rose-500' },
  { value: 'accepted', label: 'Accepted ✓', dotColor: 'bg-emerald-600' },
];

const EVENT_LABELS: Record<ApplicationEvent['type'], string> = {
  applied: 'Applied',
  followed_up: 'Followed up',
  interview_scheduled: 'Interview scheduled',
  interview_done: 'Interview completed',
  offer_received: 'Offer received',
  rejected: 'Rejected / Archived',
  accepted: 'Accepted',
  note: 'Note added',
};

function formatTimeAgo(date: string, nowMs: number): string {
  const diff = nowMs - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const ApplicationDetailPanel: React.FC<ApplicationDetailPanelProps> = ({
  job,
  onClose,
  onUpdateStatus,
  onUpdateContact,
  onSetFollowUp,
  onAddNote,
  onGenerateFollowUp,
  generatedContent,
  generating,
}) => {
  const [currentTimestamp] = useState(() => Date.now());
  const [noteText, setNoteText] = useState('');
  const [showContactEdit, setShowContactEdit] = useState(false);
  const [contactName, setContactName] = useState(job.contact_name || '');
  const [contactEmail, setContactEmail] = useState(job.contact_email || '');
  const [contactLinkedin, setContactLinkedin] = useState(job.contact_linkedin || '');
  const [followUpDate, setFollowUpDate] = useState('');
  const [copied, setCopied] = useState(false);

  const timeline = (job.timeline || []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  const handleSaveContact = () => {
    onUpdateContact({
      contact_name: contactName.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_linkedin: contactLinkedin.trim() || undefined,
    });
    setShowContactEdit(false);
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText('');
  };

  const handleSetFollowUp = () => {
    if (!followUpDate) return;
    onSetFollowUp(followUpDate);
    setFollowUpDate('');
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-[#f7f8f8]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-zinc-600 dark:text-[#8a8f98]">{job.company}</p>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#f7f8f8]">{job.title}</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-[#62666d]">{job.location}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 dark:text-[#8a8f98] transition hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-[#f7f8f8]"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {/* Status */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
            Pipeline Stage
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = job.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateStatus(opt.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    isSelected
                      ? 'border border-zinc-900 dark:border-white/30 bg-black/10 dark:bg-white/[0.1] text-zinc-900 dark:text-[#f7f8f8] font-bold shadow-xs'
                      : 'border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-zinc-600 dark:text-[#8a8f98] hover:border-black/20 dark:hover:border-white/[0.14] hover:text-zinc-900 dark:hover:text-[#f7f8f8]'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${opt.dotColor}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2 rounded-2xl border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
              Contact Info
            </span>
            <button
              type="button"
              onClick={() => setShowContactEdit(!showContactEdit)}
              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showContactEdit ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {showContactEdit ? (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Recruiter / Hiring Manager name"
                className="w-full rounded-xl border border-black/15 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-900 dark:text-[#f7f8f8] placeholder:text-zinc-400 dark:placeholder:text-[#62666d] focus:border-zinc-900 dark:focus:border-white/30 focus:outline-none"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-black/15 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-900 dark:text-[#f7f8f8] placeholder:text-zinc-400 dark:placeholder:text-[#62666d] focus:border-zinc-900 dark:focus:border-white/30 focus:outline-none"
              />
              <input
                type="url"
                value={contactLinkedin}
                onChange={(e) => setContactLinkedin(e.target.value)}
                placeholder="LinkedIn profile URL"
                className="w-full rounded-xl border border-black/15 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-900 dark:text-[#f7f8f8] placeholder:text-zinc-400 dark:placeholder:text-[#62666d] focus:border-zinc-900 dark:focus:border-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveContact}
                className="rounded-xl border border-zinc-900 dark:border-white/[0.15] bg-zinc-900 dark:bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold text-white dark:text-[#f7f8f8] transition hover:opacity-90"
              >
                Save Contact
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {job.contact_name ? (
                <p className="flex items-center gap-2 text-xs text-zinc-800 dark:text-[#c9ccd1]">
                  <User className="h-3.5 w-3.5 text-zinc-500 dark:text-[#62666d]" /> {job.contact_name}
                </p>
              ) : null}
              {job.contact_email ? (
                <p className="flex items-center gap-2 text-xs text-zinc-800 dark:text-[#c9ccd1]">
                  <Mail className="h-3.5 w-3.5 text-zinc-500 dark:text-[#62666d]" /> {job.contact_email}
                </p>
              ) : null}
              {job.contact_linkedin ? (
                <a
                  href={job.contact_linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-[#c9ccd1] hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" /> LinkedIn Profile ↗
                </a>
              ) : null}
              {!job.contact_name && !job.contact_email && !job.contact_linkedin && (
                <p className="text-xs text-zinc-500 dark:text-[#62666d]">No contact info added yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Follow-up scheduler */}
        <div className="space-y-2 rounded-2xl border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
            Follow-up Reminder
          </span>
          {job.follow_up_at && (
            <p className="text-xs font-medium text-zinc-800 dark:text-[#c9ccd1]">
              <Clock className="mr-1.5 inline h-3.5 w-3.5 text-zinc-500 dark:text-[#62666d]" />
              Scheduled for: {new Date(job.follow_up_at).toLocaleDateString()}
              {new Date(job.follow_up_at).getTime() < currentTimestamp && (
                <span className="ml-1.5 font-bold text-amber-600 dark:text-amber-400">(overdue)</span>
              )}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 rounded-xl border border-black/15 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-900 dark:text-[#f7f8f8] focus:border-zinc-900 dark:focus:border-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSetFollowUp}
              disabled={!followUpDate}
              className="rounded-xl border border-black/10 dark:border-white/[0.12] bg-zinc-900 dark:bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white dark:text-[#f7f8f8] transition disabled:opacity-40"
            >
              <Calendar className="mr-1 inline h-3.5 w-3.5" />
              Set
            </button>
          </div>
        </div>

        {/* Quick actions — generate content */}
        <div className="space-y-2 rounded-2xl border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
            AI Outreach & Follow-up Drafts
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onGenerateFollowUp('cold_outreach_story')}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-white transition hover:bg-black dark:hover:bg-white/20 disabled:opacity-40"
            >
              <span>📖 Story Cold Outreach</span>
            </button>
            <button
              type="button"
              onClick={() => onGenerateFollowUp('email')}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-[#f7f8f8] transition hover:bg-black/[0.04] dark:hover:bg-white/[0.09] disabled:opacity-40"
            >
              <Mail className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /> Follow-up Email
            </button>
            <button
              type="button"
              onClick={() => onGenerateFollowUp('cold_dm_linkedin')}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-[#f7f8f8] transition hover:bg-black/[0.04] dark:hover:bg-white/[0.09] disabled:opacity-40"
            >
              <MessageSquare className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /> LinkedIn DM
            </button>
            <button
              type="button"
              onClick={() => onGenerateFollowUp('thank_you')}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-[#f7f8f8] transition hover:bg-black/[0.04] dark:hover:bg-white/[0.09] disabled:opacity-40"
            >
              <PenLine className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /> Thank-you Note
            </button>
          </div>
          {generating && (
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[#8a8f98] pt-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating template…
            </div>
          )}
          {generatedContent && !generating && (
            <div className="mt-2 space-y-2 rounded-xl border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3.5">
              {generatedContent.subject && (
                <p className="text-xs text-zinc-600 dark:text-[#8a8f98]">
                  <strong className="text-zinc-900 dark:text-[#c9ccd1]">Subject:</strong> {generatedContent.subject}
                </p>
              )}
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-800 dark:text-[#c9ccd1]">
                {generatedContent.body}
              </p>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    generatedContent.subject
                      ? `Subject: ${generatedContent.subject}\n\n${generatedContent.body}`
                      : generatedContent.body
                  )
                }
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-[#8a8f98] hover:text-black dark:hover:text-[#f7f8f8] transition pt-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Add note */}
        <div className="space-y-2 rounded-2xl border border-black/10 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
            Interview & Application Notes
          </span>
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && noteText.trim()) handleAddNote();
              }}
              placeholder="e.g. Discussed design systems and salary range…"
              className="flex-1 rounded-xl border border-black/15 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-900 dark:text-[#f7f8f8] placeholder:text-zinc-400 dark:placeholder:text-[#62666d] focus:border-zinc-900 dark:focus:border-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              className="rounded-xl border border-zinc-900 dark:border-white/[0.12] bg-zinc-900 dark:bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white dark:text-[#f7f8f8] transition disabled:opacity-40"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
            Activity Timeline
          </span>
          {timeline.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-[#62666d]">No activity yet. Change stage to track progress.</p>
          ) : (
            <div className="space-y-0 pt-1">
              {timeline.map((event, idx) => (
                <div key={event.id || idx} className="flex gap-3 pb-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-2 w-2 rounded-full bg-zinc-700 dark:bg-white/40" />
                    {idx < timeline.length - 1 && <div className="mt-1 flex-1 w-px bg-black/10 dark:bg-white/[0.08]" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-[#c9ccd1]">
                      {EVENT_LABELS[event.type] || event.type}
                    </p>
                    {event.note && (
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-[#8a8f98]">{event.note}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-[#62666d]">
                      {formatTimeAgo(event.date, currentTimestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct apply link */}
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-black/15 dark:border-white/[0.12] bg-black/[0.04] dark:bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8] transition hover:bg-black/[0.08] dark:hover:bg-white/[0.09]"
          >
            <span>Open Application Page on {job.company}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
