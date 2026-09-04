'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Briefcase, MapPin, ExternalLink, Zap, Coins } from 'lucide-react';
import { JobListing, SavedJob } from '@/types/job';
import { TailorPitchModal } from '@/components/Tailor/TailorPitchModal';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const DEFAULT_SAMPLE_JOB: JobListing = {
  id: 'tailor-sample-1',
  title: 'Senior Full-Stack Engineer',
  company: 'TechCorp Global',
  location: 'Remote / Global',
  is_remote: true,
  job_type: 'Full-time',
  experience_level: 'Senior',
  salary_formatted: '$130k - $175k',
  description: 'Building high-scale web applications, AI workflows, and resilient cloud architectures.',
  apply_url: 'https://linkedin.com',
  tags: ['React', 'TypeScript', 'Node.js', 'Next.js', 'PostgreSQL'],
  source: 'Remotive',
  posted_at: new Date().toISOString(),
};

function TailorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, credits, requireAuth, openCreditModal } = useAuth();

  const [activeJob, setActiveJob] = useState<JobListing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);

  // Safely resolve job from URL params, localStorage, or fallback
  useEffect(() => {
    try {
      const paramId = searchParams.get('id');
      const paramTitle = searchParams.get('title');
      const paramCompany = searchParams.get('company');

      if (paramTitle && paramCompany) {
        setActiveJob({
          id: paramId || `job-${Date.now()}`,
          title: paramTitle,
          company: paramCompany,
          location: searchParams.get('location') || 'Remote',
          is_remote: searchParams.get('remote') === 'true',
          job_type: 'Full-time',
          salary_formatted: searchParams.get('salary') || undefined,
          description: searchParams.get('description') || '',
          apply_url: searchParams.get('url') || 'https://linkedin.com',
          tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : ['Full Stack', 'Engineering'],
          source: 'Remotive',
          posted_at: new Date().toISOString(),
        });
        return;
      }

      // Check active tailor job in localStorage
      const storedActive = localStorage.getItem('career_bot_active_tailor_job');
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (parsed && parsed.title && parsed.company) {
          if (!paramId || parsed.id === paramId) {
            setActiveJob(parsed);
            return;
          }
        }
      }

      // Check saved jobs in localStorage if an id was provided
      if (paramId) {
        const storedSaved = localStorage.getItem('career_bot_saved_jobs');
        if (storedSaved) {
          const savedList: SavedJob[] = JSON.parse(storedSaved);
          const match = savedList.find((j) => j.id === paramId);
          if (match) {
            setActiveJob(match);
            return;
          }
        }
      }

      // Check if any saved job exists
      const storedSaved = localStorage.getItem('career_bot_saved_jobs');
      if (storedSaved) {
        const savedList: SavedJob[] = JSON.parse(storedSaved);
        if (savedList.length > 0 && savedList[0].title) {
          setActiveJob(savedList[0]);
          return;
        }
      }

      // Fallback to sample job
      setActiveJob(DEFAULT_SAMPLE_JOB);
    } catch {
      setActiveJob(DEFAULT_SAMPLE_JOB);
    }
  }, [searchParams]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#08090a] text-zinc-900 dark:text-[#f7f8f8] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#08090a]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-[#8a8f98] hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-[#f7f8f8] transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-[#f7f8f8] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Tailor Pitch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreditModal}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>{credits} coins</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {activeJob && (
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  Active Role
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#f7f8f8]">
                  {activeJob.title}
                </h1>
                <p className="text-sm font-medium text-zinc-600 dark:text-[#8a8f98] mt-1 flex items-center gap-2">
                  <span>{activeJob.company}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {activeJob.location}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                <span>Open Pitch Generator</span>
              </button>
            </div>

            {activeJob.tags && activeJob.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 pt-4 border-t border-zinc-200 dark:border-white/[0.06]">
                {activeJob.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-white dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Render the Pitch Modal */}
      {activeJob && isModalOpen && (
        <TailorPitchModal
          job={activeJob}
          onClose={() => {
            setIsModalOpen(false);
            handleBack();
          }}
        />
      )}
    </div>
  );
}

export default function TailorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#08090a] text-zinc-500 dark:text-[#8a8f98]">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Loading Tailor Pitch...</span>
          </div>
        </div>
      }
    >
      <TailorContent />
    </Suspense>
  );
}
