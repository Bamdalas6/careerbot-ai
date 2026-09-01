'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassHeader } from '@/components/Hero/GlassHeader';
import { OrbHero } from '@/components/Hero/OrbHero';
import { FactsSection } from '@/components/Sections/FactsSection';
import { CapabilitiesSection } from '@/components/Sections/CapabilitiesSection';
import { ClosingCTA } from '@/components/Sections/ClosingCTA';
import { SiteFooter } from '@/components/Sections/SiteFooter';

import { ChatInterface } from '@/components/Chat/ChatInterface';
import { TailorPitchModal } from '@/components/Tailor/TailorPitchModal';
import { ResumeModal } from '@/components/Resume/ResumeModal';
import { SavedJobsDrawer } from '@/components/Saved/SavedJobsDrawer';
import { ApplicationTracker } from '@/components/Tracker/ApplicationTracker';
import { FollowUpBanner } from '@/components/Tracker/FollowUpBanner';
import { FilterDrawer } from '@/components/Filters/FilterDrawer';
import { HistoryDrawer } from '@/components/History/HistoryDrawer';
import { QuickScrollPill } from '@/components/Navigation/QuickScrollPill';
import { ChatMessage, JobListing, SavedJob, ResumeProfile } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';

export default function Home() {
  const { user, credits, requireAuth, updateCredits, openCreditModal } = useAuth();

  const [currentView, setCurrentView] = useState<'home' | 'chat'>('home');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('career_bot_saved_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Modals & Drawers state
  const [activeTailorJob, setActiveTailorJob] = useState<JobListing | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [dueFollowUps, setDueFollowUps] = useState<Array<{
    id: string;
    company: string;
    jobTitle: string;
    daysSince: number;
    followUpCount: number;
  }>>([]);

  const fetchDueFollowUps = useCallback(async () => {
    if (!user) {
      setDueFollowUps([]);
      return;
    }
    try {
      const res = await fetch('/api/applications?due=1');
      const data = await res.json();
      if (data.success && Array.isArray(data.applications)) {
        const nowMs = Date.now();
        const mapped = data.applications.map(
          (app: {
            id: string;
            applied_at?: string;
            job?: { company?: string; title?: string };
            follow_up_count?: number;
          }) => {
            const daysSince = app.applied_at
              ? Math.max(1, Math.floor((nowMs - new Date(app.applied_at).getTime()) / 86400000))
              : 7;
            return {
              id: app.id,
              company: app.job?.company || 'Company',
              jobTitle: app.job?.title || 'Role',
              daysSince,
              followUpCount: app.follow_up_count || 0,
            };
          }
        );
        setDueFollowUps(mapped);
      }
    } catch {
      /* silent */
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) {
      return;
    }
    fetch('/api/applications?due=1')
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data.success || !Array.isArray(data.applications)) return;
        const nowMs = Date.now();
        const mapped = data.applications.map(
          (app: {
            id: string;
            applied_at?: string;
            job?: { company?: string; title?: string };
            follow_up_count?: number;
          }) => {
            const daysSince = app.applied_at
              ? Math.max(1, Math.floor((nowMs - new Date(app.applied_at).getTime()) / 86400000))
              : 7;
            return {
              id: app.id,
              company: app.job?.company || 'Company',
              jobTitle: app.job?.title || 'Role',
              daysSince,
              followUpCount: app.follow_up_count || 0,
            };
          }
        );
        setDueFollowUps(mapped);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user]);

  // Global keyboard shortcut: ⌘K / Ctrl+K jumps into the chat search from anywhere
  useEffect(() => {
    if (currentView === 'home') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCurrentView('chat');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  // Sync saved jobs to localStorage
  const updateSavedJobs = (newJobs: SavedJob[]) => {
    setSavedJobs(newJobs);
    try {
      localStorage.setItem('career_bot_saved_jobs', JSON.stringify(newJobs));
    } catch (err) {
      console.error('Error saving jobs to storage:', err);
    }
  };

  const handleToggleSave = (job: JobListing) => {
    if (!requireAuth()) return;

    const exists = savedJobs.some((j) => j.id === job.id);
    if (exists) {
      updateSavedJobs(savedJobs.filter((j) => j.id !== job.id));
    } else {
      const newSaved: SavedJob = {
        ...job,
        saved_at: new Date().toISOString(),
        status: 'saved',
      };
      updateSavedJobs([newSaved, ...savedJobs]);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#f7f8f8', '#8a8f98', '#62666d'],
      });
    }
  };

  const handleRemoveSaved = (jobId: string) => {
    updateSavedJobs(savedJobs.filter((j) => j.id !== jobId));
  };

  const handleUpdateStatus = (jobId: string, status: SavedJob['status']) => {
    updateSavedJobs(
      savedJobs.map((j) => (j.id === jobId ? { ...j, status } : j))
    );
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  // Helper to persist chat session to history
  const persistChatHistory = useCallback(
    async (updatedMessages: ChatMessage[], existingChatId: string | null) => {
      if (!user || updatedMessages.length === 0) return;
      try {
        const firstUserMessage = updatedMessages.find((m) => m.role === 'user')?.content || 'Job Search';
        const title = firstUserMessage.length > 38 ? `${firstUserMessage.slice(0, 38)}...` : firstUserMessage;

        const res = await fetch('/api/history/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingChatId || undefined,
            title,
            messages: updatedMessages,
          }),
        });
        const data = await res.json();
        if (data.success && data.chat?.id) {
          setCurrentChatId(data.chat.id);
        }
      } catch (err) {
        console.error('Failed to auto-save chat history:', err);
      }
    },
    [user]
  );

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check Authentication
    if (!requireAuth()) {
      return;
    }

    // Check Credits
    if (credits < 1) {
      openCreditModal();
      return;
    }

    // Switch to chat view if not already there
    setCurrentView('chat');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const json = await res.json();

      if (res.status === 401) {
        requireAuth();
        setIsLoading(false);
        return;
      }

      if (res.status === 402 || json.error === 'INSUFFICIENT_CREDITS') {
        openCreditModal();
        const errorMessage: ChatMessage = {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: `You have exhausted your credits. Please top up your balance to continue live job searches.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([...newMessages, errorMessage]);
        setIsLoading(false);
        return;
      }

      if (json.success && json.data) {
        if (json.remainingCredits != null) {
          updateCredits(json.remainingCredits);
        }

        const assistantMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: json.data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          jobs: json.data.jobs,
          suggested_queries: json.data.suggested_queries,
          extracted_filters: json.data.extracted_filters,
        };

        const finalMessages = [...newMessages, assistantMessage];
        setMessages(finalMessages);

        // Auto-save chat history to backend
        persistChatHistory(finalMessages, currentChatId);
      } else {
        throw new Error(json.error || 'Failed to fetch jobs');
      }
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue fetching live job listings. Please check your network connection or try a different search keyword.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsedSkills = (profile: ResumeProfile, autoSearchQuery: string) => {
    handleSendMessage(autoSearchQuery);
  };

  const handleSelectChat = (chat: { id: string; messages: ChatMessage[] }) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setCurrentView('chat');
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setCurrentView('chat');
  };

  const handleOpenResume = () => {
    setIsResumeOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-[#f7f8f8] selection:bg-white/20 selection:text-white">
      {/* Glassy sticky header */}
      <GlassHeader
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        savedCount={savedJobs.length}
        onOpenSaved={() => setIsSavedOpen(true)}
        onOpenTracker={() => {
          if (requireAuth()) setIsTrackerOpen(true);
        }}
        onOpenResume={handleOpenResume}
        onOpenFilters={() => setIsFiltersOpen(true)}
        onClearChat={handleClearChat}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Follow-up reminder alert banner */}
      {dueFollowUps.length > 0 && (
        <div className="py-3">
          <FollowUpBanner
            items={dueFollowUps}
            onGenerateEmail={() => {
              if (requireAuth()) setIsTrackerOpen(true);
            }}
            onDismiss={(id) => {
              setDueFollowUps((prev) => prev.filter((item) => item.id !== id));
            }}
            onDismissAll={() => setDueFollowUps([])}
            onOpenTracker={() => {
              if (requireAuth()) setIsTrackerOpen(true);
            }}
          />
        </div>
      )}

      {/* Main Content Area */}
      {currentView === 'home' ? (
        <main className="flex flex-1 flex-col">
          <OrbHero onSearch={handleSendMessage} isLoading={isLoading} />
          <FactsSection />
          <CapabilitiesSection />
          <ClosingCTA
            onStartSearch={() => {
              if (requireAuth()) setCurrentView('chat');
            }}
            onOpenResume={handleOpenResume}
          />
          <SiteFooter
            onStartSearch={() => {
              if (requireAuth()) setCurrentView('chat');
            }}
            onOpenResume={handleOpenResume}
            onOpenSaved={() => setIsSavedOpen(true)}
          />
        </main>
      ) : (
        <main className="flex flex-1 flex-col">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            savedJobs={savedJobs}
            onToggleSave={handleToggleSave}
            onOpenTailor={(job) => {
              if (requireAuth()) setActiveTailorJob(job);
            }}
          />
        </main>
      )}

      {/* 1-Click Tailor Pitch Modal */}
      <TailorPitchModal
        job={activeTailorJob}
        onClose={() => setActiveTailorJob(null)}
      />

      {/* Resume Parser Modal */}
      <ResumeModal
        isOpen={isResumeOpen}
        onClose={() => setIsResumeOpen(false)}
        onParsedSkills={handleParsedSkills}
      />

      {/* Saved Jobs Drawer */}
      <SavedJobsDrawer
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        savedJobs={savedJobs}
        onRemoveSaved={handleRemoveSaved}
        onUpdateStatus={handleUpdateStatus}
        onOpenTracker={() => {
          if (requireAuth()) setIsTrackerOpen(true);
        }}
      />

      {/* Full Application Tracker & Pipeline Kanban */}
      <ApplicationTracker
        isOpen={isTrackerOpen}
        onClose={() => {
          setIsTrackerOpen(false);
          fetchDueFollowUps();
        }}
        localSavedJobs={savedJobs}
        onClearLocalSaved={() => updateSavedJobs([])}
      />

      {/* Search Preferences Drawer */}
      <FilterDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        onApplyFilters={(filterPrompt) => handleSendMessage(filterPrompt)}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      {/* Floating Quick Navigation to Top / Bottom */}
      <QuickScrollPill />
    </div>
  );
}
