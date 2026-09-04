'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Loader2,
  Zap,
  AlertCircle,
  FileText,
  Send,
  Sliders,
  Download,
  RotateCcw,
  Dices,
  Share2,
} from 'lucide-react';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { CoverLetterTone, generateCoverLetter } from '@/lib/cover-letter-generator';
import { generateColdDM, STORY_VIBES, StoryVibeId, generateTailoredPitch } from '@/lib/follow-up-generator';

/**
 * Cross-environment clipboard copy helper with legacy execCommand fallback
 * for restricted mobile webviews and older iOS Safari / Android browsers.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document.execCommand below
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

interface TailorPitchModalProps {
  job: JobListing | null;
  onClose: () => void;
}

const TONES: { id: CoverLetterTone; label: string; icon: string; desc: string }[] = [
  {
    id: 'story',
    label: 'Story-Driven & Mission Hook',
    icon: '📖',
    desc: 'Authentic origin spark, human journey & deep mission alignment',
  },
  {
    id: 'confident',
    label: 'Confident & Direct',
    icon: '⚡',
    desc: 'Craft execution, velocity & concrete problem-solving',
  },
  {
    id: 'executive',
    label: 'Executive & Strategic',
    icon: '💼',
    desc: 'Leadership, strategic alignment & enterprise impact',
  },
  {
    id: 'enthusiastic',
    label: 'Enthusiastic & Warm',
    icon: '✨',
    desc: 'High energy, culture fit & passion for company mission',
  },
  {
    id: 'technical',
    label: 'Technical & Rigorous',
    icon: '🛠️',
    desc: 'Deep architecture, metrics, system standards & tooling',
  },
];

export const TailorPitchModal: React.FC<TailorPitchModalProps> = ({ job, onClose }) => {
  const { user, requireAuth, updateCredits, openCreditModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'pitch' | 'cover_letter' | 'outreach'>('pitch');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  // Pitch Data - immediately initialized with instant client-side generation
  const [pitchData, setPitchData] = useState<{
    pitch_bullets: string[];
    cover_note: string;
    interview_tips: string[];
  } | null>(() => {
    if (job) {
      try {
        return generateTailoredPitch(job);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Cover Letter Data & State
  const [selectedTone, setSelectedTone] = useState<CoverLetterTone>('story');
  const [selectedVibe, setSelectedVibe] = useState<StoryVibeId>('origin_spark');
  const [candidateName, setCandidateName] = useState(user?.name || '');
  const [hiringManager, setHiringManager] = useState('');
  const [customStory, setCustomStory] = useState('');
  const [coverSubject, setCoverSubject] = useState('');
  const [coverBody, setCoverBody] = useState('');

  // Sync candidate name when user profile loads
  useEffect(() => {
    if (user?.name && !candidateName) {
      setCandidateName(user.name);
    }
  }, [user?.name, candidateName]);

  // Outreach Platform State
  const [outreachPlatform, setOutreachPlatform] = useState<'email' | 'linkedin' | 'twitter'>('email');

  // Copy Feedback States
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedOutreach, setCopiedOutreach] = useState(false);

  // Re-generate cover letter when tone, name, hiring manager, vibe, or custom story changes
  const updateCoverLetter = useCallback(
    (tone: CoverLetterTone, name: string, manager: string, story?: string, vibe?: StoryVibeId) => {
      if (!job) return;
      const res = generateCoverLetter({
        candidateName: name || user?.name || 'Candidate Name',
        candidateEmail: user?.email,
        jobTitle: job.title || 'Role',
        company: job.company || 'Company',
        hiringManager: manager,
        tone,
        keySkills: Array.isArray(job.tags) ? job.tags : [],
        experienceYears: 5,
        location: job.location,
        vibeId: vibe || selectedVibe,
        customStory: story || undefined,
      });
      setCoverSubject(res.subject);
      setCoverBody(res.body);
    },
    [job, user, selectedVibe]
  );

  // Synchronize pitch data and cover letter immediately when job changes
  useEffect(() => {
    if (!job) {
      setPitchData(null);
      return;
    }

    // Instantly generate pitch data so user NEVER sees a blank screen or spinner
    try {
      const immediatePitch = generateTailoredPitch(job);
      setPitchData(immediatePitch);
    } catch (e) {
      console.error('Failed to generate instant pitch:', e);
    }

    // Initialize Cover Letter immediately
    updateCoverLetter('story', candidateName || user?.name || '', hiringManager);

    // Optional background sync with server for authenticated credit tracking
    let isMounted = true;
    async function syncServerPitch() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
        if (!token) return;
        const res = await fetch('/api/tailor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ job }),
        });

        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setPitchData(data.data);
            if (data.remainingCredits != null) {
              updateCredits(data.remainingCredits);
            }
          }
        }
      } catch {
        // Immediate local pitch works seamlessly
      }
    }

    syncServerPitch();

    return () => {
      isMounted = false;
    };
  }, [job?.id, job?.title, job?.company]);

  // Escape key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock background body scroll ONLY while modal is actually open (job is non-null)
  useEffect(() => {
    if (!job) {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      return;
    }
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [job]);

  if (!job) return null;

  const handleToneSelect = (tone: CoverLetterTone) => {
    setSelectedTone(tone);
    updateCoverLetter(tone, candidateName, hiringManager, customStory, selectedVibe);
  };

  const handleVibeSelect = (vibe: StoryVibeId) => {
    setSelectedVibe(vibe);
    setCustomStory('');
    updateCoverLetter(selectedTone, candidateName, hiringManager, undefined, vibe);
  };

  const handleShuffleVibe = () => {
    setIsShuffling(true);
    setTimeout(() => setIsShuffling(false), 500);
    const currentIndex = STORY_VIBES.findIndex((v) => v.id === selectedVibe);
    const nextIndex = (currentIndex + 1) % STORY_VIBES.length;
    const nextVibe = STORY_VIBES[nextIndex].id;
    setSelectedVibe(nextVibe);
    setCustomStory('');
    updateCoverLetter(selectedTone, candidateName, hiringManager, undefined, nextVibe);
  };

  // Tactile touch drag-to-dismiss for mobile bottom sheet
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY;
    setDragOffsetY(Math.max(0, delta));
  };

  const handleTouchEnd = () => {
    if (dragOffsetY > 85) {
      onClose();
    }
    setDragOffsetY(0);
    setTouchStartY(null);
  };

  const handleCopyBullets = async () => {
    if (!pitchData) return;
    const ok = await copyToClipboard(pitchData.pitch_bullets.map((b) => `• ${b}`).join('\n'));
    if (ok) {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    }
  };

  const handleCopyCoverNote = async () => {
    if (!pitchData) return;
    const ok = await copyToClipboard(pitchData.cover_note);
    if (ok) {
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    }
  };

  const handleCopyCoverLetter = async () => {
    const fullText = `Subject: ${coverSubject}\n\n${coverBody}`;
    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopiedCover(true);
      setTimeout(() => setCopiedCover(false), 2000);
    }
  };

  const handleCopySubject = async () => {
    const ok = await copyToClipboard(coverSubject);
    if (ok) {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    }
  };

  const handleDownloadCoverLetter = () => {
    const fullText = `Subject: ${coverSubject}\n\n${coverBody}`;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeCompany = (job.company || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
    const safeTitle = (job.title || 'Role').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Cover_Letter_${safeCompany}_${safeTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const safeTags = Array.isArray(job.tags) ? job.tags : [];
  const outreachText = generateColdDM({
    userName: candidateName || user?.name || 'Candidate Name',
    jobTitle: job.title || 'Role',
    company: job.company || 'Company',
    contactName: hiringManager,
    platform: outreachPlatform,
    keySkills: safeTags,
    experienceYears: 5,
    vibeId: selectedVibe,
    customStory: customStory || undefined,
  });

  const handleCopyOutreach = async () => {
    const ok = await copyToClipboard(outreachText);
    if (ok) {
      setCopiedOutreach(true);
      setTimeout(() => setCopiedOutreach(false), 2000);
    }
  };

  const handleDownloadOutreach = () => {
    const blob = new Blob([outreachText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeCompany = (job.company || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Cold_Outreach_${safeCompany}_${outreachPlatform}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareCoverLetter = async () => {
    const fullText = `Subject: ${coverSubject}\n\n${coverBody}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Cover Letter: ${job.title || 'Role'} at ${job.company || 'Company'}`,
          text: fullText,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopyCoverLetter();
  };

  const handleShareOutreach = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Outreach: ${job.title || 'Role'} at ${job.company || 'Company'}`,
          text: outreachText,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopyOutreach();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tailor-modal-title"
        style={{
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          transition: dragOffsetY === 0 ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        }}
        className="relative flex flex-col w-full max-w-3xl rounded-t-[28px] sm:rounded-3xl border-t sm:border border-black/10 dark:border-white/[0.1] bg-white dark:bg-[#0c0c0d] text-zinc-900 dark:text-[#f7f8f8] shadow-2xl overflow-hidden max-h-[92vh] max-h-[92dvh] sm:max-h-[88vh] h-[92vh] h-[92dvh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Mobile Tactile Drag Indicator / Grab Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-hidden="true"
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.08] px-4 sm:px-6 py-3.5 bg-zinc-50/90 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 id="tailor-modal-title" className="font-bold text-zinc-900 text-sm sm:text-base truncate dark:text-[#f7f8f8]">
                  Tailor My Application
                </h3>
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <Zap className="h-3 w-3" />
                  2 credits
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-[#8a8f98] truncate mt-0.5" title={`${job.title} · ${job.company} (${job.location})`}>
                {job.title} · <span className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">{job.company}</span> ({job.location})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tailor modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 active:scale-95 transition dark:text-[#8a8f98] dark:hover:bg-white/[0.08] dark:hover:text-[#f7f8f8] shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Snappy Segmented Pill Navigation Bar */}
        <div className="px-2.5 sm:px-6 py-2.5 border-b border-black/5 dark:border-white/[0.06] bg-zinc-50/60 dark:bg-white/[0.01] shrink-0">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-zinc-200/75 dark:bg-white/[0.06] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('pitch')}
              className={`min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] ${
                activeTab === 'pitch'
                  ? 'bg-white dark:bg-[#1a1c21] text-zinc-900 dark:text-white shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-zinc-600 dark:text-[#8a8f98] hover:text-zinc-900 dark:hover:text-[#f7f8f8]'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden sm:inline font-bold">Pitch & Points</span>
              <span className="sm:hidden font-bold text-[11px] truncate">Pitch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cover_letter')}
              className={`min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] ${
                activeTab === 'cover_letter'
                  ? 'bg-white dark:bg-[#1a1c21] text-zinc-900 dark:text-white shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-zinc-600 dark:text-[#8a8f98] hover:text-zinc-900 dark:hover:text-[#f7f8f8]'
              }`}
            >
              <FileText className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span className="hidden sm:inline font-bold">Role Cover Letter</span>
              <span className="sm:hidden font-bold text-[11px] truncate">Cover Letter</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('outreach')}
              className={`min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] ${
                activeTab === 'outreach'
                  ? 'bg-white dark:bg-[#1a1c21] text-zinc-900 dark:text-white shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-zinc-600 dark:text-[#8a8f98] hover:text-zinc-900 dark:hover:text-[#f7f8f8]'
              }`}
            >
              <Send className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span className="hidden sm:inline font-bold">Recruiter Outreach</span>
              <span className="sm:hidden font-bold text-[11px] truncate">Outreach</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 custom-scrollbar overscroll-contain">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                <button
                  type="button"
                  onClick={openCreditModal}
                  className="mt-2 text-xs font-semibold text-rose-900 underline hover:no-underline dark:text-white"
                >
                  Top Up Credits Now →
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-[#f7f8f8]" />
              <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">
                Crafting targeted pitch points for {job.company}...
              </p>
              <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                Analyzing role requirements and generating interview readiness talking points.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: PITCH & PREP */}
              {activeTab === 'pitch' && (
                pitchData ? (
                  <div className="space-y-5">
                    {/* High-Impact Pitch Bullets */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-indigo-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                            High-Impact Pitch Bullets
                          </h4>
                        </div>
                        <button
                          onClick={handleCopyBullets}
                          className={`min-h-[36px] flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                            copiedPitch
                              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                          }`}
                        >
                          {copiedPitch ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedPitch ? 'Copied to clipboard! ✨' : 'Copy Bullets'}</span>
                        </button>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                        {pitchData.pitch_bullets.map((bullet, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-800 leading-relaxed dark:text-[#c9ccd1]">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300 text-[11px] font-bold mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="flex-1">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Short Outreach Note */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                            Short Application Note
                          </h4>
                        </div>
                        <button
                          onClick={handleCopyCoverNote}
                          className={`min-h-[36px] flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                            copiedNote
                              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                          }`}
                        >
                          {copiedNote ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedNote ? 'Copied to clipboard! ✨' : 'Copy Note'}</span>
                        </button>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs sm:text-sm text-zinc-800 whitespace-pre-line leading-relaxed dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#c9ccd1]">
                        {pitchData.cover_note}
                      </div>
                    </div>

                    {/* Interview Tips */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                          Interview Readiness Tips
                        </h4>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                        {pitchData.interview_tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed dark:text-[#8a8f98]">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                            <p>{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-[#f7f8f8]" />
                    <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">
                      Crafting tailored application pitch...
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                      Analyzing role requirements and generating interview readiness talking points.
                    </p>
                  </div>
                )
              )}

              {/* TAB 2: ROLE-SPECIFIC COVER LETTER */}
              {activeTab === 'cover_letter' && (
                <div className="space-y-5">
                  {/* Tone Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1] flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                        Select Cover Letter Tone:
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TONES.map((t) => {
                        const isSelected = selectedTone === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleToneSelect(t.id)}
                            className={`min-h-[56px] flex flex-col items-start p-3 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
                              isSelected
                                ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-900 dark:border-white/40 dark:bg-white/[0.12] dark:text-[#f7f8f8]'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:border-white/20 dark:hover:text-[#c9ccd1]'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs w-full">
                              <span className="text-base">{t.icon}</span>
                              <span>{t.label}</span>
                              {isSelected && (
                                <span className="ml-auto text-[10px] bg-white/20 dark:bg-white/20 rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                                  <Check className="h-2.5 w-2.5" /> Active
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 text-[11px] leading-tight ${isSelected ? 'text-zinc-200 dark:text-zinc-300' : 'text-zinc-500 dark:text-[#8a8f98]'}`}>
                              {t.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Story Vibe Selector Bar (when Story-Driven tone is active) */}
                  {selectedTone === 'story' && (
                    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Story Angle & Vibe:</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleShuffleVibe}
                          className="min-h-[38px] sm:min-h-[34px] flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-zinc-800 dark:text-[#f7f8f8] shadow-xs active:scale-95 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                        >
                          <Dices className={`h-3.5 w-3.5 text-indigo-500 ${isShuffling ? 'animate-spin' : ''}`} />
                          <span>Shuffle Vibe</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                        {STORY_VIBES.map((v) => {
                          const isVibeSelected = selectedVibe === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleVibeSelect(v.id)}
                              className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 active:scale-[0.95] min-h-[64px] ${
                                isVibeSelected
                                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs ring-2 ring-zinc-900 dark:border-white dark:bg-white/[0.16] dark:text-[#f7f8f8]'
                                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
                              }`}
                            >
                              <span className="text-lg">{v.icon}</span>
                              <span className="font-bold text-[10px] sm:text-[11px] mt-1 leading-tight line-clamp-1">{v.label}</span>
                              {isVibeSelected && (
                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold shadow-xs">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-white/[0.04] text-xs text-zinc-600 dark:text-[#a0a5ad] border border-black/5 dark:border-white/5">
                        <span className="font-bold text-zinc-900 dark:text-white shrink-0">
                          {STORY_VIBES.find((v) => v.id === selectedVibe)?.icon} {STORY_VIBES.find((v) => v.id === selectedVibe)?.label}:
                        </span>
                        <span className="truncate">{STORY_VIBES.find((v) => v.id === selectedVibe)?.desc}</span>
                      </div>
                    </div>
                  )}

                  {/* Personalization Inputs */}
                  <div className="space-y-3 p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-white/[0.06] dark:bg-white/[0.01]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98] mb-1">
                          Your Full Name:
                        </label>
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => {
                            setCandidateName(e.target.value);
                            updateCoverLetter(selectedTone, e.target.value, hiringManager, customStory, selectedVibe);
                          }}
                          placeholder="e.g. John Doe"
                          className="w-full min-h-[38px] rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98] mb-1">
                          Hiring Manager / Recruiter Name (Optional):
                        </label>
                        <input
                          type="text"
                          value={hiringManager}
                          onChange={(e) => {
                            setHiringManager(e.target.value);
                            updateCoverLetter(selectedTone, candidateName, e.target.value, customStory, selectedVibe);
                          }}
                          placeholder="e.g. Sarah Jenkins (or leave blank)"
                          className="w-full min-h-[38px] rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98]">
                          Custom Origin Spark / Story Hook (Optional):
                        </label>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Auto-crafted from selected vibe if blank</span>
                      </div>
                      <input
                        type="text"
                        value={customStory}
                        onChange={(e) => {
                          setCustomStory(e.target.value);
                          updateCoverLetter(selectedTone, candidateName, hiringManager, e.target.value, selectedVibe);
                        }}
                        placeholder='e.g. "At age ten, our neighborhood had no water..." or "Watching my family business struggle with payment settlement..."'
                        className="w-full min-h-[38px] rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                      />
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 flex items-center justify-between gap-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-[#8a8f98]">Subject:</span>
                      <p className="text-xs font-semibold text-zinc-900 truncate dark:text-[#f7f8f8]">{coverSubject}</p>
                    </div>
                    <button
                      onClick={handleCopySubject}
                      className={`shrink-0 min-h-[38px] sm:min-h-[34px] flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                        copiedSubject
                          ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                      }`}
                    >
                      {copiedSubject ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedSubject ? 'Copied! ✨' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Letter Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98]">
                        Cover Letter Content (Editable):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleShareCoverLetter}
                          className="min-h-[36px] sm:min-h-[32px] flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] active:scale-95"
                          title="Share via native share sheet or copy"
                        >
                          <Share2 className="h-3 w-3 text-indigo-500" />
                          <span>Share</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCoverLetter(selectedTone, candidateName, hiringManager, customStory, selectedVibe)}
                          className="min-h-[36px] sm:min-h-[32px] flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCoverLetter}
                          className="min-h-[36px] sm:min-h-[32px] flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] active:scale-95"
                        >
                          <Download className="h-3 w-3" />
                          <span>Export .txt</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={12}
                      value={coverBody}
                      onChange={(e) => {
                        setCoverBody(e.target.value);
                      }}
                      className="w-full rounded-2xl border border-zinc-300 bg-white p-4 text-xs sm:text-sm text-zinc-900 leading-relaxed resize-y focus:border-zinc-900 focus:outline-none custom-scrollbar font-sans shadow-xs dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8]"
                    />
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={handleCopyCoverLetter}
                    className={`w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-bold transition active:scale-[0.98] shadow-sm ${
                      copiedCover
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-400'
                        : 'btn-primary'
                    }`}
                  >
                    {copiedCover ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCover ? 'Copied to clipboard! ✨' : 'Copy Full Cover Letter'}</span>
                  </button>
                </div>
              )}

              {/* TAB 3: RECRUITER OUTREACH */}
              {activeTab === 'outreach' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                        Select Outreach Format:
                      </label>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">✨ Story-Driven & Mission-Led</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'email' as const, label: 'Story-Driven Email', sub: '4-Paragraph Narrative', icon: '✉️' },
                        { id: 'linkedin' as const, label: 'LinkedIn Narrative DM', sub: '<150 words story pitch', icon: '💼' },
                        { id: 'twitter' as const, label: 'Twitter / Short DM', sub: '<280 chars punchy hook', icon: '⚡' },
                      ].map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => setOutreachPlatform(ch.id)}
                          className={`min-h-[56px] flex flex-col items-start p-3 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
                            outreachPlatform === ch.id
                              ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-900 dark:border-white/40 dark:bg-white/[0.12] dark:text-[#f7f8f8]'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{ch.icon}</span>
                            <span>{ch.label}</span>
                          </div>
                          <span className={`text-[10px] mt-1 ${outreachPlatform === ch.id ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {ch.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Story Vibe Selector Bar in Outreach Tab */}
                  <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1] flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Story Angle & Relatable Vibe:</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleShuffleVibe}
                        className="min-h-[38px] sm:min-h-[34px] flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-zinc-800 dark:text-[#f7f8f8] shadow-xs active:scale-95 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                      >
                        <Dices className={`h-3.5 w-3.5 text-indigo-500 ${isShuffling ? 'animate-spin' : ''}`} />
                        <span>Shuffle Vibe</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                      {STORY_VIBES.map((v) => {
                        const isVibeSelected = selectedVibe === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleVibeSelect(v.id)}
                            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 active:scale-[0.95] min-h-[64px] ${
                              isVibeSelected
                                ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs ring-2 ring-zinc-900 dark:border-white dark:bg-white/[0.16] dark:text-[#f7f8f8]'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
                            }`}
                          >
                            <span className="text-lg">{v.icon}</span>
                            <span className="font-bold text-[10px] sm:text-[11px] mt-1 leading-tight line-clamp-1">{v.label}</span>
                            {isVibeSelected && (
                              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold shadow-xs">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-white/[0.04] text-xs text-zinc-600 dark:text-[#a0a5ad] border border-black/5 dark:border-white/5">
                      <span className="font-bold text-zinc-900 dark:text-white shrink-0">
                        {STORY_VIBES.find((v) => v.id === selectedVibe)?.icon} {STORY_VIBES.find((v) => v.id === selectedVibe)?.label}:
                      </span>
                      <span className="truncate">{STORY_VIBES.find((v) => v.id === selectedVibe)?.desc}</span>
                    </div>
                  </div>

                  {/* Personalization Inputs */}
                  <div className="space-y-3 p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-white/[0.06] dark:bg-white/[0.01]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98] mb-1">
                          Your Full Name:
                        </label>
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => {
                            setCandidateName(e.target.value);
                            updateCoverLetter(selectedTone, e.target.value, hiringManager, customStory, selectedVibe);
                          }}
                          placeholder="e.g. John Doe"
                          className="w-full min-h-[38px] rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98] mb-1">
                          Hiring Manager / Recruiter Name (Optional):
                        </label>
                        <input
                          type="text"
                          value={hiringManager}
                          onChange={(e) => {
                            setHiringManager(e.target.value);
                            updateCoverLetter(selectedTone, candidateName, e.target.value, customStory, selectedVibe);
                          }}
                          placeholder="e.g. Sarah Jenkins (or leave blank)"
                          className="w-full min-h-[38px] rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98]">
                        {outreachPlatform === 'email' ? 'Story-Driven Cold Email' : outreachPlatform === 'linkedin' ? 'LinkedIn Cold DM' : 'Short Direct Message'}:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleShareOutreach}
                          className="min-h-[36px] sm:min-h-[32px] flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] active:scale-95"
                          title="Share via native share sheet or copy"
                        >
                          <Share2 className="h-3 w-3 text-emerald-500" />
                          <span>Share</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStory('');
                            updateCoverLetter(selectedTone, candidateName, hiringManager, undefined, selectedVibe);
                          }}
                          className="min-h-[36px] sm:min-h-[32px] flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadOutreach}
                          className="min-h-[36px] sm:min-h-[32px] flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] active:scale-95"
                        >
                          <Download className="h-3 w-3" />
                          <span>Export .txt</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyOutreach}
                          className={`min-h-[36px] sm:min-h-[32px] flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                            copiedOutreach
                              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                          }`}
                        >
                          {copiedOutreach ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedOutreach ? 'Copied to clipboard! ✨' : 'Copy Message'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-3.5 text-xs sm:text-sm text-zinc-800 whitespace-pre-line leading-relaxed dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#c9ccd1] font-sans">
                      {outreachText}
                    </div>
                  </div>

                  {/* Full-width Mobile-First Copy Button */}
                  <button
                    onClick={handleCopyOutreach}
                    className={`w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-bold transition active:scale-[0.98] shadow-sm ${
                      copiedOutreach
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-400'
                        : 'btn-primary'
                    }`}
                  >
                    {copiedOutreach ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedOutreach ? 'Copied to clipboard! ✨' : 'Copy Outreach Message'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-black/10 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.02] px-4 sm:px-6 py-3 sm:py-3.5 shrink-0 gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 sm:px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 transition dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:bg-white/[0.08] dark:hover:text-[#f7f8f8] shrink-0"
          >
            Close
          </button>

          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl px-3 sm:px-5 py-2 text-xs font-bold active:scale-95 transition shadow-sm min-w-0 max-w-[calc(100%-80px)] sm:max-w-none"
          >
            <span className="truncate">Direct Apply on {job.company}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
};
