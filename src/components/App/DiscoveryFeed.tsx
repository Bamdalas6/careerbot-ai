'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Sparkles, FileText, Zap, ClipboardList, ChevronDown, Dices } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { JobListing, ResumeProfile } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { fitLevelFromScore, isFreshJob, isRemoteJob, timeOfDayGreeting } from '@/lib/job-display';
import { BotMark } from '@/components/Brand/Logo';
import { recordVisit, useEngagement } from '@/lib/engagement';
import { SuggestedWorkCard } from './SuggestedWorkCard';
import { JobFeedCard } from './JobFeedCard';

interface DiscoveryFeedProps {
  jobs: JobListing[];
  currentLocation?: string;
  isJobsMode?: boolean;
  cvProfile?: ResumeProfile | null;
  onClearCvFilter?: () => void;
  onOpenUploadCv?: () => void;
  onOpenChat?: () => void;
  onOpenTracker?: () => void;
  onSearchSubmit: (query: string) => void;
  onOpenFilterDrawer: () => void;
  onToggleSave: (job: JobListing) => void;
  savedJobIds: Set<string>;
  onOpenTailor: (job: JobListing) => void;
  onViewAllSuggested?: () => void;
  onViewJob?: (job: JobListing) => void;
}

const CATEGORY_PILLS = [
  'All Jobs',
  'App Design',
  'Web Design',
  'Graphic Design',
  'Tech & Dev',
  'Remote',
  'Finance',
  'Marketing',
  'Executive Assistant',
  'Entry-Level',
];

const CATEGORY_ICONS: Record<string, string> = {
  'All Jobs': '⚡',
  'App Design': '📱',
  'Web Design': '🎨',
  'Graphic Design': '✨',
  'Tech & Dev': '💻',
  'Remote': '🏝️',
  'Finance': '💰',
  'Marketing': '📈',
  'Executive Assistant': '👔',
  'Entry-Level': '🌱',
};

// Helper for whole word/token matching
function hasWholeWord(haystack: string, needle: string): boolean {
  if (!needle || !haystack) return false;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!h.includes(n)) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i').test(h);
}

// Category filter rules using strict title and tag matching (no loose description hits)
const CATEGORY_MATCHERS: Record<string, (j: JobListing) => boolean> = {
  'App Design': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/developer|engineer|sales|mechanic|accountant|technician/i.test(t) && !/design/i.test(t)) return false;
    return (
      /app\s+design|ui\/ux|\bui\b|\bux\b|product\s+design|mobile\s+design|figma|prototype/i.test(t) ||
      tags.some((x) => /ui\/ux|app\s+design|product\s+design|figma|mobile\s+design/i.test(x))
    );
  },
  'Web Design': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/mechanic|electrician|accountant|nurse|civil|structural/i.test(t)) return false;
    return (
      /web\s+design|frontend|front-end|web\s+dev/i.test(t) ||
      tags.some((x) => /web\s+design|frontend|front-end|web\s+dev/i.test(x))
    );
  },
  'Graphic Design': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/developer|engineer|mechanic|marketing\s+associate|sales|social\s+media\s+manager/i.test(t)) return false;
    return (
      /graphic|brand\s+designer|visual\s+designer|illustrator|creative\s+designer|content\s+designer/i.test(t) ||
      tags.some((x) => /graphic\s+design|brand\s+designer|visual\s+design/i.test(x))
    );
  },
  'Tech & Dev': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/mechanic|electrician|structural|civil|pipeline|hvac|nurse|sales/i.test(t) && !/software|developer/i.test(t)) return false;
    return (
      /developer|programmer|software|frontend|backend|full-?stack|mobile\s+app\s+dev|sql\s+dev|\btech\s+lead\b|product\s+manager/i.test(t) ||
      tags.some((x) => /tech\s+&\s+dev|mobile\s+dev|developer|software/i.test(x))
    );
  },
  'Remote': (j) => {
    return j.is_remote === true || (j.location || '').toLowerCase().includes('remote');
  },
  'Finance': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/teacher|school|nurse|developer|engineer/i.test(t)) return false;
    return (
      /finance|financial|accountant|accounting|audit|treasury|tax|cfo|cashier|wealth\s+manager|banking|internal\s+control/i.test(t) ||
      tags.some((x) => /finance|accounting|audit/i.test(x))
    );
  },
  'Marketing': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/software|developer|engineer|accountant|mechanic/i.test(t)) return false;
    return (
      /marketing|marketer|social\s+media|growth|seo|brand\s+manager|digital\s+market|communications\s+exec/i.test(t) ||
      tags.some((x) => /marketing|social\s+media|growth|seo/i.test(x))
    );
  },
  'Executive Assistant': (j) => {
    const t = j.title.toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    if (/assistant\s+manager|assistant\s+director/i.test(t)) return false;
    return (
      /virtual\s+assistant|executive\s+assistant|personal\s+assistant|office\s+assistant|administrative\s+assistant|secretary|executive\s+coordinator/i.test(t) ||
      tags.some((x) => /virtual\s+assistant|executive\s+support|administrative/i.test(x))
    );
  },
  'Entry-Level': (j) => {
    const t = j.title.toLowerCase();
    const exp = (j.experience_level || '').toLowerCase();
    const tags = (j.tags || []).map((x) => x.toLowerCase());
    return (
      exp.includes('entry') ||
      exp.includes('junior') ||
      /entry|intern|graduate|trainee|launchpad|junior|nysc|fresher/i.test(t) ||
      tags.some((x) => /entry|intern|graduate|trainee|launchpad/i.test(x))
    );
  },
};

// Strict Role Attribution rules for queries targeting specific roles
interface RoleRule {
  testQuery: (q: string) => boolean;
  match: (job: JobListing) => boolean;
}

const ROLE_RULES: RoleRule[] = [
  {
    testQuery: (q) => /virtual\s+assistant|\bva\b/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      return /virtual\s+assistant/i.test(t) || (job.tags || []).some((tag) => /virtual\s+assistant/i.test(tag));
    },
  },
  {
    testQuery: (q) => /\bassistant\b|\bpa\b|\bea\b|personal\s+assistant|executive\s+assistant|office\s+assistant|administrative\s+assistant/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      if (/assistant\s+manager|assistant\s+director/i.test(t)) return false;
      return /assistant|secretary|executive\s+coordinator|administrative/i.test(t);
    },
  },
  {
    testQuery: (q) => /\bdesign(er)?\b|\bui\b|\bux\b|ui\/ux|graphic/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      if (/structural|civil|pipeline|mechanical|electrical/i.test(t)) return false;
      if (/frontend\s+engineer|web\s+developer/i.test(t) && !/design/i.test(t)) return false;
      return (
        /design|ui\/ux|\bui\b|\bux\b|graphic|illustrator|creative\s+studio/i.test(t) ||
        (job.tags || []).some((tag) => /design|ui\/ux|\bui\b|\bux\b|graphic/i.test(tag))
      );
    },
  },
  {
    testQuery: (q) => /\bdev(eloper)?\b|programmer|software\s+engineer|frontend|backend|fullstack|full-stack|react|next\.js|node|mobile\s+app\s+dev/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      if (/structural|civil|pipeline|offshore|hvac|sales\s+engineer|mechanical|chemical|inspection/i.test(t)) return false;
      return (
        /developer|programmer|software|frontend|front-end|backend|back-end|full-?stack|web\s+dev|mobile\s+app\s+dev|react|sql\s+dev/i.test(t) ||
        (job.tags || []).some((tag) => /developer|programmer|software|frontend|backend|fullstack|react/i.test(tag))
      );
    },
  },
  {
    testQuery: (q) => /product\s+manager|\bpm\b/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      return /product\s+manager/i.test(t) || (job.tags || []).some((tag) => /product\s+manage/i.test(tag));
    },
  },
  {
    testQuery: (q) => /accountant|accounting|audit(or)?|finance\s+manager|accounts\s+officer|bookkeeper/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      if (/teacher|school|nurse/i.test(t)) return false;
      return (
        /accountant|accounting|audit|accounts\s+officer|finance\s+(manager|officer)|head\s+of\s+finance|cfo|cashier/i.test(t) ||
        (job.tags || []).some((tag) => /accountant|accounting|finance|audit/i.test(tag))
      );
    },
  },
  {
    testQuery: (q) => /marketing|marketer|growth|seo|digital\s+marketing/i.test(q),
    match: (job) => {
      const t = job.title.toLowerCase();
      if (/software|developer|engineer|accountant|mechanic/i.test(t)) return false;
      return (
        /marketing|marketer|social\s+media|growth|seo|brand\s+manager|digital\s+market|communications\s+exec/i.test(t) ||
        (job.tags || []).some((tag) => /marketing|social\s+media|growth|seo/i.test(tag))
      );
    },
  },
  {
    testQuery: (q) => /mechanic|automobile\s+technician/i.test(q),
    match: (job) => /mechanic/i.test(job.title) || (job.tags || []).some((t) => /mechanic/i.test(t)),
  },
  {
    testQuery: (q) => /electrician|electrical\s+technician/i.test(q),
    match: (job) => /electrician|electrical/i.test(job.title) || (job.tags || []).some((t) => /electrician|electrical/i.test(t)),
  },
  {
    testQuery: (q) => /\bnurse|nursing|doctor|medical\s+officer|pharmacist\b/i.test(q),
    match: (job) => /nurse|nursing|doctor|clinical|medical\s+officer|pharmacist|matron/i.test(job.title),
  },
];

function matchJobBySearchQuery(job: JobListing, query: string): boolean {
  const q = (query || '').toLowerCase().trim();
  if (!q) return true;

  // 1. If query matches a known role pattern, enforce strict role matching
  const matchedRule = ROLE_RULES.find((r) => r.testQuery(q));
  if (matchedRule) {
    if (!matchedRule.match(job)) return false;

    // Check any additional non-role keywords (e.g. "virtual assistant remote", "developer lagos")
    const words = q.split(/\s+/).filter(Boolean);
    const nonRoleWords = words.filter(
      (w) =>
        !/virtual|assistant|developer|designer|engineer|manager|accountant|marketing|mechanic|electrician|nurse|pm|va/i.test(
          w
        )
    );
    if (nonRoleWords.length > 0) {
      const metaText = `${job.title} ${job.company} ${job.location || ''} ${(job.tags || []).join(' ')} ${
        job.is_remote ? 'remote' : ''
      }`.toLowerCase();
      return nonRoleWords.every((w) => hasWholeWord(metaText, w));
    }
    return true;
  }

  // 2. Generic Query: Match Title, Tags, Company, or Location (Never loose body text)
  const terms = q.split(/\s+/).filter(Boolean);
  const title = (job.title || '').toLowerCase();
  const tags = (job.tags || []).map((t) => t.toLowerCase());
  const company = (job.company || '').toLowerCase();
  const loc = (job.location || '').toLowerCase();

  return terms.every((term) => {
    if (hasWholeWord(title, term)) return true;
    if (tags.some((t) => hasWholeWord(t, term))) return true;
    if (hasWholeWord(company, term)) return true;
    if (hasWholeWord(loc, term)) return true;
    if (term === 'remote' && (job.is_remote || loc.includes('remote'))) return true;
    return false;
  });
}

function matchJobToCv(job: JobListing, cv: ResumeProfile): { matches: boolean; score: number } {
  let score = 0;
  const title = (job.title || '').toLowerCase();
  const tags = (job.tags || []).map((t) => t.toLowerCase());
  const desc = (job.description || '').toLowerCase();

  // 1. Check extracted title
  if (cv.extracted_title) {
    const et = cv.extracted_title.toLowerCase().trim();
    if (title.includes(et) || tags.some((t) => t.includes(et))) {
      score += 5;
    } else {
      const words = et.split(/\s+/).filter((w) => w.length > 2 && !/senior|junior|lead|intern|staff|head|specialist|officer/i.test(w));
      if (words.some((w) => hasWholeWord(title, w) || tags.some((t) => hasWholeWord(t, w)))) {
        score += 3;
      }
    }
  }

  // 2. Check preferred roles
  if (cv.preferred_roles && cv.preferred_roles.length > 0) {
    for (const pr of cv.preferred_roles) {
      const r = pr.toLowerCase().trim();
      if (title.includes(r) || tags.some((t) => t.includes(r))) {
        score += 4;
      }
    }
  }

  // 3. Check skills
  if (cv.skills && cv.skills.length > 0) {
    for (const s of cv.skills) {
      const skill = s.toLowerCase().trim();
      if (skill.length < 2) continue;
      if (hasWholeWord(title, skill)) {
        score += 3;
      } else if (tags.some((t) => hasWholeWord(t, skill))) {
        score += 2;
      } else if (hasWholeWord(desc, skill)) {
        score += 1;
      }
    }
  }

  return { matches: score > 0, score };
}

const PAGE_SIZE = 20;

export const DiscoveryFeed: React.FC<DiscoveryFeedProps> = ({
  jobs,
  currentLocation = 'All Locations',
  isJobsMode = false,
  cvProfile = null,
  onClearCvFilter,
  onOpenUploadCv,
  onOpenChat,
  onOpenTracker,
  onSearchSubmit,
  onOpenFilterDrawer,
  onToggleSave,
  savedJobIds,
  onOpenTailor,
  onViewAllSuggested,
  onViewJob,
}) => {
  const { user, credits, requireAuth, openCreditModal } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Jobs');
  const [paging, setPaging] = useState({ key: '', count: PAGE_SIZE });

  const cvActive =
    (!user || credits > 0) &&
    !!cvProfile &&
    !!(cvProfile.skills?.length || cvProfile.extracted_title || cvProfile.preferred_roles?.length);

  // CV fit score per job, computed once per profile so cards can show a fit badge.
  const cvScores = useMemo(() => {
    const scores = new Map<string, number>();
    if (!cvActive || !cvProfile) return scores;
    for (const job of jobs) {
      const { score } = matchJobToCv(job, cvProfile);
      if (score > 0) scores.set(job.id, score);
    }
    return scores;
  }, [jobs, cvProfile, cvActive]);

  const feedStats = useMemo(
    () => ({
      total: jobs.length,
      remote: jobs.filter(isRemoteJob).length,
      companies: new Set(jobs.map((j) => j.company.toLowerCase())).size,
      fresh: jobs.filter(isFreshJob).length,
    }),
    [jobs]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Jobs': jobs.length };
    for (const cat of CATEGORY_PILLS) {
      const matcher = CATEGORY_MATCHERS[cat];
      if (matcher) counts[cat] = jobs.filter(matcher).length;
    }
    return counts;
  }, [jobs]);

  // Live intelligent filtering by category, search keywords, territory, and CV profile
  const filteredJobs = useMemo(() => {
    let list = jobs;

    // 1. Filter by Location
    if (currentLocation && currentLocation !== 'All Locations') {
      const locKey = currentLocation.split(',')[0].trim().toLowerCase();
      if (locKey.includes('remote')) {
        list = list.filter((j) => j.is_remote === true || (j.location || '').toLowerCase().includes('remote'));
      } else {
        const localMatches = list.filter((j) => (j.location || '').toLowerCase().includes(locKey));
        const remoteMatches = list.filter((j) => j.is_remote === true && !localMatches.includes(j));
        const others = list.filter((j) => !localMatches.includes(j) && !remoteMatches.includes(j));
        list = [...localMatches, ...remoteMatches, ...others];
      }
    }

    // 2. Filter by Category
    if (selectedCategory !== 'All Jobs') {
      const matcher = CATEGORY_MATCHERS[selectedCategory];
      if (matcher) {
        list = list.filter(matcher);
      } else {
        const lowerCat = selectedCategory.toLowerCase();
        list = list.filter((j) => {
          const t = j.title.toLowerCase();
          const tags = (j.tags || []).map((x) => x.toLowerCase());
          return hasWholeWord(t, lowerCat) || tags.some((x) => hasWholeWord(x, lowerCat));
        });
      }
    }

    // 3. Live search input filter with strict role attribution (only if user has credits)
    if (searchInput.trim() && (!user || credits > 0)) {
      list = list.filter((j) => matchJobBySearchQuery(j, searchInput));
    }

    // 4. CV Profile Filter: When a CV profile is active, show only roles related to the user's CV (requires credits)
    if (cvActive) {
      const matched = list
        .filter((j) => cvScores.has(j.id))
        .sort((a, b) => (cvScores.get(b.id) || 0) - (cvScores.get(a.id) || 0));

      if (matched.length > 0) {
        list = matched;
      }
    }

    return list;
  }, [jobs, selectedCategory, searchInput, currentLocation, user, credits, cvActive, cvScores]);

  // Pagination resets whenever the filter set changes, without a state-syncing effect.
  const filterKey = `${selectedCategory}|${searchInput}|${currentLocation}|${cvActive ? cvProfile?.extracted_title : ''}`;
  const visibleCount = paging.key === filterKey ? paging.count : PAGE_SIZE;
  const visibleJobs = filteredJobs.slice(0, visibleCount);
  const remaining = filteredJobs.length - visibleJobs.length;

  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const { streak } = useEngagement();
  const [diceSpins, setDiceSpins] = useState(0);

  useEffect(() => {
    recordVisit();
  }, []);

  const handleSurpriseMe = () => {
    if (filteredJobs.length === 0) return;
    setDiceSpins((n) => n + 1);
    const pick = filteredJobs[Math.floor(Math.random() * filteredJobs.length)];
    // Let the dice finish rolling before revealing the pick.
    setTimeout(() => onViewJob?.(pick), 550);
  };

  const guardSearch = () => {
    if (!requireAuth()) return false;
    if (credits <= 0) {
      openCreditModal();
      return false;
    }
    return true;
  };

  const resetFilters = () => {
    setSelectedCategory('All Jobs');
    setSearchInput('');
  };

  const handleSearchFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!guardSearch()) e.target.blur();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!guardSearch()) return;
    setSearchInput(e.target.value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!guardSearch()) return;
      if (searchInput.trim()) {
        onSearchSubmit(searchInput.trim());
      }
    }
  };

  const handleAskAiClick = () => {
    if (!guardSearch()) return;
    if (searchInput.trim()) {
      onSearchSubmit(searchInput.trim());
    } else {
      onOpenChat?.();
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-28 select-none">
      {/* Greeting & live pulse of the board */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mt-2 px-1"
      >
        <p className="text-xs font-semibold text-slate-500" suppressHydrationWarning>
          {timeOfDayGreeting()}
          {firstName ? `, ${firstName}` : ''}{' '}
          <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
        </p>
        <h1 className="mt-0.5 text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 leading-tight">
          {isJobsMode ? 'Browse every opening' : (
            <>
              Find work that{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                fits you
              </span>
            </>
          )}
        </h1>
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {streak > 0 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-200 text-[11px] font-extrabold text-orange-700"
              title="Visit on consecutive days to grow your streak"
            >
              <motion.span
                animate={{ scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
                className="inline-block"
              >
                🔥
              </motion.span>
              <span>{streak}-day streak</span>
            </motion.span>
          )}
          {[
            { icon: '💼', label: `${feedStats.total} open roles` },
            { icon: '🏝️', label: `${feedStats.remote} remote` },
            { icon: '🏢', label: `${feedStats.companies} companies` },
            ...(feedStats.fresh > 0 ? [{ icon: '🆕', label: `${feedStats.fresh} posted today` }] : []),
          ].map((stat) => (
            <span
              key={stat.label}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-600"
            >
              <span>{stat.icon}</span>
              <span>{stat.label}</span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* Search bar */}
      <div className="flex items-center gap-2.5 my-3.5">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            value={searchInput}
            onFocus={handleSearchFocus}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyPress}
            placeholder={
              user && credits <= 0
                ? '0 Tokens — Recharge tokens to search jobs...'
                : 'Search roles, skills, companies, or cities...'
            }
            aria-label="Search jobs"
            className="w-full pl-11 pr-28 sm:pr-32 py-3 sm:py-3.5 rounded-full bg-slate-50/80 border border-slate-200/90 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {user && credits <= 0 && (
              <button
                type="button"
                onClick={openCreditModal}
                className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="0 tokens remaining — Click to recharge"
              >
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Recharge</span>
              </button>
            )}

            {searchInput.trim() && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleAskAiClick}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0080ff] to-indigo-600 text-white text-[11px] font-bold shadow-[0_4px_12px_rgba(0,128,255,0.35)] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              title="Search with CareerBot AI Agent"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => {
            if (!guardSearch()) return;
            onOpenFilterDrawer();
          }}
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#0080ff] to-[#0060e6] text-white flex items-center justify-center shadow-[0_6px_20px_-2px_rgba(0,128,255,0.4)] shrink-0 cursor-pointer"
          aria-label="Filter preferences & salaries"
        >
          <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
      </div>

      {/* Category pills with live counts */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5" role="tablist" aria-label="Job categories">
        {CATEGORY_PILLS.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat];
          return (
            <motion.button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat)}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`relative px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'text-white'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="category-pill-active"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0080ff] to-[#0060e6] shadow-[0_4px_14px_rgba(0,128,255,0.35)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <motion.span
                className="relative inline-block"
                animate={isSelected ? { rotate: [0, -18, 14, -6, 0], scale: [1, 1.35, 1] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {CATEGORY_ICONS[cat] || '💼'}
              </motion.span>
              <span className="relative">{cat}</span>
              {count != null && count > 0 && (
                <span
                  className={`relative min-w-[18px] px-1 rounded-full text-[10px] tabular-nums ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Active filter summary */}
      <AnimatePresence initial={false}>
        {(searchInput.trim() || selectedCategory !== 'All Jobs') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 px-1 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>
                  Showing <strong className="text-slate-900">{filteredJobs.length}</strong> jobs
                </span>
                {selectedCategory !== 'All Jobs' && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                    {selectedCategory}
                  </span>
                )}
                {searchInput.trim() && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px]">
                    &ldquo;{searchInput}&rdquo;
                  </span>
                )}
              </div>
              <button type="button" onClick={resetFilters} className="text-blue-600 font-bold hover:underline shrink-0 text-xs">
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CV Tailored Matching Banner */}
      {cvProfile && (
        <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 border border-blue-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0080ff] to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">Ranked by your CV</span>
                {user && credits <= 0 ? (
                  <button
                    type="button"
                    onClick={openCreditModal}
                    className="px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1 transition cursor-pointer"
                    title="0 tokens remaining — Click to recharge"
                  >
                    <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    <span>0 Tokens (Recharge)</span>
                  </button>
                ) : (
                  <span className="px-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    {cvScores.size} matches
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                {cvProfile.extracted_title ? `Role: ${cvProfile.extracted_title}` : `${cvProfile.skills?.length || 0} skills matched`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenUploadCv && (
              <button
                type="button"
                onClick={() => {
                  if (guardSearch()) onOpenUploadCv();
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              >
                Change
              </button>
            )}
            {onClearCvFilter && (
              <button
                type="button"
                onClick={onClearCvFilter}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition"
                aria-label="Clear CV filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suggested Works deck (Home tab only) */}
      {!isJobsMode && filteredJobs.length > 0 && (
        <SuggestedWorkCard
          key={filterKey}
          jobs={filteredJobs}
          savedJobIds={savedJobIds}
          onToggleSave={onToggleSave}
          onOpenTailor={onOpenTailor}
          onViewAll={onViewAllSuggested}
          onViewJob={onViewJob}
        />
      )}

      {/* Quick actions */}
      {!isJobsMode && (
        <div className="grid grid-cols-2 gap-3 mt-5">
          {cvProfile ? (
            <QuickActionTile
              icon={<ClipboardList className="w-5 h-5" />}
              title="Tracker"
              subtitle="Applications & follow-ups"
              tone="emerald"
              onClick={() => onOpenTracker?.()}
            />
          ) : (
            <QuickActionTile
              icon={<FileText className="w-5 h-5" />}
              title="Upload CV"
              subtitle="Rank jobs by your fit"
              tone="blue"
              onClick={() => onOpenUploadCv?.()}
            />
          )}
          <QuickActionTile
            icon={<BotMark className="w-10 h-10" animated />}
            title="Ask CareerBot"
            subtitle="Search live job boards"
            tone="plain"
            onClick={() => {
              if (guardSearch()) onOpenChat?.();
            }}
          />
        </div>
      )}

      {/* Job List header */}
      <div id="job-list-section" className="mt-7 mb-3 flex items-end justify-between px-1 scroll-mt-24">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {isJobsMode ? 'All Job Openings' : 'Job List'}
          </h2>
          <p className="text-[11px] font-medium text-slate-400">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'role' : 'roles'}
            {cvActive && cvScores.size > 0 ? ' · best CV fit first' : ''}
          </p>
        </div>
        {filteredJobs.length > 1 && (
          <motion.button
            type="button"
            onClick={handleSurpriseMe}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-50 to-violet-50 border border-violet-200 text-xs font-bold text-violet-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <motion.span
              key={diceSpins}
              initial={{ rotate: 0 }}
              animate={{ rotate: diceSpins ? 720 : 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="inline-flex"
            >
              <Dices className="w-4 h-4" />
            </motion.span>
            Surprise me
          </motion.button>
        )}
      </div>

      {/* Job cards: 1 column on mobile, 2 on tablet/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {visibleJobs.map((job, idx) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: (idx % 2) * 0.06 }}
          >
            <JobFeedCard
              job={job}
              isSaved={savedJobIds.has(job.id)}
              fitLevel={cvActive ? fitLevelFromScore(cvScores.get(job.id) || 0) : null}
              onToggleSave={onToggleSave}
              onOpenTailor={onOpenTailor}
              onViewJob={onViewJob}
            />
          </motion.div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="col-span-full text-center py-12 px-6 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-dashed border-slate-200">
            <div className="text-4xl mb-2" aria-hidden="true">🔭</div>
            <p className="text-sm font-extrabold text-slate-800">Nothing here yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Our curated board has no match. Let CareerBot scan live job boards for you instead.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!guardSearch()) return;
                  const q = searchInput.trim() || (selectedCategory !== 'All Jobs' ? `${selectedCategory} jobs` : '');
                  if (q) onSearchSubmit(q);
                  else onOpenChat?.();
                }}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#0080ff] to-indigo-600 text-white text-xs font-bold shadow-[0_4px_14px_rgba(0,128,255,0.35)] flex items-center gap-1.5 active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Search live with AI
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setPaging({ key: filterKey, count: visibleCount + PAGE_SIZE })}
            className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 shadow-sm flex items-center gap-2 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            Show {Math.min(PAGE_SIZE, remaining)} more
            <span className="text-slate-400 font-semibold">({remaining} left)</span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

const TILE_TONES = {
  blue: 'from-blue-500 to-indigo-600 shadow-[0_8px_20px_-6px_rgba(59,130,246,0.55)]',
  emerald: 'from-emerald-500 to-teal-600 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.55)]',
  plain: '',
};

function QuickActionTile({
  icon,
  title,
  subtitle,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: keyof typeof TILE_TONES;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 450, damping: 24 }}
      className="group text-left p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.08)] hover:border-slate-200 flex flex-col items-start gap-2.5 cursor-pointer"
    >
      <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TILE_TONES[tone]} text-white flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-slate-900 leading-tight">{title}</span>
        <span className="block mt-0.5 text-[11px] font-medium text-slate-500 leading-snug">{subtitle}</span>
      </span>
    </motion.button>
  );
}
