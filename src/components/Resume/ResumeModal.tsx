'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, FileText, Sparkles, Loader2, CheckCircle2, ArrowRight, UploadCloud,
  AlertTriangle, Copy, Check, RotateCcw, Target, Download, TrendingUp, Wand2,
  FileType2, Zap, PenLine, Send, FileCode, MapPin, Building2,
} from 'lucide-react';
import { CVReview, ResumeProfile, UpgradedCV, AhaMomentData } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { ExecutiveResumePreview } from './ExecutiveResumePreview';
import { renderExecutiveResumeHtml } from '@/lib/resume-template';


interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedSkills: (profile: ResumeProfile, autoSearchQuery: string) => void;
}

const SAMPLE_RESUMES = [
  {
    label: 'Product Designer (Figma + UI/UX)',
    text: `Product Designer with 4+ years experience designing consumer mobile and web applications. Expert in Figma, wireframing, high-fidelity interactive prototyping, and cross-functional handoff. Collaborated with product and engineering teams to launch fintech checkout flows, improving conversion by 35%.`,
  },
  {
    label: 'Senior Full Stack (React + Node + AWS)',
    text: `Senior Full Stack Software Engineer with 6+ years experience. Built microservices with TypeScript, Node.js, Next.js, and React. Architected cloud pipelines on AWS and Docker, utilizing PostgreSQL databases with GraphQL APIs. Led team of 4 engineers and improved dashboard performance by 40%.`,
  },
  {
    label: 'AI & Python Engineer (PyTorch + ML)',
    text: `Machine Learning Engineer with 4 years building LLM fine-tuning pipelines, PyTorch models, and high-performance inference APIs with Python and FastAPI. Scaled distributed vector databases and Kubernetes clusters.`,
  },
  {
    label: 'Frontend Developer (React + Tailwind)',
    text: `Frontend Developer with 3 years building responsive web apps with React, Next.js, TypeScript, and Tailwind CSS. Strong eye for UI/UX design, Figma prototypes, and web accessibility standards.`,
  },
  {
    label: 'Content Creator (CapCut + Video Storytelling)',
    text: `Content Creator & Video Editor with 3+ years experience producing high-engagement videos for YouTube, TikTok, and Instagram Reels. Highly skilled in CapCut, Canva, B-roll sourcing, viral scriptwriting, and audience retention optimization.`,
  },
];

const ACCEPT = '.pdf,.docx,.doc,.txt,.md,application/pdf,text/plain';

/** Score → grade styling with high contrast in both themes. */
function scoreTone(score: number): { ring: string; text: string } {
  if (score >= 75) return { ring: 'border-emerald-500 dark:border-white/40', text: 'text-emerald-700 dark:text-white' };
  if (score >= 50) return { ring: 'border-indigo-500 dark:border-white/20', text: 'text-indigo-700 dark:text-[#f7f8f8]' };
  return { ring: 'border-zinc-300 dark:border-white/10', text: 'text-zinc-600 dark:text-[#8a8f98]' };
}

const STATUS_LABEL: Record<string, string> = {
  strong: 'Strong',
  ok: 'Needs work',
  weak: 'Weak',
};

type TabId = 'aha' | 'match' | 'upgrade' | 'rebuilt';

const TABS: { id: TabId; label: string }[] = [
  { id: 'aha', label: 'Match discovery & gaps' },
  { id: 'match', label: 'Extracted profile' },
  { id: 'upgrade', label: 'CV review' },
  { id: 'rebuilt', label: 'Upgraded CV' },
];

/**
 * The rebuilt CV survives a refresh, so "later" genuinely means later. Local
 * only, like saved jobs — there are no accounts in this app and a CV is not
 * something to ship to a server we don't need to.
 */
const CV_STORAGE_KEY = 'career_bot_upgraded_cv';

interface StoredCV extends UpgradedCV {
  score_before: number | null;
  score_after: number | null;
  saved_at: string;
}

/**
 * Sanitizes and repairs stored or pasted CV text:
 * - Fixes embedded headings in summary
 * - Fixes fragmented bullets created by PDF wrapping
 * - Cleans double commas and normalizes text
 */
function sanitizeStoredCVText(rawText: string): string {
  if (!rawText) return rawText;
  let text = rawText;

  // 1. Separate embedded section headings that got appended to summary
  text = text.replace(
    /(?<=\S)\s+(?=(?:CORE\s+(?:COMPETENCIES|SKILLS|TECHNICAL|CULINARY|CLINICAL|PROFESSIONAL)(?:\s*(?:&|and)\s*(?:SKILLS|COMPETENCIES|TECHNICAL\s+SKILLS|PROFESSIONAL\s+SKILLS|EXPERTISE))?|PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EDUCATION\s*&?\s*CERTIFICATIONS|KEY\s+PROJECTS)\b)/gi,
    '\n\n'
  );

  // 2. Separate category labels attached directly after a section heading
  text = text.replace(
    /(?<=(?:CORE\s+(?:COMPETENCIES|SKILLS|TECHNICAL|CULINARY|CLINICAL|PROFESSIONAL)(?:\s*(?:&|and)\s*(?:SKILLS|COMPETENCIES|TECHNICAL\s+SKILLS|PROFESSIONAL\s+SKILLS|EXPERTISE))?|TECHNICAL\s+SKILLS|CORE\s+SKILLS|AREAS\s+OF\s+EXPERTISE|KEY\s+SKILLS))\s+(?=[A-Za-z0-9\s/&+-]{2,40}:\s*\S)/gi,
    '\n'
  );

  // 3. Fix double commas and "Google, Workspace"
  text = text.replace(/,\s*,+/g, ',').replace(/Google,\s*Workspace/gi, 'Google Workspace');

  // 4. Merge fragmented continuation bullets e.g. "• Spearheaded ... advisory\n• initiatives."
  const lines = text.split(/\r?\n/);
  const outLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      outLines.push(rawLine);
      continue;
    }

    if (outLines.length > 0) {
      const lastIdx = outLines.length - 1;
      const lastLine = outLines[lastIdx].trim();
      const lastIsBullet = /^[•▪◦·*\-–—]\s*/.test(lastLine);
      const curIsBullet = /^[•▪◦·*\-–—]\s*/.test(trimmed);
      const cleanCur = trimmed.replace(/^[•▪◦·*\-–—]\s*/, '').trim();

      if (lastIsBullet && cleanCur) {
        const lastClean = lastLine.replace(/^[•▪◦·*\-–—]\s*/, '').trim();
        const prevEndsSentence = /[.!?]$/.test(lastClean);
        const startsLower = /^[a-z]/.test(cleanCur);
        const startsConjunction = /^(?:and|or|with|for|to|of|in|by|across|on|at|including|such\s+as)\b/i.test(cleanCur);
        const isShortFragment = cleanCur.split(/\s+/).length <= 6 && !/[.!?].+[.!?]/.test(cleanCur);

        const isContinuation =
          startsLower ||
          (startsConjunction && isShortFragment) ||
          (!prevEndsSentence && (!curIsBullet || startsLower || startsConjunction || isShortFragment));

        if (isContinuation) {
          outLines[lastIdx] = `• ${lastClean} ${cleanCur}`.replace(/\s+/g, ' ').trim();
          continue;
        }
      }
    }

    outLines.push(rawLine);
  }

  return outLines.join('\n');
}

/**
 * Read at first render rather than in an effect: an effect that calls setState
 * cascades a second render, and the modal renders nothing until it's opened, so
 * there is no hydration mismatch to worry about either.
 */
function readStoredCV(): StoredCV | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCV;
    if (!parsed?.text) return null;
    const sanitizedText = sanitizeStoredCVText(parsed.text);
    if (sanitizedText !== parsed.text) {
      parsed.text = sanitizedText;
      try {
        window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        /* storage full or blocked */
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Plain text is what ATS parsers want; markdown is for humans and editors. */
function toMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line, i) => {
      const t = line.trim();
      if (!t) return '';
      if (i === 0) return `# ${t}`;
      const letters = t.replace(/[^A-Za-z]/g, '');
      const isHeading =
        letters.length > 2 && letters === letters.toUpperCase() && t.split(/\s+/).length <= 5 && !t.includes('·');
      if (isHeading) return `## ${t}`;
      if (t.startsWith('•')) return `- ${t.replace(/^•\s*/, '')}`;
      return t;
    })
    .join('\n');
}

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function download(filename: string, body: string) {
  saveBlob(filename, new Blob([body], { type: 'text/plain;charset=utf-8' }));
}

/** Filename the server suggested, so the PDF and the .docx match the CV's name. */
function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({
  isOpen,
  onClose,
  onParsedSkills,
}) => {
  const { requireAuth, updateCredits, openCreditModal } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<ResumeProfile | null>(null);
  const [ahaMoment, setAhaMoment] = useState<AhaMomentData | null>(null);
  const [review, setReview] = useState<CVReview | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<TabId>('aha');

  // The rebuilt document, restored from the last session if there was one.
  const [upgraded, setUpgraded] = useState<StoredCV | null>(readStoredCV);
  const [rebuilding, setRebuilding] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | 'html' | null>(null);
  const [cvCopied, setCvCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');

  // Manual edit state
  const [editInstruction, setEditInstruction] = useState('');
  const [editing, setEditing] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ message: string; success: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Drag events fire on every child element, so a plain boolean flickers.
  // Counting enter/leave pairs keeps the highlight stable across the subtree.
  const dragDepth = useRef(0);

  const parseText = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setExtractedProfile(data.profile);
        if (data.ahaMoment) {
          setAhaMoment(data.ahaMoment);
          setTab('aha');
        } else {
          setTab('match');
        }
      } else {
        setError(data.error || 'Could not read a profile out of that text.');
      }
    } catch {
      setError('Network error while reading your CV. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Upload → extract → parse, with no button in between. */
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setReview(null);
      setExtractedProfile(null);
      setAhaMoment(null);
      setFileName(file.name);
      setLoading(true);

      try {
        if (!file || file.size === 0) {
          setError('This file is empty. Please choose a valid CV document.');
          setFileName(null);
          setLoading(false);
          return;
        }

        if (file.size > 12 * 1024 * 1024) {
          setError('File exceeds 12 MB limit. Please upload a standard text-based CV.');
          setFileName(null);
          setLoading(false);
          return;
        }

        const isPlainText = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.type === 'text/plain';
        if (isPlainText) {
          const directText = await file.text();
          if (directText.trim().length >= 30) {
            setResumeText(directText);
            await parseText(directText);
            return;
          }
        }

        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/resume/extract', { method: 'POST', body: form });
        const data = await res.json();

        if (!data.success || !data.text) {
          setError(data.error || 'Could not read that file. You can also paste your CV text directly below.');
          setFileName(null);
          setLoading(false);
          return;
        }

        setResumeText(data.text);
        await parseText(data.text); // auto-parse: the upload IS the action
      } catch {
        setError('Upload failed. Check your connection, or paste your CV text directly into the box below.');
        setFileName(null);
        setLoading(false);
      }
    },
    [parseText]
  );

  const handleUpgrade = useCallback(async () => {
    if (!requireAuth()) return;

    const text = resumeText.trim();
    if (text.length < 40) {
      setError('Add more of your CV first — there isn’t enough here to review.');
      return;
    }
    setReviewing(true);
    setError(null);
    try {
      const res = await fetch('/api/resume/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetRole: extractedProfile?.extracted_title }),
      });
      const data = await res.json();

      if (res.status === 401) {
        requireAuth();
        return;
      }

      if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
        setError(data.message || 'You have exhausted your credits. Please top up to continue.');
        openCreditModal();
        return;
      }

      if (data.success && data.review) {
        setReview(data.review);
        setTab('upgrade');
        if (data.remainingCredits != null) {
          updateCredits(data.remainingCredits);
        }
      } else {
        setError(data.error || 'Could not review that CV.');
      }
    } catch {
      setError('Network error while reviewing your CV. Try again.');
    } finally {
      setReviewing(false);
    }
  }, [resumeText, extractedProfile, requireAuth, openCreditModal, updateCredits]);

  /** Materialise the review into a document the user can keep and re-use. */
  const handleRebuild = useCallback(async () => {
    if (!requireAuth()) return;

    const text = resumeText.trim();
    if (text.length < 40) {
      setError('Add more of your CV first — there isn’t enough here to rebuild.');
      return;
    }
    setRebuilding(true);
    setError(null);
    try {
      const res = await fetch('/api/resume/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetRole: extractedProfile?.extracted_title }),
      });
      const data = await res.json();

      if (res.status === 401) {
        requireAuth();
        return;
      }

      if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
        setError(data.message || 'You have exhausted your credits. Please top up to rebuild your CV.');
        openCreditModal();
        return;
      }

      if (data.success && data.cv) {
        const stored: StoredCV = {
          ...(data.cv as UpgradedCV),
          score_before: data.score_before ?? null,
          score_after: data.score_after ?? null,
          saved_at: new Date().toISOString(),
        };
        setUpgraded(stored);
        setTab('rebuilt');
        if (data.remainingCredits != null) {
          updateCredits(data.remainingCredits);
        }
        try {
          localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(stored));
        } catch {
          /* storage full or blocked — the CV is still on screen to copy/download */
        }
      } else {
        setError(data.error || 'Could not rebuild that CV.');
      }
    } catch {
      setError('Network error while rebuilding your CV. Try again.');
    } finally {
      setRebuilding(false);
    }
  }, [resumeText, extractedProfile, requireAuth, openCreditModal, updateCredits]);

  /** Apply a manual edit instruction to the upgraded CV. */
  const handleManualEdit = useCallback(async () => {
    if (!requireAuth() || !upgraded || !editInstruction.trim()) return;

    setEditing(true);
    setEditFeedback(null);
    setError(null);
    try {
      const res = await fetch('/api/resume/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: upgraded.text, instruction: editInstruction.trim() }),
      });
      const data = await res.json();

      if (res.status === 401) { requireAuth(); return; }
      if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
        setError(data.message || 'Not enough credits.');
        openCreditModal();
        return;
      }

      setEditFeedback({ message: data.applied, success: data.success });
      if (data.success && data.text) {
        const updated: StoredCV = { ...upgraded, text: data.text, saved_at: new Date().toISOString() };
        setUpgraded(updated);
        try { localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ok */ }
        setEditInstruction('');
      }
      if (data.remainingCredits != null) updateCredits(data.remainingCredits);
    } catch {
      setError('Network error while editing your CV. Try again.');
    } finally {
      setEditing(false);
    }
  }, [upgraded, editInstruction, requireAuth, openCreditModal, updateCredits]);

  // Closing mid-drag would otherwise leave the dropzone stuck highlighted, so
  // every close path clears the drag state on the way out rather than an effect
  // watching isOpen (which would cascade a render on each open/close).
  const handleClose = useCallback(() => {
    dragDepth.current = 0;
    setDragging(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleApplyMatch = () => {
    if (!extractedProfile) return;
    const query = `Find ${extractedProfile.extracted_title || 'Software Engineer'} ${extractedProfile.skills
      .slice(0, 3)
      .join(' ')} roles matching my resume skills`;

    if (!requireAuth()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('careerbot_pending_search', query);
      }
      return;
    }

    onParsedSkills(extractedProfile, query);
    handleClose();
  };

  const handleUpgradeCta = async () => {
    if (!requireAuth()) return;
    if (!review) {
      await handleUpgrade();
    } else {
      await handleRebuild();
    }
  };

  const handleSelectSample = (sampleText: string) => {
    setResumeText(sampleText);
    setExtractedProfile(null);
    setAhaMoment(null);
    setReview(null);
    setFileName(null);
    setError(null);
    parseText(sampleText);
  };

  const handleReset = () => {
    setResumeText('');
    setFileName(null);
    setExtractedProfile(null);
    setAhaMoment(null);
    setReview(null);
    setError(null);
    // Clearing the working text doesn't throw away a CV they had built.
    setTab(upgraded ? 'rebuilt' : 'aha');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copySummary = async () => {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review.rewritten_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Clipboard blocked by your browser — select the text and copy manually.');
    }
  };

  const copyCv = async () => {    if (!upgraded) return;
    try {
      await navigator.clipboard.writeText(upgraded.text);
      setCvCopied(true);
      setTimeout(() => setCvCopied(false), 1600);
    } catch {
      setError('Clipboard blocked by your browser — select the text and copy manually.');
    }
  };

  /** Hand edits are the point of the textarea, so they get stored too. */
  const persistEdits = () => {
    if (!upgraded) return;
    try {
      localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(upgraded));
    } catch {
      /* nothing to do — the text is still on screen */
    }
  };

  /**
   * PDF, Word, and HTML are rendered server-side or generated client-side from whatever
   * is in the box right now, so hand edits make it into the downloaded file.
   */
  const exportCv = async (format: 'pdf' | 'docx' | 'html') => {
    if (!upgraded) return;
    const cleanText = sanitizeStoredCVText(upgraded.text);
    setExporting(format);
    setError(null);
    try {
      const res = await fetch('/api/resume/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, format }),
      });
      if (res.ok) {
        const blob = await res.blob();
        saveBlob(filenameFrom(res.headers.get('Content-Disposition'), `executive-resume.${format}`), blob);
        return;
      }
      // If format is html and server responded with an error (e.g. before M2 route), fallback to client-side generation
      if (format === 'html') {
        const htmlContent = renderExecutiveResumeHtml(upgraded.text);
        saveBlob('executive-resume.html', new Blob([htmlContent], { type: 'text/html;charset=utf-8' }));
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error || `Could not generate the ${format.toUpperCase()} file.`);
    } catch {
      if (format === 'html') {
        const htmlContent = renderExecutiveResumeHtml(upgraded.text);
        saveBlob('executive-resume.html', new Blob([htmlContent], { type: 'text/html;charset=utf-8' }));
      } else {
        setError(`Network error while generating the ${format === 'pdf' ? 'PDF' : format === 'docx' ? 'Word document' : 'HTML file'}. Try again.`);
      }
    } finally {
      setExporting(null);
    }
  };

  const savedNote = upgraded?.saved_at
    ? `Saved on this device — it will still be here next time you open this panel. Built ${new Date(
        upgraded.saved_at
      ).toLocaleString()}.`
    : null;

  const scoreDelta =
    upgraded?.score_after != null && upgraded?.score_before != null
      ? upgraded.score_after - upgraded.score_before
      : 0;

  /**
   * Promote the rebuilt document to being *the* CV: it goes back into the text
   * box, gets re-parsed for skills and re-scored, so the review and the role
   * matching from here on describe the new version rather than the old one.
   */
  const handleAdopt = async () => {
    if (!upgraded) return;
    const text = upgraded.text;
    setResumeText(text);
    setFileName(null);
    setError(null);
    await parseText(text);
    setReviewing(true);
    try {
      const res = await fetch('/api/resume/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.review) {
        setReview(data.review);
        setTab('upgrade');
      }
    } catch {
      setError('Network error while re-scoring the new CV. The document itself is unaffected.');
    } finally {
      setReviewing(false);
    }
  };

  const tone = review ? scoreTone(review.score) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className={`relative flex max-h-[95vh] sm:max-h-[90vh] w-full ${tab === 'rebuilt' ? 'sm:max-w-4xl lg:max-w-5xl' : 'sm:max-w-2xl'} flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl transition-all duration-200 dark:border-white/[0.08] dark:bg-[#0a0a0a] dark:text-[#f7f8f8]`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-[#f7f8f8]">Your CV</h3>
              <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                Drop a file and it reads itself. Then match roles, or get it upgraded.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-black/[0.06] hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs — only meaningful once there is something to show */}
        {(ahaMoment || extractedProfile || review || upgraded) && (
          <div className="flex gap-1 border-b border-black/10 bg-zinc-50/50 px-4 sm:px-6 overflow-x-auto flex-nowrap dark:border-white/[0.08] dark:bg-white/[0.02]">
            {TABS.filter((t) =>
              t.id === 'aha' ? !!ahaMoment : t.id === 'match' ? !!extractedProfile : t.id === 'upgrade' ? !!review : !!upgraded
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-2.5 text-xs font-semibold shrink-0 transition ${
                  tab === t.id ? 'text-zinc-900 dark:text-[#f7f8f8]' : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                }`}
              >
                {t.label}
                {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-zinc-900 dark:bg-white/60" />}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Dropzone */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepth.current -= 1;
              if (dragDepth.current <= 0) {
                dragDepth.current = 0;
                setDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              dragDepth.current = 0;
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition min-h-[120px] sm:min-h-[160px] ${
              dragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:border-white/40 dark:bg-white/[0.06]'
                : 'border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-100/60 dark:border-white/[0.14] dark:bg-white/[0.02] dark:hover:border-white/25 dark:hover:bg-white/[0.04]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {loading && fileName ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-zinc-900 dark:text-[#f7f8f8]" />
                <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Reading {fileName}…</p>
                <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">Extracting text and pulling out your skills.</p>
              </>
            ) : fileName ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-[#f7f8f8]" />
                <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">{fileName}</p>
                <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                  Read and parsed. Drop another file to replace it.
                </p>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-zinc-500 dark:text-[#8a8f98]" />
                <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">
                  Drop your CV here, or click to choose
                </p>
                <p className="text-xs text-zinc-500 dark:text-[#8a8f98]">
                  PDF, DOCX, TXT or MD · read in your browser session, never stored
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {/* Samples */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
              Or try a sample background
            </label>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_RESUMES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(sample.text)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#c9ccd1] dark:hover:border-white/20 dark:hover:bg-white/[0.07] dark:hover:text-[#f7f8f8]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text area — the file's text lands here and stays editable */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                CV text
              </label>
              {resumeText && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setExtractedProfile(null);
                setReview(null);
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted && pasted.trim().length > 30) {
                  setResumeText(pasted);
                  parseText(pasted);
                }
              }}
              placeholder="Or paste your CV — summary, experience, skills, education…"
              className="w-full resize-none rounded-2xl border border-zinc-300 bg-white p-4 text-xs sm:text-sm text-zinc-900 shadow-xs transition placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d] dark:focus:border-white/25"
            />
            {resumeText && !extractedProfile && !loading && (
              <button
                onClick={() => parseText(resumeText)}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Read this text
              </button>
            )}
          </div>

          {/* ------------------------------------------------ AHA MOMENT DISCOVERY */}
          {tab === 'aha' && ahaMoment && (
            <div className="space-y-4">
              {/* 1. CareerBot Realistic Roles Announcement */}
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent p-5 sm:p-6 dark:border-emerald-500/20 dark:from-emerald-500/[0.07] dark:via-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>CareerBot Talent Intelligence</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#f7f8f8]">
                      {ahaMoment.aha_headline}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-[#8a8f98]">
                      Screened against live employer boards & direct feeds for{' '}
                      <strong className="text-zinc-900 dark:text-white">{ahaMoment.target_role}</strong>.
                    </p>
                  </div>
                  <div className="flex items-baseline sm:flex-col sm:items-end gap-1.5 shrink-0 bg-white/70 dark:bg-white/[0.04] p-3 rounded-xl border border-black/5 dark:border-white/5">
                    <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
                      {ahaMoment.realistic_jobs_count}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-[#8a8f98]">
                      Realistic roles
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Your Strongest Match Spotlight */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition dark:border-white/[0.1] dark:bg-[#0f0f11]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-[#8a8f98]">
                    Your strongest match
                  </span>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{ahaMoment.strongest_match.match_score}% Match</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-[#f7f8f8]">
                      {ahaMoment.strongest_match.title}{' '}
                      <span className="text-zinc-400 dark:text-zinc-500 font-normal">—</span>{' '}
                      <span className="text-zinc-700 dark:text-[#c9ccd1]">{ahaMoment.strongest_match.company}</span>
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-[#8a8f98]">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {ahaMoment.strongest_match.location}
                      </span>
                      <span>•</span>
                      <span>{ahaMoment.strongest_match.is_remote ? 'Remote' : 'Hybrid / On-site'}</span>
                      {ahaMoment.strongest_match.salary_formatted && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {ahaMoment.strongest_match.salary_formatted}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Why it matches */}
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 dark:bg-white/[0.02] dark:border-white/[0.06]">
                    <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8a8f98] mb-1.5">
                      Why you qualify:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ahaMoment.strongest_match.matching_highlights.map((h, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 dark:bg-white/[0.05] dark:border-white/[0.1] dark:text-[#f7f8f8]"
                        >
                          <Check className="h-3 w-3 text-emerald-600" />
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Teaser of remaining matches */}
                  {ahaMoment.other_matches_sample.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-[#8a8f98]">
                          Also qualified for:
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-[#62666d]">
                          +{ahaMoment.realistic_jobs_count - 1} more waiting in pipeline
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ahaMoment.other_matches_sample.map((job, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/70 p-2.5 text-xs dark:border-white/[0.05] dark:bg-white/[0.02]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-900 dark:text-[#f7f8f8] truncate">{job.title}</p>
                              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98] truncate">{job.company}</p>
                            </div>
                            <span className="shrink-0 rounded-md bg-zinc-200/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-white/[0.08] dark:text-[#c9ccd1]">
                              {job.match_score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. The Value Hook / Aha realization: Missing Keywords */}
              <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.02] to-transparent p-5 dark:border-amber-500/30 dark:from-amber-500/[0.07] dark:via-transparent">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-2 flex-1">
                    <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">
                      &ldquo;{ahaMoment.missing_keywords_message}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ahaMoment.missing_keywords.map((k, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 shadow-xs dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
                      Recruiters and automated ATS screeners filter for these exact terms. Adding them and quantifying your achievements can elevate your match score into the top 5% of applicants.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Upgrade CTA */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleUpgradeCta}
                  disabled={reviewing || rebuilding}
                  className="btn-primary group flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-bold shadow-md transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  {reviewing || rebuilding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 text-indigo-300 transition group-hover:rotate-12" />
                  )}
                  <span>Improve your CV and unlock your top matches</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={handleApplyMatch}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                >
                  <span>Search all {ahaMoment.realistic_jobs_count} realistic roles as-is</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------ extracted profile */}
          {tab === 'match' && extractedProfile && (
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.1] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>What I read from your CV</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8a8f98]">
                  {extractedProfile.skills.length} skills identified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-700 rounded-xl bg-white border border-zinc-200 p-3 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-[#c9ccd1]">
                {extractedProfile.name && (
                  <p>
                    <span className="text-zinc-500 dark:text-[#8a8f98]">Candidate:</span>{' '}
                    <strong className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">{extractedProfile.name}</strong>
                  </p>
                )}
                <p>
                  <span className="text-zinc-500 dark:text-[#8a8f98]">Best-fit role:</span>{' '}
                  <strong className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">{extractedProfile.extracted_title}</strong>
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-[#8a8f98]">Experience level:</span>{' '}
                  <strong className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">
                    {(extractedProfile.experience_years ?? 0) <= 1
                      ? 'Entry level (~1 year)'
                      : `~${extractedProfile.experience_years} years`}
                  </strong>
                </p>
                {extractedProfile.preferred_locations && extractedProfile.preferred_locations.length > 0 && (
                  <p>
                    <span className="text-zinc-500 dark:text-[#8a8f98]">Location:</span>{' '}
                    <strong className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">{extractedProfile.preferred_locations.join(', ')}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-600 dark:text-[#8a8f98]">Identified Skills & Craft:</p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {extractedProfile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-800 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-[#f7f8f8]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- CV review */}
          {tab === 'upgrade' && review && tone && (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.1] dark:bg-white/[0.03]">
                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2 ${tone.ring}`}
                >
                  <span className={`text-xl font-bold leading-none ${tone.text}`}>
                    {review.score}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 dark:text-[#62666d]">/100</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">{review.headline}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                    <span>
                      <strong className="text-zinc-900 dark:text-[#c9ccd1]">Do this first:</strong>{' '}
                      {review.top_priority}
                    </span>
                  </p>
                </div>
              </div>

              {/* Section grades */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {review.sections.map((s) => (
                  <div
                    key={s.label}
                    className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">{s.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-[#8a8f98]">
                        {STATUS_LABEL[s.status]} · {s.score}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-zinc-900 dark:bg-white/60"
                        style={{ width: `${Math.max(2, s.score)}%` }}
                      />
                    </div>
                    <ul className="space-y-1">
                      {s.notes.map((n, i) => (
                        <li key={i} className="text-[11px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* ATS warnings */}
              {review.ats_warnings.length > 0 && (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-amber-950 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-[#c9ccd1]">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-[#f7f8f8]">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Will trip up an applicant tracking system</span>
                  </div>
                  <ul className="space-y-1.5">
                    {review.ats_warnings.map((w, i) => (
                      <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-zinc-700 dark:text-[#c9ccd1]">
                        <span className="text-amber-500">—</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing keywords */}
              {review.missing_keywords.length > 0 && (
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">
                    Words screeners look for that aren’t here
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {review.missing_keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-800 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-[#c9ccd1]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-[#62666d]">
                    Only add the ones that are genuinely true of you — a keyword you can’t defend in
                    an interview costs more than it wins.
                  </p>
                </div>
              )}

              {/* Rewritten summary */}
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">Stronger summary</p>
                  <button
                    onClick={copySummary}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-[#c9ccd1]">{review.rewritten_summary}</p>
              </div>

              {/* Bullet rewrites */}
              {review.improved_bullets.length > 0 && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">Bullets worth rewriting</p>
                  {review.improved_bullets.map((b, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="text-[11px] leading-relaxed text-zinc-400 line-through decoration-zinc-400 dark:text-[#62666d] dark:decoration-white/20">
                        {b.before}
                      </p>
                      <p className="text-[11px] leading-relaxed text-zinc-900 font-medium dark:text-[#f7f8f8]">{b.after}</p>
                      {i < review.improved_bullets.length - 1 && (
                        <div className="pt-1.5">
                          <div className="h-px bg-zinc-200 dark:bg-white/[0.06]" />
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-[#62666d]">
                    The bracketed figures are placeholders. Fill in your real numbers — I won’t
                    invent achievements for you.
                  </p>
                </div>
              )}

              {/* Turn the review into an actual document */}
              <button
                onClick={handleRebuild}
                disabled={rebuilding}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
              >
                {rebuilding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span>Apply all of this → build my upgraded CV</span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Zap className="h-3 w-3" />
                  3 credits
                </span>
              </button>
            </div>
          )}

          {/* --------------------------------------------------- upgraded CV */}
          {tab === 'rebuilt' && upgraded && (
            <div className="space-y-4">
              {/* Before / after score */}
              {upgraded.score_after != null && (
                <div className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.1] dark:bg-white/[0.03]">
                  <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-[#f7f8f8]" />
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-3 text-sm">
                      {upgraded.score_before != null && (
                        <>
                          <span className="text-zinc-500 dark:text-[#62666d]">Was</span>
                          <span className="font-semibold text-zinc-600 dark:text-[#8a8f98]">{upgraded.score_before}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-zinc-400 dark:text-[#62666d]" />
                        </>
                      )}
                      <span className="text-zinc-500 dark:text-[#62666d]">Now</span>
                      <span className="text-lg font-bold text-zinc-900 dark:text-[#f7f8f8]">{upgraded.score_after}</span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-[#62666d]">/100</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-[#8a8f98]">
                      {scoreDelta > 0
                        ? `Up ${scoreDelta} point${scoreDelta === 1 ? '' : 's'} from restructuring alone. Filling in the bracketed placeholders is what moves it further.`
                        : 'Your CV was already well structured, so reformatting alone cannot raise the score. What is holding it back is content — the figures behind each bullet — which is why the placeholders below are left for you rather than filled in with guesses.'}
                    </p>
                  </div>
                </div>
              )}

              {/* What changed */}
              {upgraded.changes.length > 0 && (
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">What I changed</p>
                  <ul className="space-y-1.5">
                    {upgraded.changes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-zinc-700 dark:text-[#c9ccd1]">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600 dark:text-[#8a8f98]" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Placeholder nudge */}
              {upgraded.placeholders > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-white/[0.14] dark:bg-white/[0.03] dark:text-[#c9ccd1]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-[#f7f8f8]" />
                  <p className="text-[11px] leading-relaxed">
                    {upgraded.placeholders} bracketed{' '}
                    <span className="font-mono font-bold text-zinc-900 dark:text-[#f7f8f8]">[…]</span> placeholder
                    {upgraded.placeholders === 1 ? '' : 's'} left — real numbers and details only you
                    can supply. Replace every one before you send this.
                  </p>
                </div>
              )}

              {/* Segmented View Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-white/[0.08]">
                <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === 'preview'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/20 dark:text-[#f7f8f8]'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                    }`}
                  >
                    <span>📄 Executive Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === 'edit'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/20 dark:text-[#f7f8f8]'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
                    }`}
                  >
                    <span>✏️ Plaintext Editor</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={copyCv}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {cvCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{cvCopied ? 'Copied text' : 'Copy text'}</span>
                  </button>
                </div>
              </div>

              {/* Rebuilt View: Preview vs Edit */}
              {viewMode === 'preview' ? (
                <div className="custom-scrollbar max-h-[65vh] overflow-y-auto rounded-2xl bg-zinc-100/70 p-2 sm:p-5 dark:bg-white/[0.03]">
                  <ExecutiveResumePreview text={upgraded.text} />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Manual edit instructions */}
                  <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">
                      <PenLine className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Tell me what to change</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editInstruction}
                        onChange={(e) => { setEditInstruction(e.target.value); setEditFeedback(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !editing && editInstruction.trim()) handleManualEdit(); }}
                        placeholder='e.g. "add Sketch to skills", "change title to Lead Designer", "remove Bamdalas Graphics experience"'
                        className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-900 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                      />
                      <button
                        onClick={handleManualEdit}
                        disabled={editing || !editInstruction.trim()}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.09]"
                      >
                        {editing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Apply
                      </button>
                    </div>
                    {editFeedback && (
                      <p className={`text-[11px] leading-relaxed ${editFeedback.success ? 'text-zinc-700 dark:text-[#c9ccd1]' : 'text-rose-600 dark:text-[#f7f8f8]'}`}>
                        {editFeedback.success ? <Check className="mr-1 inline h-3 w-3 text-emerald-600" /> : <AlertTriangle className="mr-1 inline h-3 w-3" />}
                        {editFeedback.message}
                      </p>
                    )}
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-[#62666d]">
                      Add skills, change your title, remove sections, add certifications, or replace text.
                      You can also edit the CV directly in the text box below.
                    </p>
                  </div>

                  {/* The document itself, editable */}
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                        Your upgraded CV
                      </label>
                      <button
                        onClick={copyCv}
                        className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                      >
                        {cvCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {cvCopied ? 'Copied' : 'Copy text'}
                      </button>
                    </div>
                    <textarea
                      rows={16}
                      value={upgraded.text}
                      onChange={(e) => setUpgraded({ ...upgraded, text: e.target.value })}
                      onBlur={persistEdits}
                      className="custom-scrollbar w-full resize-none rounded-2xl border border-zinc-300 bg-white p-4 font-mono text-[11px] leading-relaxed text-zinc-900 transition focus:border-zinc-900 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:focus:border-white/25"
                    />
                    {savedNote && <p className="mt-2 text-[11px] text-zinc-500 dark:text-[#62666d]">{savedNote}</p>}
                  </div>
                </div>
              )}

              {/* Downloads — the formats employers actually ask for */}
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">Download</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportCv('pdf')}
                    disabled={exporting !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.09]"
                  >
                    {exporting === 'pdf' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </button>
                  <button
                    onClick={() => exportCv('docx')}
                    disabled={exporting !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.09]"
                  >
                    {exporting === 'docx' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileType2 className="h-3.5 w-3.5" />
                    )}
                    Word (.docx)
                  </button>
                  <button
                    onClick={() => exportCv('html')}
                    disabled={exporting !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.09]"
                  >
                    {exporting === 'html' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                    HTML
                  </button>
                  <button
                    onClick={() => download('upgraded-cv.txt', upgraded.text)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#c9ccd1] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .txt
                  </button>
                  <button
                    onClick={() => download('upgraded-cv.md', toMarkdown(upgraded.text))}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#c9ccd1] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .md
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-[#62666d]">
                  PDF for applying by email, Word if the employer asks for an editable file, HTML for executive visual layout, plain text for pasting into application forms. All single-column, so parsers read them in the right order.
                </p>
              </div>

              {/* Adopt it: the rebuilt text becomes the CV everything else works from */}
              <button
                onClick={handleAdopt}
                disabled={reviewing || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.09]"
              >
                {reviewing || loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
                <span>Use this as my CV — re-score it and match roles from it</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-zinc-50 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <button
            onClick={handleUpgrade}
            disabled={resumeText.trim().length < 40 || reviewing}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.09]"
          >
            {reviewing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            )}
            <span>{review ? 'Re-run review' : 'Upgrade my CV'}</span>
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-500 dark:text-[#8a8f98]">
              (2 cr)
            </span>
          </button>

          <button
            onClick={handleApplyMatch}
            disabled={!extractedProfile}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <span>Search matching roles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
