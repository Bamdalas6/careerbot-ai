'use client';

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Sparkles, FileText, CheckCircle2, Zap } from 'lucide-react';
import { JobListing, ResumeProfile } from '@/types/job';
import { useAuth } from '@/context/AuthContext';
import { SuggestedWorkCard } from './SuggestedWorkCard';
import { JobFeedCard } from './JobFeedCard';

interface DiscoveryFeedProps {
  jobs: JobListing[];
  currentLocation?: string;
  isJobsMode?: boolean;
  cvProfile?: ResumeProfile | null;
  onClearCvFilter?: () => void;
  onOpenUploadCv?: () => void;
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

export const DiscoveryFeed: React.FC<DiscoveryFeedProps> = ({
  jobs,
  currentLocation = 'All Locations',
  isJobsMode = false,
  cvProfile = null,
  onClearCvFilter,
  onOpenUploadCv,
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
        const remoteMatches = list.filter((j) => j.is_remote === true);
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
    if ((!user || credits > 0) && cvProfile && (cvProfile.skills?.length || cvProfile.extracted_title || cvProfile.preferred_roles?.length)) {
      const matched = list
        .map((j) => ({ job: j, result: matchJobToCv(j, cvProfile) }))
        .filter((item) => item.result.matches)
        .sort((a, b) => b.result.score - a.result.score)
        .map((item) => item.job);

      if (matched.length > 0) {
        list = matched;
      }
    }

    return list;
  }, [jobs, selectedCategory, searchInput, currentLocation, cvProfile, user, credits]);

  const handleClearSearch = () => {
    setSearchInput('');
  };

  const handleSearchFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!requireAuth()) {
      e.target.blur();
      return;
    }
    if (credits <= 0) {
      e.target.blur();
      openCreditModal();
      return;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireAuth()) return;
    if (credits <= 0) {
      openCreditModal();
      return;
    }
    setSearchInput(e.target.value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!requireAuth()) return;
      if (credits <= 0) {
        openCreditModal();
        return;
      }
      if (searchInput.trim()) {
        onSearchSubmit(searchInput.trim());
      }
    }
  };

  const handleAskAiClick = () => {
    if (!requireAuth()) return;
    if (credits <= 0) {
      openCreditModal();
      return;
    }
    if (searchInput.trim()) {
      onSearchSubmit(searchInput.trim());
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-28 bg-white select-none transition-all">
      {/* Desktop & Mobile Responsive Search Bar */}
      <div className="flex items-center gap-2.5 my-3.5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onFocus={handleSearchFocus}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyPress}
            placeholder={
              user && credits <= 0
                ? "0 Tokens — Recharge tokens to search jobs..."
                : "Search roles, skills, companies, or cities (e.g. 'Figma Designer', 'React Remote')..."
            }
            className="w-full pl-11 pr-28 sm:pr-32 py-3 sm:py-3.5 rounded-full bg-white border border-slate-200/90 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />

          {/* Action buttons inside search bar: Clear & AI Search & Recharge Token Prompt */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {user && credits <= 0 && (
              <button
                type="button"
                onClick={openCreditModal}
                className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 text-[11px] font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="0 tokens remaining — Click to recharge"
              >
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Recharge</span>
              </button>
            )}

            {searchInput.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleAskAiClick}
              className="px-2.5 py-1 rounded-full bg-[#0080ff] hover:bg-blue-600 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              title="Search with CareerBot AI Agent"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </div>

        {/* Circular Blue Filter Button */}
        <button
          type="button"
          onClick={() => {
            if (!requireAuth()) return;
            if (credits <= 0) {
              openCreditModal();
              return;
            }
            onOpenFilterDrawer();
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0080ff] hover:bg-blue-600 text-white flex items-center justify-center shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Filter Preferences & Salaries"
        >
          <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 my-1">
        {CATEGORY_PILLS.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#0080ff] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Active Filter Bar if user searched or chose a category */}
      {(searchInput.trim() || selectedCategory !== 'All Jobs') && (
        <div className="my-2 px-1 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>Showing <strong className="text-slate-900">{filteredJobs.length}</strong> jobs</span>
            {selectedCategory !== 'All Jobs' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                {selectedCategory}
              </span>
            )}
            {searchInput.trim() && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px]">
                "{searchInput}"
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All Jobs');
              setSearchInput('');
            }}
            className="text-blue-600 font-bold hover:underline shrink-0 text-xs"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* CV Tailored Matching Banner */}
      {cvProfile && (
        <div className="my-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 border border-blue-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0080ff] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">Filtered by your CV</span>
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
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    {filteredJobs.length} matches
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                {cvProfile.extracted_title ? `Role: ${cvProfile.extracted_title}` : `${cvProfile.skills?.length || 0} skills matched`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenUploadCv && (
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth()) return;
                  if (credits <= 0) {
                    openCreditModal();
                    return;
                  }
                  onOpenUploadCv();
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition shadow-2xs cursor-pointer"
              >
                Change CV
              </button>
            )}
            {onClearCvFilter && (
              <button
                type="button"
                onClick={onClearCvFilter}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Clear CV filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suggested Works Section (Shown on Home tab; hidden in Jobs mode per user spec) */}
      {!isJobsMode && filteredJobs.length > 0 && (
        <SuggestedWorkCard
          jobs={filteredJobs}
          isSaved={false}
          onToggleSave={onToggleSave}
          onOpenTailor={onOpenTailor}
          onViewAll={onViewAllSuggested}
          onViewJob={onViewJob}
        />
      )}

      {/* Job List Section Header */}
      <div id="job-list-section" className="mt-7 mb-3 flex items-center justify-between px-1 scroll-mt-20">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {isJobsMode ? 'All Job Openings' : 'Job List'}
          </h2>
          {isJobsMode && (
            <span className="text-xs text-slate-400 font-medium">({filteredJobs.length} available)</span>
          )}
        </div>
      </div>

      {/* Job Cards Feed: 1 column on mobile, 2 columns on desktop/tablet! */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {filteredJobs.slice(0, 50).map((job) => (
          <JobFeedCard
            key={job.id}
            job={job}
            isSaved={savedJobIds.has(job.id)}
            onToggleSave={onToggleSave}
            onOpenTailor={onOpenTailor}
            onViewJob={onViewJob}
          />
        ))}

        {filteredJobs.length === 0 && (
          <div className="col-span-full text-center py-14 px-4 bg-slate-50/60 rounded-3xl border border-slate-200/80 shadow-2xs">
            <p className="text-sm font-bold text-slate-700">
              No matching job listings found.
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try searching a broader term, or clear category filters to see all active openings.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All Jobs');
                setSearchInput('');
              }}
              className="mt-3.5 px-4 py-2 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
