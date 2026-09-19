'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  FileText,
  Send,
  Sliders,
  Download,
  Dices,
  Share2,
} from 'lucide-react';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { CoverLetterTone, generateCoverLetter } from '@/lib/cover-letter-generator';
import { generateColdDM, STORY_VIBES, StoryVibeId, generateTailoredPitch } from '@/lib/follow-up-generator';

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document.execCommand
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pitch' | 'cover_letter' | 'outreach'>('pitch');
  const [isShuffling, setIsShuffling] = useState(false);

  // Pitch Data - immediately initialized with instant client-side generation
  const [pitchData, setPitchData] = useState<{
    pitch_bullets: string[];
    cover_note: string;
    interview_tips: string[];
  } | null>(null);

  // Cover Letter Data & State
  const [selectedTone, setSelectedTone] = useState<CoverLetterTone>('story');
  const [selectedVibe, setSelectedVibe] = useState<StoryVibeId>('origin_spark');
  const [candidateName, setCandidateName] = useState(user?.name || '');
  const [hiringManager, setHiringManager] = useState('');
  const [customStory, setCustomStory] = useState('');
  const [coverSubject, setCoverSubject] = useState('');
  const [coverBody, setCoverBody] = useState('');

  // Outreach Platform State
  const [outreachPlatform, setOutreachPlatform] = useState<'email' | 'linkedin' | 'twitter'>('email');

  // Copy Feedback States
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedOutreach, setCopiedOutreach] = useState(false);

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

    try {
      const immediatePitch = generateTailoredPitch(job);
      setPitchData(immediatePitch);
    } catch (e) {
      console.error('Instant pitch error:', e);
      setPitchData({
        pitch_bullets: [
          `Strong practical alignment with ${job.title} requirements at ${job.company}.`,
          `Proven track record delivering reliable outcomes across ${(job.tags || []).join(', ') || 'key skills'}.`,
          `Excited by ${job.company}'s mission and eager to contribute immediately.`
        ],
        cover_note: `Hi ${job.company} Team,\n\nI am writing to express my strong interest in the ${job.title} role. With hands-on experience in ${(job.tags || []).join(', ') || 'this field'}, I am ready to step in and add tangible value to your projects.\n\nBest regards,`,
        interview_tips: [
          `Highlight your specific experience with ${(job.tags || [])[0] || job.title}.`,
          `Prepare concrete metrics illustrating how you solve problems efficiently.`,
          `Familiarize yourself with ${job.company}'s latest updates and product goals.`
        ]
      });
    }

    updateCoverLetter('story', candidateName || user?.name || '', hiringManager);
  }, [job, candidateName, user?.name, hiringManager, updateCoverLetter]);

  // Touch drag-to-dismiss for mobile bottom sheet
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
    setTimeout(() => setIsShuffling(false), 400);
    const currentIndex = STORY_VIBES.findIndex((v) => v.id === selectedVibe);
    const nextIndex = (currentIndex + 1) % STORY_VIBES.length;
    const nextVibe = STORY_VIBES[nextIndex].id;
    setSelectedVibe(nextVibe);
    setCustomStory('');
    updateCoverLetter(selectedTone, candidateName, hiringManager, undefined, nextVibe);
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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          transition: dragOffsetY === 0 ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        }}
        className="relative flex flex-col w-full max-w-3xl rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden max-h-[92vh] max-h-[92dvh] sm:max-h-[88vh] h-[92vh] h-[92dvh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Mobile Grab Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-blue-50/70 to-sky-50/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0080ff] text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                  Tailor My Application Pitch
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 shrink-0">
                  Instant
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {job.title} · <span className="text-slate-900 font-bold">{job.company}</span> ({job.location || 'Remote'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tailor modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 active:scale-95 transition shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Segmented Pill Navigation Bar */}
        <div className="px-3 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-200/80 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('pitch')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 active:scale-[0.98] ${
                activeTab === 'pitch'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Pitch & Points</span>
              <span className="sm:hidden text-[11px] truncate">Pitch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cover_letter')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 active:scale-[0.98] ${
                activeTab === 'cover_letter'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Role Cover Letter</span>
              <span className="sm:hidden text-[11px] truncate">Cover Letter</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('outreach')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 active:scale-[0.98] ${
                activeTab === 'outreach'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Recruiter Outreach</span>
              <span className="sm:hidden text-[11px] truncate">Outreach</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
          {/* TAB 1: PITCH & PREP */}
          {activeTab === 'pitch' && pitchData && (
            <div className="space-y-5">
              {/* High-Impact Pitch Bullets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      High-Impact Pitch Bullets
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBullets}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      copiedPitch
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {copiedPitch ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedPitch ? 'Copied! ✨' : 'Copy Bullets'}</span>
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  {pitchData.pitch_bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="flex-1 font-medium">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Short Application Note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Short Application Note (Direct Message / Quick Email)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCoverNote}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      copiedNote
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {copiedNote ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedNote ? 'Copied! ✨' : 'Copy Note'}</span>
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="whitespace-pre-line text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {pitchData.cover_note}
                  </p>
                </div>
              </div>

              {/* Interview Preparation Talking Points */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-2">
                  Interview Readiness Key Talking Points
                </h4>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                  {pitchData.interview_tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                      <span className="text-blue-600 font-bold">•</span>
                      <p className="font-medium">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROLE-SPECIFIC COVER LETTER */}
          {activeTab === 'cover_letter' && (
            <div className="space-y-5">
              {/* Tone Selection */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-2">
                  <Sliders className="h-3.5 w-3.5 text-blue-600" />
                  <span>Select Cover Letter Tone:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TONES.map((t) => {
                    const isSelected = selectedTone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToneSelect(t.id)}
                        className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs w-full">
                          <span className="text-base">{t.icon}</span>
                          <span>{t.label}</span>
                          {isSelected && (
                            <span className="ml-auto text-[10px] bg-blue-600 text-white rounded-full px-2 py-0.5 font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                          {t.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Story Vibe Selector Bar */}
              {selectedTone === 'story' && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>Story Angle & Vibe:</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleShuffleVibe}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs active:scale-95 hover:bg-slate-100 transition"
                    >
                      <Dices className={`h-3.5 w-3.5 text-blue-600 ${isShuffling ? 'animate-spin' : ''}`} />
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
                          className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all duration-150 active:scale-[0.95] min-h-[64px] ${
                            isVibeSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-2 ring-blue-600 font-bold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-lg">{v.icon}</span>
                          <span className="font-bold text-[10px] mt-1 truncate max-w-full">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personalization Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hiring Manager / Recruiter Name (Optional):
                  </label>
                  <input
                    type="text"
                    value={hiringManager}
                    onChange={(e) => {
                      setHiringManager(e.target.value);
                      updateCoverLetter(selectedTone, candidateName, e.target.value, customStory, selectedVibe);
                    }}
                    placeholder="e.g. Sarah Jenkins or Hiring Team"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cover Letter Output Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Generated Cover Letter
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCoverLetter}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                        copiedCover
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {copiedCover ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCover ? 'Copied! ✨' : 'Copy Letter'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCoverLetter}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">
                      Subject: {coverSubject}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySubject}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      {copiedSubject ? 'Copied Subject' : 'Copy Subject'}
                    </button>
                  </div>
                  <div className="whitespace-pre-line text-xs sm:text-sm text-slate-800 font-medium leading-relaxed max-h-72 overflow-y-auto pr-1">
                    {coverBody}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECRUITER OUTREACH */}
          {activeTab === 'outreach' && (
            <div className="space-y-5">
              {/* Platform Selector */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 block mb-2">
                  Select Direct Outreach Channel:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutreachPlatform('email')}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                      outreachPlatform === 'email'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✉️ Cold Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutreachPlatform('linkedin')}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                      outreachPlatform === 'linkedin'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    💼 LinkedIn InMail
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutreachPlatform('twitter')}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                      outreachPlatform === 'twitter'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    𝕏 Direct Message
                  </button>
                </div>
              </div>

              {/* Message Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Bespoke Direct Pitch Message
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopyOutreach}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      copiedOutreach
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {copiedOutreach ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedOutreach ? 'Copied! ✨' : 'Copy Message'}</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="whitespace-pre-line text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {outreachText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-3 flex items-center justify-between">
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
          >
            <span>Official Portal Link</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white font-bold text-xs shadow-xs active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
