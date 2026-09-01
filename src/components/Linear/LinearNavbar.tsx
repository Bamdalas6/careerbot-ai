'use client';

import React from 'react';
import { 
  Sparkles, 
  Bookmark, 
  FileText, 
  SlidersHorizontal, 
  Trash2, 
  MessageSquare, 
  Compass, 
  Search,
  Zap,
  ArrowRight
} from 'lucide-react';
import { SavedJob } from '@/types/job';

interface LinearNavbarProps {
  currentView: 'home' | 'chat';
  onViewChange: (view: 'home' | 'chat') => void;
  savedJobs: SavedJob[];
  onOpenSaved: () => void;
  onOpenResume: () => void;
  onOpenFilters: () => void;
  onClearChat: () => void;
  onQuickSearch?: () => void;
}

export const LinearNavbar: React.FC<LinearNavbarProps> = ({
  currentView,
  onViewChange,
  savedJobs,
  onOpenSaved,
  onOpenResume,
  onOpenFilters,
  onClearChat,
  onQuickSearch,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#08090a]/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#5e6ad2] to-[#8a99f8] shadow-[0_0_12px_rgba(94,106,210,0.4)] transition-transform group-hover:scale-105">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white font-mono">
                CareerBot
              </span>
              <span className="hidden sm:inline-block rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                v2.0
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs text-zinc-400 font-medium">
            <button
              type="button"
              onClick={() => onViewChange('home')}
              className={`rounded-lg px-3 py-1.5 transition ${
                currentView === 'home'
                  ? 'text-white bg-white/[0.06]'
                  : 'hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              Overview
            </button>
            <a
              href="#features"
              onClick={(e) => {
                if (currentView !== 'home') onViewChange('home');
              }}
              className="rounded-lg px-3 py-1.5 transition hover:text-white hover:bg-white/[0.03]"
            >
              Features
            </a>
            <a
              href="#companies"
              onClick={(e) => {
                if (currentView !== 'home') onViewChange('home');
              }}
              className="rounded-lg px-3 py-1.5 transition hover:text-white hover:bg-white/[0.03]"
            >
              Companies
            </a>
            <a
              href="#matcher"
              onClick={(e) => {
                if (currentView !== 'home') onViewChange('home');
              }}
              className="rounded-lg px-3 py-1.5 transition hover:text-white hover:bg-white/[0.03]"
            >
              Salary Matcher
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                if (currentView !== 'home') onViewChange('home');
              }}
              className="rounded-lg px-3 py-1.5 transition hover:text-white hover:bg-white/[0.03]"
            >
              FAQ
            </a>
          </nav>
        </div>

        {/* Center: View Switcher (Home vs Bot) */}
        <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => onViewChange('home')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              currentView === 'home'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange('chat')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              currentView === 'chat'
                ? 'bg-[#5e6ad2] text-white shadow-[0_0_10px_rgba(94,106,210,0.5)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>AI Search Bot</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenResume}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
            title="Drop or paste resume to match"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            className="relative flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
            title="Saved Opportunities"
          >
            <Bookmark className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">Saved</span>
            {savedJobs.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5e6ad2] px-1 text-[10px] font-bold text-white">
                {savedJobs.length}
              </span>
            )}
          </button>

          {currentView === 'chat' && (
            <button
              type="button"
              onClick={onClearChat}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-zinc-400 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-red-400"
              title="Clear Conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {currentView === 'home' && (
            <button
              type="button"
              onClick={() => onViewChange('chat')}
              className="linear-button-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.02]"
            >
              <span>Search Jobs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
