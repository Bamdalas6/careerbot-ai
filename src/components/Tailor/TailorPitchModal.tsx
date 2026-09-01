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
} from 'lucide-react';
import { JobListing } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { CoverLetterTone, generateCoverLetter } from '@/lib/cover-letter-generator';
import { generateColdDM, STORY_VIBES, StoryVibeId } from '@/lib/follow-up-generator';

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

  // Pitch Data
  const [pitchData, setPitchData] = useState<{
    pitch_bullets: string[];
    cover_note: string;
    interview_tips: string[];
  } | null>(null);

  const lastFetchedIdRef = React.useRef<string | null>(null);
  const currentJobKey = job ? `${job.id || ''}_${job.title}_${job.company}` : null;

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

  // Re-generate cover letter when tone, name, hiring manager, vibe, or custom story changes
  const updateCoverLetter = useCallback(
    (tone: CoverLetterTone, name: string, manager: string, story?: string, vibe?: StoryVibeId) => {
      if (!job) return;
      const res = generateCoverLetter({
        candidateName: name || user?.name || 'Candidate Name',
        candidateEmail: user?.email,
        jobTitle: job.title,
        company: job.company,
        hiringManager: manager,
        tone,
        keySkills: job.tags || [],
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

  useEffect(() => {
    if (!job || !currentJobKey) return;
    if (lastFetchedIdRef.current === currentJobKey) return;

    let isMounted = true;
    lastFetchedIdRef.current = currentJobKey;

    async function fetchPitch() {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await fetch('/api/tailor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.status === 401) {
          requireAuth();
          onClose();
          return;
        }

        if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
          setError(data.message || 'You need at least 2 credits to generate a tailored pitch.');
          openCreditModal();
          return;
        }

        if (data.success && data.data) {
          setPitchData(data.data);
          if (data.remainingCredits != null) {
            updateCredits(data.remainingCredits);
          }
          // Initialize Cover Letter
          updateCoverLetter('story', candidateName || user?.name || '', hiringManager);
        } else {
          setError(data.error || 'Failed to generate pitch details.');
        }
      } catch {
        if (isMounted) setError('Network error while generating pitch.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPitch();

    return () => {
      isMounted = false;
    };
  }, [currentJobKey, job, requireAuth, openCreditModal, updateCredits, updateCoverLetter, onClose, candidateName, user?.name, hiringManager]);

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
    const currentIndex = STORY_VIBES.findIndex((v) => v.id === selectedVibe);
    const nextIndex = (currentIndex + 1) % STORY_VIBES.length;
    const nextVibe = STORY_VIBES[nextIndex].id;
    setSelectedVibe(nextVibe);
    setCustomStory('');
    updateCoverLetter(selectedTone, candidateName, hiringManager, undefined, nextVibe);
  };

  const handleCopyBullets = () => {
    if (!pitchData) return;
    navigator.clipboard.writeText(pitchData.pitch_bullets.map((b) => `• ${b}`).join('\n'));
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyCoverNote = () => {
    if (!pitchData) return;
    navigator.clipboard.writeText(pitchData.cover_note);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const handleCopyCoverLetter = () => {
    const fullText = `Subject: ${coverSubject}\n\n${coverBody}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCover(true);
    setTimeout(() => setCopiedCover(false), 2000);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(coverSubject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleDownloadCoverLetter = () => {
    const fullText = `Subject: ${coverSubject}\n\n${coverBody}`;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${job.company}_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const outreachText = generateColdDM({
    userName: candidateName || user?.name || 'Candidate Name',
    jobTitle: job.title,
    company: job.company,
    contactName: hiringManager,
    platform: outreachPlatform,
    keySkills: job.tags || [],
    experienceYears: 5,
    vibeId: selectedVibe,
    customStory: customStory || undefined,
  });

  const handleCopyOutreach = () => {
    navigator.clipboard.writeText(outreachText);
    setCopiedOutreach(true);
    setTimeout(() => setCopiedOutreach(false), 2000);
  };

  const handleDownloadOutreach = () => {
    const blob = new Blob([outreachText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cold_Outreach_${job.company}_${outreachPlatform}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] min-h-[480px] w-full max-w-3xl flex-col rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl overflow-hidden dark:border-white/[0.1] dark:bg-[#0c0c0d] dark:text-[#f7f8f8]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 sm:px-6 py-4 bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-zinc-900 border border-black/10 shadow-xs dark:bg-white/[0.06] dark:text-[#f7f8f8] dark:border-white/10">
              <Sparkles className="h-5 w-5 text-indigo-500 dark:text-[#f7f8f8]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 text-base truncate dark:text-[#f7f8f8]">Tailor My Application</h3>
                <span className="flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-700 border border-black/10 dark:bg-white/[0.08] dark:text-[#c9ccd1] dark:border-white/10">
                  <Zap className="h-3 w-3 text-amber-500" />
                  2 credits
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate dark:text-[#8a8f98]">
                {job.title} · <span className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">{job.company}</span> ({job.location})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-black/10 bg-zinc-50/50 px-5 sm:px-6 overflow-x-auto dark:border-white/[0.08] dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'pitch'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>🎯 Pitch & Talking Points</span>
          </button>

          <button
            onClick={() => setActiveTab('cover_letter')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'cover_letter'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>✍️ Role Cover Letter</span>
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'outreach'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>💬 Recruiter Outreach</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
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
              {activeTab === 'pitch' && pitchData && (
                <div className="space-y-6">
                  {/* High-Impact Pitch Bullets */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-zinc-500 dark:text-[#8a8f98]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                          High-Impact Pitch Bullets
                        </h4>
                      </div>
                      <button
                        onClick={handleCopyBullets}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] dark:hover:bg-white/[0.08]"
                      >
                        {copiedPitch ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedPitch ? 'Copied' : 'Copy Bullets'}</span>
                      </button>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      {pitchData.pitch_bullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-800 leading-relaxed dark:text-[#c9ccd1]">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-900 text-[11px] font-bold mt-0.5 dark:bg-white/[0.08] dark:text-[#f7f8f8]">
                            {idx + 1}
                          </span>
                          <p>{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Short Outreach Note */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-zinc-500 dark:text-[#8a8f98]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                          Short Application Note
                        </h4>
                      </div>
                      <button
                        onClick={handleCopyCoverNote}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] dark:hover:bg-white/[0.08]"
                      >
                        {copiedNote ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedNote ? 'Copied' : 'Copy Note'}</span>
                      </button>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs sm:text-sm text-zinc-800 whitespace-pre-line leading-relaxed dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#c9ccd1]">
                      {pitchData.cover_note}
                    </div>
                  </div>

                  {/* Interview Tips */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Lightbulb className="h-4 w-4 text-zinc-500 dark:text-[#8a8f98]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1]">
                        Interview Readiness Tips
                      </h4>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      {pitchData.interview_tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed dark:text-[#8a8f98]">
                          <span className="text-zinc-900 font-bold dark:text-white">•</span>
                          <p>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE-SPECIFIC COVER LETTER */}
              {activeTab === 'cover_letter' && (
                <div className="space-y-5">
                  {/* Tone Selection Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1] flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-zinc-500 dark:text-[#8a8f98]" />
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
                            className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                              isSelected
                                ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs dark:border-white dark:bg-white/[0.08] dark:text-[#f7f8f8]'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:border-white/20 dark:hover:text-[#c9ccd1]'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs">
                              <span>{t.icon}</span>
                              <span>{t.label}</span>
                              {isSelected && <span className="ml-auto text-[10px] bg-white/20 rounded px-1.5 py-0.2">Active</span>}
                            </div>
                            <p className={`mt-1 text-[11px] leading-tight ${isSelected ? 'text-zinc-200 dark:text-zinc-300' : 'text-zinc-500 dark:text-[#8a8f98]'}`}>{t.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Story Vibe Selector Bar (when Story-Driven tone is active) */}
                  {selectedTone === 'story' && (
                    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1] flex items-center gap-1.5">
                          <span>Story Angle & Relatable Vibe:</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleShuffleVibe}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-800 shadow-xs hover:border-zinc-900 hover:bg-zinc-100 transition dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8] dark:hover:bg-white/10"
                        >
                          <span>🎲 Shuffle / Generate New Vibe</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                        {STORY_VIBES.map((v) => {
                          const isVibeSelected = selectedVibe === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleVibeSelect(v.id)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                                isVibeSelected
                                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs dark:border-white dark:bg-white/[0.12] dark:text-[#f7f8f8]'
                                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
                              }`}
                            >
                              <span className="text-base">{v.icon}</span>
                              <span className="font-bold text-[11px] mt-0.5 leading-tight">{v.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98] italic pt-0.5">
                        Active angle: {STORY_VIBES.find((v) => v.id === selectedVibe)?.desc}
                      </p>
                    </div>
                  )}

                  {/* Personalization Inputs */}
                  <div className="space-y-3 p-3 rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/[0.06] dark:bg-white/[0.01]">
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
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
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
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
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
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                      />
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 flex items-center justify-between gap-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-[#8a8f98]">Subject:</span>
                      <p className="text-xs font-semibold text-zinc-900 truncate dark:text-[#f7f8f8]">{coverSubject}</p>
                    </div>
                    <button
                      onClick={handleCopySubject}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                    >
                      {copiedSubject ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedSubject ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Letter Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98]">
                        Cover Letter Content (Editable):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCoverLetter(selectedTone, candidateName, hiringManager, customStory, selectedVibe)}
                          className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                        <button
                          onClick={handleDownloadCoverLetter}
                          className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download .txt</span>
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
                    className="btn-primary w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs sm:text-sm font-semibold transition"
                  >
                    {copiedCover ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCover ? 'Full Cover Letter Copied to Clipboard!' : 'Copy Full Cover Letter'}</span>
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
                        { id: 'email' as const, label: 'Story-Driven Email', sub: '4-Paragraph Narrative' },
                        { id: 'linkedin' as const, label: 'LinkedIn Narrative DM', sub: '<150 words story pitch' },
                        { id: 'twitter' as const, label: 'Twitter / Short DM', sub: '<280 chars punchy hook' },
                      ].map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => setOutreachPlatform(ch.id)}
                          className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                            outreachPlatform === ch.id
                              ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs dark:border-white dark:bg-white/[0.08] dark:text-[#f7f8f8]'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
                          }`}
                        >
                          <span className="font-bold text-xs">{ch.label}</span>
                          <span className={`text-[10px] mt-0.5 ${outreachPlatform === ch.id ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>{ch.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Story Vibe Selector Bar in Outreach Tab */}
                  <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c9ccd1] flex items-center gap-1.5">
                        <span>Story Angle & Relatable Vibe:</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleShuffleVibe}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-800 shadow-xs hover:border-zinc-900 hover:bg-zinc-100 transition dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8] dark:hover:bg-white/10"
                      >
                        <span>🎲 Shuffle / Generate New Vibe</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                      {STORY_VIBES.map((v) => {
                        const isVibeSelected = selectedVibe === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleVibeSelect(v.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                              isVibeSelected
                                ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs dark:border-white dark:bg-white/[0.12] dark:text-[#f7f8f8]'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-[#8a8f98] dark:hover:text-[#c9ccd1]'
                            }`}
                          >
                            <span className="text-base">{v.icon}</span>
                            <span className="font-bold text-[11px] mt-0.5 leading-tight">{v.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98] italic pt-0.5">
                      Active angle: {STORY_VIBES.find((v) => v.id === selectedVibe)?.desc}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98]">
                        {outreachPlatform === 'email' ? 'Story-Driven Cold Email' : outreachPlatform === 'linkedin' ? 'LinkedIn Cold DM' : 'Short Direct Message'}:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadOutreach}
                          className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download .txt</span>
                        </button>
                        <button
                          onClick={handleCopyOutreach}
                          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                        >
                          {copiedOutreach ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedOutreach ? 'Copied' : 'Copy Message'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-3.5 text-xs sm:text-sm text-zinc-800 whitespace-pre-line leading-relaxed dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#c9ccd1] font-sans">
                      {outreachText}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-black/10 bg-zinc-50 px-5 sm:px-6 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:bg-white/[0.08] dark:hover:text-[#f7f8f8]"
          >
            Close
          </button>

          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
          >
            <span>Direct Apply on {job.company}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
