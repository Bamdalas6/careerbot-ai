'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, FileText, Sparkles, Loader2, CheckCircle2, ArrowRight, UploadCloud,
  AlertTriangle, Copy, Check, RotateCcw, Target, Download, TrendingUp, Wand2,
  FileType2, Zap, PenLine, Send,
} from 'lucide-react';
import { CVReview, ResumeProfile, UpgradedCV } from '@/types/job';
import { useAuth } from '@/context/AuthContext';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedSkills: (profile: ResumeProfile, autoSearchQuery: string) => void;
}

const SAMPLE_RESUMES = [
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
];

const ACCEPT = '.txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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

type TabId = 'match' | 'upgrade' | 'rebuilt';

const TABS: { id: TabId; label: string }[] = [
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
    return parsed?.text ? parsed : null;
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
  const [review, setReview] = useState<CVReview | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'match' | 'upgrade' | 'rebuilt'>('match');

  // The rebuilt document, restored from the last session if there was one.
  const [upgraded, setUpgraded] = useState<StoredCV | null>(readStoredCV);
  const [rebuilding, setRebuilding] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [cvCopied, setCvCopied] = useState(false);

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
      setFileName(file.name);
      setLoading(true);

      try {
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
    const query = `${extractedProfile.extracted_title || 'Software Engineer'} ${extractedProfile.skills
      .slice(0, 3)
      .join(' ')}`;
    onParsedSkills(extractedProfile, `Find ${query} roles matching my resume skills`);
    handleClose();
  };

  const handleSelectSample = (sampleText: string) => {
    setResumeText(sampleText);
    setExtractedProfile(null);
    setReview(null);
    setFileName(null);
    setError(null);
    setTab(upgraded ? 'rebuilt' : 'match');
  };

  const handleReset = () => {
    setResumeText('');
    setFileName(null);
    setExtractedProfile(null);
    setReview(null);
    setError(null);
    // Clearing the working text doesn't throw away a CV they had built.
    setTab(upgraded ? 'rebuilt' : 'match');
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
   * PDF and Word are rendered server-side from whatever is in the box right now,
   * so hand edits make it into the downloaded file.
   */
  const exportCv = async (format: 'pdf' | 'docx') => {
    if (!upgraded) return;
    setExporting(format);
    setError(null);
    try {
      const res = await fetch('/api/resume/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: upgraded.text, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Could not generate the ${format.toUpperCase()} file.`);
        return;
      }
      const blob = await res.blob();
      saveBlob(filenameFrom(res.headers.get('Content-Disposition'), `upgraded-cv.${format}`), blob);
    } catch {
      setError(`Network error while generating the ${format === 'pdf' ? 'PDF' : 'Word document'}. Try again.`);
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
      <div className="relative flex max-h-[95vh] sm:max-h-[90vh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.08] dark:bg-[#0a0a0a] dark:text-[#f7f8f8]">
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
        {(extractedProfile || review || upgraded) && (
          <div className="flex gap-1 border-b border-black/10 bg-zinc-50/50 px-4 sm:px-6 overflow-x-auto flex-nowrap dark:border-white/[0.08] dark:bg-white/[0.02]">
            {TABS.filter((t) =>
              t.id === 'match' ? !!extractedProfile : t.id === 'upgrade' ? !!review : !!upgraded
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
                  <strong className="text-zinc-900 font-semibold dark:text-[#f7f8f8]">~{extractedProfile.experience_years}+ years</strong>
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
                  PDF for applying by email, Word if the employer asks for an editable file, plain
                  text for pasting into application forms. All three are single-column, so parsers
                  read them in the right order.
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
