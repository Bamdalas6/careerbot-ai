'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  FileText,
  SlidersHorizontal,
  Trash2,
  Zap,
  History,
  LogOut,
  Plus,
  ChevronDown,
  Briefcase,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

interface GlassHeaderProps {
  currentView: 'home' | 'chat';
  onViewChange: (view: 'home' | 'chat') => void;
  savedCount: number;
  onOpenSaved: () => void;
  onOpenTracker?: () => void;
  onOpenResume: () => void;
  onOpenFilters: () => void;
  onClearChat: () => void;
  onOpenHistory?: () => void;
}

const NAV_LINKS = [
  { label: 'Facts', href: '#facts' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Get started', href: '#start' },
];

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  currentView,
  onViewChange,
  savedCount,
  onOpenSaved,
  onOpenTracker,
  onOpenResume,
  onOpenFilters,
  onClearChat,
  onOpenHistory,
}) => {
  const { user, credits, isAuthenticated, openAuthModal, openCreditModal, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="glass-header sticky top-0 z-40 w-full transition-colors duration-200">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3.5 sm:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3 sm:gap-7">
          <button
            type="button"
            onClick={() => {
              onViewChange('home');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 text-left"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="h-[18px] w-[18px] text-zinc-900 dark:text-[#f7f8f8]"
            >
              <path
                fill="currentColor"
                d="M8 0a8 8 0 1 0 8 8h-2.4A5.6 5.6 0 1 1 8 2.4V0Z"
              />
              <circle cx="8" cy="8" r="2.6" fill="currentColor" />
            </svg>
            <span className="text-[14px] font-semibold tracking-tight text-zinc-900 dark:text-[#f7f8f8]">
              CareerBot
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Desktop Navigation Actions */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-black/[0.03] text-zinc-600 transition hover:bg-black/[0.06] hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:bg-white/[0.08] dark:hover:text-[#f7f8f8]"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>

          {/* History button */}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
              title="Search and CV History"
            >
              <History className="h-3.5 w-3.5" />
              <span>History</span>
            </button>
          )}

          {/* Resume button */}
          <button
            type="button"
            onClick={onOpenResume}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Resume</span>
          </button>

          {/* Saved Jobs button */}
          <button
            type="button"
            onClick={onOpenSaved}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full border border-black/10 bg-black/[0.06] px-1 text-[10px] font-bold text-zinc-900 dark:border-white/10 dark:bg-white/[0.07] dark:text-[#f7f8f8]">
                {savedCount}
              </span>
            )}
          </button>

          {/* Tracker button */}
          {onOpenTracker && (
            <button
              type="button"
              onClick={onOpenTracker}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
              title="Job Application Tracker & Pipeline"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Tracker</span>
            </button>
          )}

          {/* Credits Counter Badge */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={openCreditModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-900 transition hover:border-black/20 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
              title="Click to top up credits"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>{credits}</span>
              <span className="text-[10px] text-zinc-500 dark:text-[#8a8f98]">credits</span>
              <Plus className="h-3 w-3 text-zinc-400 dark:text-[#8a8f98] ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreditModal}
              className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1 text-xs text-zinc-600 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Credits</span>
            </button>
          )}

          {/* User Profile / Sign In */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] p-1 pr-2 transition hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-white dark:text-black">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-[#8a8f98]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 dark:border-white/[0.1] dark:bg-[#0c0c0c]">
                  <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-white/[0.08]">
                    <p className="truncate text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">{user.name}</p>
                    <p className="truncate text-[11px] text-zinc-500 dark:text-[#8a8f98]">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-50 p-1.5 px-2 dark:bg-white/[0.04]">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-[#8a8f98]">Balance</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{credits} Credits</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        openCreditModal();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:text-[#f7f8f8] dark:hover:bg-white/[0.06]"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>Top Up Credits</span>
                    </button>
                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenHistory();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:text-[#f7f8f8] dark:hover:bg-white/[0.06]"
                      >
                        <History className="h-3.5 w-3.5 text-zinc-500 dark:text-[#8a8f98]" />
                        <span>Search History</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-zinc-100 pt-1 dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-rose-400"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="btn-light rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs"
            >
              Sign in
            </button>
          )}

          {/* View toggle / Actions in Chat mode */}
          {currentView === 'chat' ? (
            <>
              <button
                type="button"
                onClick={onOpenFilters}
                className="rounded-md p-1.5 text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                title="Search preferences"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onClearChat}
                className="rounded-md p-1.5 text-zinc-600 transition hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onViewChange('home')}
                className="glass-chip ml-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]"
              >
                Back
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onViewChange('chat')}
              className="btn-light ml-0.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs"
            >
              Search
            </button>
          )}
        </div>

        {/* Mobile Header Quick Actions */}
        <div className="flex md:hidden items-center gap-1.5">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-black/[0.03] text-zinc-600 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
          </button>

          {/* Mobile Tracker quick icon */}
          {onOpenTracker && (
            <button
              type="button"
              onClick={onOpenTracker}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-black/[0.03] text-zinc-600 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
              title="Job Tracker"
            >
              <Briefcase className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Mobile Saved quick icon */}
          <button
            type="button"
            onClick={onOpenSaved}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-black/[0.03] text-zinc-600 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
            title="Saved Jobs"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white px-0.5 dark:bg-white dark:text-black">
                {savedCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-black/[0.04] text-zinc-900 transition dark:border-white/10 dark:bg-white/[0.05] dark:text-[#f7f8f8]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-black/10 bg-white/98 backdrop-blur-2xl px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 dark:border-white/[0.08] dark:bg-[#0c0c0d]/98">
          {/* User Info / Sign In */}
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between rounded-xl border border-black/10 bg-zinc-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-black">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8] truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-[#8a8f98] truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCreditModal();
                }}
                className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]"
              >
                <Zap className="h-3 w-3 text-amber-500" />
                <span>{credits}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthModal('login');
              }}
              className="w-full btn-light rounded-xl py-2.5 text-xs font-semibold text-center shadow-xs"
            >
              Sign In or Create Account
            </button>
          )}

          {/* Navigation Links Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onViewChange(currentView === 'home' ? 'chat' : 'home');
              }}
              className="flex items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 p-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:hover:bg-white/[0.06]"
            >
              <span>{currentView === 'home' ? '🔍 Search Jobs' : '🏠 Home Page'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenResume();
              }}
              className="flex items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 p-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:hover:bg-white/[0.06]"
            >
              <FileText className="h-3.5 w-3.5 text-zinc-500 dark:text-[#8a8f98]" />
              <span>Resume Parser</span>
            </button>

            {onOpenTracker && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTracker();
                }}
                className="flex items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 p-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:hover:bg-white/[0.06]"
              >
                <Briefcase className="h-3.5 w-3.5 text-zinc-500 dark:text-[#8a8f98]" />
                <span>Job Tracker</span>
              </button>
            )}

            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenHistory();
                }}
                className="flex items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 p-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#f7f8f8] dark:hover:bg-white/[0.06]"
              >
                <History className="h-3.5 w-3.5 text-zinc-500 dark:text-[#8a8f98]" />
                <span>History</span>
              </button>
            )}
          </div>

          {/* Theme & Sign Out Row */}
          <div className="flex items-center justify-between border-t border-black/10 dark:border-white/[0.08] pt-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] transition"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
              <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
