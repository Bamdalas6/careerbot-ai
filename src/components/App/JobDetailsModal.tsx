'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  ExternalLink,
  Mail,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { JobListing } from '@/types/job';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';

interface JobDetailsModalProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: (job: JobListing) => void;
  onOpenTailor?: (job: JobListing) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  isOpen,
  onClose,
  isSaved = false,
  onToggleSave,
  onOpenTailor,
}) => {
  const { user, credits, requireAuth, openCreditModal } = useAuth();
  const [copied, setCopied] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const isEmailApply = job.apply_url.startsWith('mailto:');
  
  // Extract target email if mailto link
  let recipientEmail = '';
  if (isEmailApply) {
    try {
      recipientEmail = job.apply_url.replace(/^mailto:/i, '').split('?')[0];
    } catch {
      recipientEmail = '';
    }
  }

  const handleCopyLink = async () => {
    if (!requireAuth()) return;
    try {
      await navigator.clipboard.writeText(job.apply_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (!requireAuth()) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} at ${job.company}`,
          text: `Check out this ${job.title} role at ${job.company}:`,
          url: job.apply_url,
        });
        return;
      } catch {
        // Fall back to copy
      }
    }
    handleCopyLink();
  };

  const handleSaveClick = () => {
    if (!requireAuth()) return;
    if (!isSaved) {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0080ff', '#10b981', '#6366f1', '#f59e0b'],
      });
    }
    onToggleSave?.(job);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!requireAuth()) {
      return;
    }
    if (credits <= 0) {
      openCreditModal();
      return;
    }
    if (isEmailApply) {
      window.location.href = job.apply_url;
    } else {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatSalary = (j: JobListing) => {
    if (j.salary_formatted) {
      return j.salary_formatted.replace(/\/month\s*\/hour/gi, '/month');
    }
    if (j.salary_min) {
      if (j.salary_max && j.salary_max > j.salary_min) {
        return `₦${(j.salary_min / 1000).toFixed(0)}k - ₦${(j.salary_max / 1000).toFixed(0)}k`;
      }
      return `₦${(j.salary_min / 1000).toFixed(0)}k / month`;
    }
    return 'Competitive Compensation';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-details-title"
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
              {(job.company || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {job.company}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  <span>{job.source || 'Verified Partner'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {job.location} • {job.posted_at || 'Recently posted'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Share / Copy Link Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="Share job link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Bookmark / Save Button */}
            {onToggleSave && (
              <button
                type="button"
                onClick={handleSaveClick}
                className={`p-2 rounded-xl active:scale-95 transition-all ${
                  isSaved
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={isSaved ? 'Saved to bookmarks' : 'Save job'}
              >
                {isSaved ? <BookmarkCheck className="w-4 h-4 text-blue-600" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6 text-slate-800">
          {/* Job Title & Main Highlights */}
          <div>
            <h1
              id="job-details-title"
              className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight"
            >
              {job.title}
            </h1>

            {/* Key Metadata Badges Grid */}
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{job.location}</span>
              </span>

              {job.is_remote && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-[#0080ff] border border-blue-200/70">
                  <span>Remote</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                <span>{job.job_type || 'Full-time'}</span>
              </span>

              {job.experience_level && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                  <span>{job.experience_level}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>{formatSalary(job)}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{job.posted_at || 'Just now'}</span>
              </span>
            </div>
          </div>

          {/* AI Match Fit (if available) */}
          {job.match_score && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">AI Role Match</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white">
                  {job.match_score}% Fit
                </span>
              </div>
              {job.match_reason && (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {job.match_reason}
                </p>
              )}
            </div>
          )}

          {/* About The Job / Overview Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>About The Job</span>
            </h2>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
              <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 whitespace-pre-line font-normal">
                {job.description || job.snippet || 'No comprehensive description provided for this opening.'}
              </p>

              {job.snippet && job.description && job.snippet !== job.description && (
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">
                    Role Summary
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                    &ldquo;{job.snippet}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Key Skills & Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Required Skills & Keywords
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900 text-white tracking-wide shadow-2xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Direct Application Transparency Callout */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              {isEmailApply ? <Mail className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            </div>
            <div className="text-xs text-slate-700 leading-relaxed min-w-0 flex-1">
              <p className="font-bold text-slate-900">
                {isEmailApply ? 'Direct Application via Email' : 'Direct Application on Official Portal'}
              </p>
              <p className="mt-0.5 text-slate-600">
                {isEmailApply ? (
                  <>
                    Clicking <strong className="text-slate-900">Apply Now</strong> will open an email draft addressed directly to{' '}
                    <strong className="text-blue-700 font-mono">{recipientEmail || job.company}</strong> with the job subject pre-filled.
                  </>
                ) : (
                  <>
                    Clicking <strong className="text-slate-900">Apply Now</strong> will securely route you directly to the verified job listing on the company&apos;s application portal.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 0 Tokens Warning Banner */}
        {credits <= 0 && (
          <div className="mx-4 sm:mx-6 mb-2 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Recharge tokens to apply for this role.</span>
            </div>
            <button
              type="button"
              onClick={openCreditModal}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shrink-0 shadow-xs transition cursor-pointer"
            >
              Recharge
            </button>
          </div>
        )}

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center gap-3">
          {/* Tailor Pitch Button */}
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
              className="px-4 sm:px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer"
              title="Generate tailored cover letter and pitch"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Tailor Pitch</span>
            </button>
          )}

          {/* Primary Apply Now Button - Enforces Authentication & Credits */}
          <button
            type="button"
            onClick={handleApplyClick}
            className="flex-1 py-3 px-6 rounded-2xl bg-[#0080ff] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {credits <= 0 ? (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Apply (Recharge Tokens)</span>
              </>
            ) : (
              <>
                <span>{isEmailApply ? 'Apply Now (via Email)' : 'Apply Now'}</span>
                {isEmailApply ? <Mail className="w-4 h-4" /> : <ExternalLink className="w-4 h-4 stroke-[2.5]" />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
