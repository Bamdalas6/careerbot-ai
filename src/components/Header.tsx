'use client';

import React from 'react';
import { Sparkles, Bookmark, FileText, SlidersHorizontal, Trash2 } from 'lucide-react';
import { SavedJob } from '@/types/job';

interface HeaderProps {
  savedJobs: SavedJob[];
  onOpenSaved: () => void;
  onOpenResume: () => void;
  onOpenFilters: () => void;
  onClearChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  savedJobs,
  onOpenSaved,
  onOpenResume,
  onOpenFilters,
  onClearChat,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 shadow-lg shadow-indigo-500/20">
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold tracking-tight text-white sm:text-lg">CareerBot AI</h1>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              Live Sourcing
            </span>
          </div>
          <p className="hidden text-xs text-zinc-400 sm:block">
            Direct career page deep-linking & AI-matched tech roles
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          title="Filter Preferences"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preferences</span>
        </button>

        <button
          onClick={onOpenResume}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          title="Upload / Paste Resume"
        >
          <FileText className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Resume Match</span>
        </button>

        <button
          onClick={onOpenSaved}
          className="relative flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          title="Saved Jobs"
        >
          <Bookmark className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Saved</span>
          {savedJobs.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-zinc-950">
              {savedJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={onClearChat}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-red-400"
          title="Clear Conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
