'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from '@/components/App/AppHeader';
import { WelcomeCollageHero } from '@/components/App/WelcomeCollageHero';
import { DiscoveryFeed } from '@/components/App/DiscoveryFeed';
import { BottomNavDock, type AppNavTab } from '@/components/App/BottomNavDock';
import { JobRequestModal } from '@/components/App/JobRequestModal';
import { JobDetailsModal } from '@/components/App/JobDetailsModal';

import { ChatInterface } from '@/components/Chat/ChatInterface';
import { TailorPitchModal } from '@/components/Tailor/TailorPitchModal';
import { ResumeModal } from '@/components/Resume/ResumeModal';
import { OnboardingVideoModal } from '@/components/Modals/OnboardingVideoModal';
import { SavedJobsDrawer } from '@/components/Saved/SavedJobsDrawer';
import { ApplicationTracker } from '@/components/Tracker/ApplicationTracker';
import { FollowUpBanner } from '@/components/Tracker/FollowUpBanner';
import { FilterDrawer } from '@/components/Filters/FilterDrawer';
import { HistoryDrawer } from '@/components/History/HistoryDrawer';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { QuickScrollPill } from '@/components/Navigation/QuickScrollPill';
import { ChatMessage, JobListing, SavedJob, ResumeProfile } from '@/types/job';
import { COMMUNITY_JOBS } from '@/data/community-jobs';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

export default function Home() {
  const { user, credits, requireAuth, updateCredits, openCreditModal, openAuthModal } = useAuth();

  // Primary view state: 'welcome' (Screen 1) | 'feed' (Screen 2) | 'chat' (AI Agent)
  const [currentView, setCurrentView] = useState<'welcome' | 'feed' | 'chat'>(() => {
    if (typeof window !== 'undefined') {
      const hasStarted = localStorage.getItem('careerbot_has_started');
      if (hasStarted === 'true') return 'feed';
    }
    return 'welcome';
  });

  const [currentLocation, setCurrentLocation] = useState<string>('Lagos, Nigeria');
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
  const [activeNavTab, setActiveNavTab] = useState<AppNavTab>('home');
  const [userCvProfile, setUserCvProfile] = useState<ResumeProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('careerbot_user_cv');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modals & Drawers state
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobListing | null>(null);
  const [activeTailorJob, setActiveTailorJob] = useState<JobListing | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJobRequestOpen, setIsJobRequestOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isOnboardingVideoOpen, setIsOnboardingVideoOpen] = useState(false);
  const [dueFollowUps, setDueFollowUps] = useState<Array<{
    id: string;
    company: string;
    jobTitle: string;
    daysSince: number;
    followUpCount: number;
  }>>([]);

  // When users sign out, take them directly to the splash screen ('welcome')
  useEffect(() => {
    const handleSignOutTransition = () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('careerbot_has_started');
      }
      setCurrentView('welcome');
      setIsSettingsOpen(false);
      setIsResumeOpen(false);
      setIsSavedOpen(false);
      setIsFiltersOpen(false);
      setIsHistoryOpen(false);
      setIsJobRequestOpen(false);
      setIsTrackerOpen(false);
      setActiveTailorJob(null);
      setSelectedJobForDetails(null);
      setMessages([]);
      setCurrentChatId(null);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    window.addEventListener('careerbot_logout', handleSignOutTransition);
    return () => window.removeEventListener('careerbot_logout', handleSignOutTransition);
  }, []);

  const prevUserRef = React.useRef(user);
  useEffect(() => {
    // Transition to splash screen when user transitions from logged in to logged out
    if (prevUserRef.current && !user) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('careerbot_has_started');
      }
      setCurrentView('welcome');
      setIsSettingsOpen(false);
      setIsResumeOpen(false);
      setIsSavedOpen(false);
      setIsFiltersOpen(false);
      setIsHistoryOpen(false);
      setIsJobRequestOpen(false);
      setIsTrackerOpen(false);
      setActiveTailorJob(null);
      setSelectedJobForDetails(null);
      setMessages([]);
      setCurrentChatId(null);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    prevUserRef.current = user;
  }, [user]);

  const savedJobIds = useMemo(() => new Set(savedJobs.map((j) => j.id)), [savedJobs]);

  const updateSavedJobs = (newJobs: SavedJob[]) => {
    setSavedJobs(newJobs);
    try {
      localStorage.setItem('career_bot_saved_jobs', JSON.stringify(newJobs));
    } catch {
      /* ignore */
    }
  };

  const handleToggleSave = (job: JobListing) => {
    if (!requireAuth()) return;
    const isSaved = savedJobIds.has(job.id);
    if (isSaved) {
      updateSavedJobs(savedJobs.filter((j) => j.id !== job.id));
    } else {
      const newSaved: SavedJob = {
        ...job,
        saved_at: new Date().toISOString(),
        status: 'saved',
        notes: '',
        follow_up_count: 0,
      };
      updateSavedJobs([...savedJobs, newSaved]);
    }
  };

  const handleViewJob = (job: JobListing) => {
    if (!requireAuth()) return;
    setSelectedJobForDetails(job);
  };

  const handleOpenTailor = (job: JobListing) => {
    if (!requireAuth()) return;
    if (credits <= 0) {
      openCreditModal();
      return;
    }
    setActiveTailorJob(job);
  };

  const handleRemoveSaved = (jobId: string) => {
    updateSavedJobs(savedJobs.filter((j) => j.id !== jobId));
  };

  const handleUpdateStatus = (jobId: string, status: SavedJob['status']) => {
    updateSavedJobs(
      savedJobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status,
              applied_at: status === 'applied' && !j.applied_at ? new Date().toISOString() : j.applied_at,
            }
          : j
      )
    );
  };

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
    fetchDueFollowUps();
  }, [user, fetchDueFollowUps]);

  // Unlock background body scroll when modals/drawers close
  useEffect(() => {
    if (!selectedJobForDetails && !activeTailorJob && !isResumeOpen && !isSavedOpen && !isFiltersOpen && !isHistoryOpen && !isSettingsOpen && !isTrackerOpen && !isOnboardingVideoOpen) {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }
  }, [selectedJobForDetails, activeTailorJob, isResumeOpen, isSavedOpen, isFiltersOpen, isHistoryOpen, isSettingsOpen, isTrackerOpen, isOnboardingVideoOpen]);

  // Persist chat history
  const persistChatHistory = async (msgs: ChatMessage[], chatId: string | null) => {
    if (!user || msgs.length === 0) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }
      const firstUserMsg = msgs.find((m) => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 50) : 'Job Search';

      const res = await fetch('/api/history/chats', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: chatId, title, messages: msgs }),
      });
      const data = await res.json();
      if (data.success && data.chat?.id && !chatId) {
        setCurrentChatId(data.chat.id);
      }
    } catch {
      /* non-critical */
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('careerbot_pending_search', text.trim());
      }
      requireAuth();
      return;
    }

    if (credits <= 0) {
      openCreditModal();
      return;
    }

    // Switch to chat view
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
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

  // Resume pending search after auth
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const pending = localStorage.getItem('careerbot_pending_search');
      if (pending) {
        localStorage.removeItem('careerbot_pending_search');
        if (credits <= 0) {
          openCreditModal();
        } else {
          handleSendMessage(pending);
        }
      }
    }
  }, [user, credits]);

  const handleParsedSkills = (profile: ResumeProfile, autoSearchQuery: string) => {
    if (!requireAuth()) {
      return;
    }
    if (credits <= 0) {
      setIsResumeOpen(false);
      openCreditModal();
      return;
    }
    setUserCvProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('careerbot_user_cv', JSON.stringify(profile));
    }
    setActiveNavTab('jobs');
    setCurrentView('feed');
    setIsResumeOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartFromWelcome = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('careerbot_has_started', 'true');
    }
    setCurrentView('feed');
  };

  const handleTabChange = (tab: AppNavTab) => {
    setActiveNavTab(tab);
    if (tab === 'home') {
      setCurrentView('feed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'jobs') {
      setCurrentView('feed');
      const jobListElem = document.getElementById('job-list-section');
      if (jobListElem) {
        jobListElem.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (tab === 'request') {
      if (!requireAuth()) return;
      setIsJobRequestOpen(true);
    } else if (tab === 'chat') {
      if (!user) {
        requireAuth();
        return;
      }
      setCurrentView('chat');
    } else if (tab === 'profile') {
      if (!user) {
        openAuthModal('login');
      } else {
        setIsSettingsOpen(true);
      }
    }
  };

  const handleSelectChat = (chat: { id: string; messages: ChatMessage[] }) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setCurrentView('chat');
  };

  const handleNewChat = () => {
    if (!user) {
      requireAuth();
      return;
    }
    setMessages([]);
    setCurrentChatId(null);
    setCurrentView('chat');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Top App Header (Shown on Feed and Chat) */}
      {currentView !== 'welcome' && (
        <AppHeader
          currentLocation={currentLocation}
          onLocationChange={setCurrentLocation}
          onOpenProfile={() => {
            if (!user) openAuthModal('login');
            else setIsSettingsOpen(true);
          }}
          onOpenSaved={() => setIsSavedOpen(true)}
          onOpenTour={() => setIsOnboardingVideoOpen(true)}
          savedCount={savedJobs.length}
        />
      )}

      {/* Follow-up reminder banner */}
      {dueFollowUps.length > 0 && currentView !== 'welcome' && (
        <div className="py-2 px-4 max-w-md sm:max-w-xl mx-auto w-full">
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

      {/* View 1: Welcome / Onboarding Screen (Screen 1 in Mockup) */}
      {currentView === 'welcome' && (
        <main className="flex-1 flex flex-col justify-center">
          <WelcomeCollageHero
            onStart={handleStartFromWelcome}
            onOpenResume={() => {
              if (!requireAuth()) return;
              setIsResumeOpen(true);
            }}
            onWatchVideo={() => setIsOnboardingVideoOpen(true)}
            jobCount={COMMUNITY_JOBS.length || 200}
          />
        </main>
      )}

      {/* View 2: Discovery Feed & Job List (Screen 2 in Mockup) */}
      {currentView === 'feed' && (
        <main className="flex-1 flex flex-col">
          <DiscoveryFeed
            jobs={COMMUNITY_JOBS}
            currentLocation={currentLocation}
            isJobsMode={activeNavTab === 'jobs'}
            cvProfile={userCvProfile}
            onClearCvFilter={() => {
              setUserCvProfile(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('careerbot_user_cv');
              }
            }}
            onOpenUploadCv={() => {
              if (!requireAuth()) return;
              setIsResumeOpen(true);
            }}
            onSearchSubmit={(q) => handleSendMessage(q)}
            onOpenFilterDrawer={() => {
              if (!requireAuth()) return;
              setIsFiltersOpen(true);
            }}
            onToggleSave={handleToggleSave}
            savedJobIds={savedJobIds}
            onOpenTailor={handleOpenTailor}
            onViewJob={handleViewJob}
            onViewAllSuggested={() => {
              setActiveNavTab('jobs');
              const jobListElem = document.getElementById('job-list-section');
              if (jobListElem) {
                jobListElem.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }
            }}
          />
        </main>
      )}

      {/* View 3: AI Chat & Search Interface */}
      {currentView === 'chat' && (
        <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pb-24">
          <div className="flex items-center justify-between py-2 mb-2">
            <button
              type="button"
              onClick={() => setCurrentView('feed')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>← Back to Job Feed</span>
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              + New Search
            </button>
          </div>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            savedJobs={savedJobs}
            onToggleSave={handleToggleSave}
            onOpenTailor={handleOpenTailor}
            onViewJob={handleViewJob}
          />
        </main>
      )}

      {/* Floating Bottom Navigation Dock (Matching Mockup Screen 2) */}
      {currentView !== 'welcome' && (
        <BottomNavDock
          activeTab={isJobRequestOpen ? 'request' : currentView === 'chat' ? 'chat' : activeNavTab}
          onTabChange={handleTabChange}
          onCenterPlusClick={() => {
            if (!requireAuth()) return;
            setIsResumeOpen(true);
          }}
        />
      )}

      {/* Job Information & Details Modal before applying */}
      <JobDetailsModal
        job={selectedJobForDetails}
        isOpen={!!selectedJobForDetails}
        onClose={() => setSelectedJobForDetails(null)}
        isSaved={selectedJobForDetails ? savedJobIds.has(selectedJobForDetails.id) : false}
        onToggleSave={handleToggleSave}
        onOpenTailor={(job) => {
          setSelectedJobForDetails(null);
          handleOpenTailor(job);
        }}
      />

      {/* Custom Job Request Modal (Attached to contact email) */}
      <JobRequestModal
        isOpen={isJobRequestOpen}
        onClose={() => setIsJobRequestOpen(false)}
        contactEmail="hello@bamdalas.com"
      />

      {/* 1-Click Tailor Pitch Modal */}
      <TailorPitchModal
        job={activeTailorJob}
        onClose={() => setActiveTailorJob(null)}
      />

      {/* 60-Second Interactive Onboarding Video Modal */}
      <OnboardingVideoModal
        isOpen={isOnboardingVideoOpen}
        onClose={() => setIsOnboardingVideoOpen(false)}
        onGetStarted={handleStartFromWelcome}
        onOpenResume={() => {
          if (!requireAuth()) return;
          setIsResumeOpen(true);
        }}
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
        onOpenTailor={handleOpenTailor}
        onViewJob={handleViewJob}
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
        onApplyFilters={(filterPrompt) => {
          if (!requireAuth()) return;
          if (credits <= 0) {
            openCreditModal();
            return;
          }
          handleSendMessage(filterPrompt);
        }}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      {/* Account Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Floating Quick Navigation to Top / Bottom */}
      <QuickScrollPill />
    </div>
  );
}
