import { JobListing, JobSearchQuery } from '@/types/job';
import {
  ParsedQuery,
  parseQuery,
  toSearchTerm,
  familyOfTitle,
  locationMatches,
  locationAllowsRemote,
} from './query-parser';
import { BOARDS, fetchBoards, selectBoards, levelFrom, relativeTime, ageInDays } from './ats-boards';

/**
 * Job search.
 *
 * The design rule here is that a posting must EARN its place in the results.
 * The previous version scored every surviving posting to a floor of 65% and
 * always padded the list out to eight, which meant a search for "product
 * designer in Lagos" happily returned a Business Relationship Manager at 70%
 * "match". Showing fewer, honest results is strictly better than filling the
 * grid, so `scoreJob` can return `relevant: false` and those postings are
 * dropped entirely rather than ranked last.
 */

export interface SearchDiagnostics {
  /** What the parser understood, so the chat reply can say it out loud. */
  parsed: ParsedQuery;
  /** Employer boards + feeds actually queried. */
  sourcesQueried: string[];
  /** Postings retrieved before relevance filtering. */
  fetched: number;
  /** Postings that passed the relevance gate as exact matches. */
  relevant: number;
  /** Adjacent-field roles included because exact matches were thin. */
  related: number;
  /** Reasons postings were dropped, for the "no results" explanation. */
  rejected: { offTopic: number; wrongLocation: number; wrongArrangement: number; stale: number };
}

export interface SearchResult {
  jobs: JobListing[];
  diagnostics: SearchDiagnostics;
}

/**
 * Freshness cutoff, in days.
 *
 * Boards happily keep evergreen requisitions listed for years, so an unfiltered
 * sweep surfaced roles posted "11mo ago" and "1y ago" next to ones posted today.
 * Those are almost always filled or abandoned, and applying to them wastes the
 * candidate's afternoon. Five months is the outer edge of a posting still being
 * worth an application, so anything older is dropped before scoring.
 */
const MAX_AGE_DAYS = 150;

/**
 * Near-synonyms so "developer" finds "engineer" without loosening the gate.
 * Kept deliberately small: every entry here trades precision for recall.
 */
const SYNONYMS: Record<string, string[]> = {
  developer: ['engineer', 'dev', 'programmer'],
  engineer: ['developer', 'dev'],
  dev: ['developer', 'engineer'],
  frontend: ['front-end', 'front end', 'ui', 'client-side'],
  backend: ['back-end', 'back end', 'server-side', 'api'],
  fullstack: ['full-stack', 'full stack'],
  designer: ['design'],
  design: ['designer'],
  analyst: ['analytics', 'analysis'],
  analytics: ['analyst'],
  ml: ['machine learning'],
  ai: ['artificial intelligence', 'machine learning'],
  devops: ['sre', 'site reliability', 'platform'],
  sre: ['devops', 'site reliability'],
  pm: ['product manager'],
  qa: ['quality assurance', 'test', 'sdet'],
  accountant: ['accounting', 'accounts'],
  hr: ['human resources', 'people'],
  marketing: ['marketer', 'growth'],
  support: ['customer service', 'customer care'],
};

/** Words already captured as structured seniority; excluded from term matching. */
const SENIORITY_WORDS = new Set([
  'senior', 'sr', 'junior', 'jr', 'entry', 'mid', 'intermediate', 'lead', 'principal',
  'staff', 'intern', 'internship', 'graduate', 'trainee', 'fresher', 'experienced',
  'head', 'director', 'vp', 'chief', 'executive', 'nysc',
]);

/**
 * Role words so common they identify almost nothing on their own. When a query
 * contains a discriminating word alongside one of these, the discriminating one
 * has to match — otherwise "frontend developer" happily returns "AI Engineer"
 * on the strength of developer→engineer alone, which is precisely the sort of
 * result that makes the search feel random.
 */
const GENERIC_ROLE_WORDS = new Set([
  'engineer', 'engineering', 'developer', 'dev', 'programmer', 'manager', 'analyst',
  'specialist', 'associate', 'officer', 'consultant', 'coordinator', 'assistant',
  'representative', 'agent', 'administrator', 'admin', 'expert', 'professional',
  'technician', 'supervisor', 'partner', 'generalist', 'architect',
]);

/**
 * Location text that a candidate on the continent can actually work under.
 * Used only as a tiebreaker when the user named no location.
 */
const AFRICA_REACHABLE =
  /(africa|emea|worldwide|anywhere|global|nigeria|lagos|abuja|kenya|nairobi|ghana|accra|egypt|cairo|rwanda|kigali|uganda|tanzania|ethiopia|senegal|zambia|morocco|south africa|johannesburg|cape town)/i;

function wordIn(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (needle.includes(' ') || needle.includes('-')) return haystack.includes(needle);
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(haystack);
}

/**
 * Which word actually matched — the term itself, or the synonym that stood in
 * for it. Returning the real matched word matters because `match_reason` quotes
 * it: claiming `Title matches "developer"` on a posting titled "Senior Data
 * Engineer" is exactly the kind of thing that makes the bot look like it isn't
 * reading. Returns null when nothing matched.
 */
function matchedWord(text: string, term: string): string | null {
  if (wordIn(text, term)) return term;
  for (const syn of SYNONYMS[term] || []) if (wordIn(text, syn)) return syn;
  return null;
}

function termIn(text: string, term: string): boolean {
  return matchedWord(text, term) !== null;
}

interface Scored {
  job: JobListing;
  score: number;
  reasons: string[];
  relevant: boolean;
  /**
   * Right field, right place, wrong exact role — e.g. a "Product Manager,
   * Front-End Channels" in Lagos for a "frontend developer in Lagos" search.
   * These are shown only after the exact matches run out, and they are labelled
   * as related so they can never be mistaken for what was asked for.
   */
  related?: boolean;
  rejection?: 'offTopic' | 'wrongLocation' | 'wrongArrangement' | 'stale';
}

function scoreJob(job: JobListing, q: ParsedQuery): Scored {
  const title = job.title.toLowerCase();
  const company = job.company.toLowerCase();
  const tagText = job.tags.join(' ').toLowerCase();
  const body = (job.description || '').toLowerCase();
  const reasons: string[] = [];

  // ---- hard filters: these are user constraints, not preferences ----
  // Age first, because a stale posting is worthless however well it matches.
  // An undefined age means the source published no date; that is not evidence
  // of staleness, so those get the benefit of the doubt and a ranking penalty
  // further down instead.
  if (job.age_days !== undefined && job.age_days > MAX_AGE_DAYS) {
    return { job, score: 0, reasons, relevant: false, rejection: 'stale' };
  }
  if (q.isRemote === true && !job.is_remote) {
    return { job, score: 0, reasons, relevant: false, rejection: 'wrongArrangement' };
  }
  if (q.isRemote === false && job.is_remote) {
    return { job, score: 0, reasons, relevant: false, rejection: 'wrongArrangement' };
  }

  let locationHit = false;
  if (q.location) {
    locationHit = locationMatches(job.location, q.location);
    // A remote role only counts if the posting is actually open to that region.
    // "Remote — USA only" is no use to someone searching Lagos.
    const reachable = locationHit || (job.is_remote && locationAllowsRemote(job.location, q.location));
    if (!reachable) {
      return { job, score: 0, reasons, relevant: false, rejection: 'wrongLocation' };
    }
    if (locationHit) reasons.push(job.location);
  }

  // ---- term signals ----
  const searchTerms = q.terms.filter((t) => !SENIORITY_WORDS.has(t) && t.length >= 2);
  let titleHits = 0;
  let tagHits = 0;
  let companyHits = 0;
  let bodyHits = 0;
  /** Where each term was found. A body-only hit is much weaker than a title hit. */
  const hitWhere = new Map<string, 'title' | 'tag' | 'company' | 'body'>();
  const titleMatched: string[] = [];
  const tagMatched: string[] = [];

  for (const term of searchTerms) {
    const inTitle = matchedWord(title, term);
    if (inTitle) {
      titleHits += 1;
      // Quote the word that really appears in the title, not the query word.
      if (!titleMatched.includes(inTitle)) titleMatched.push(inTitle);
      hitWhere.set(term, 'title');
      continue;
    }
    const inTags = matchedWord(tagText, term);
    if (inTags) {
      tagHits += 1;
      if (!tagMatched.includes(inTags)) tagMatched.push(inTags);
      hitWhere.set(term, 'tag');
      continue;
    }
    if (termIn(company, term)) {
      companyHits += 1;
      reasons.push(`Employer: ${job.company}`);
      hitWhere.set(term, 'company');
      continue;
    }
    if (termIn(body, term)) {
      bodyHits += 1;
      hitWhere.set(term, 'body');
    }
  }

  // Skills are a separate, stronger signal than a bare keyword. A skill named
  // only in the body is weak evidence, so track it separately from a skill in
  // the title or the tag list.
  const skillsInTitleOrTags = q.skills.filter(
    (s) => wordIn(title, s.toLowerCase()) || wordIn(tagText, s.toLowerCase())
  );
  const skillsInBody = q.skills.filter(
    (s) => !skillsInTitleOrTags.includes(s) && wordIn(body, s.toLowerCase())
  );
  const skillHits = [...skillsInTitleOrTags, ...skillsInBody];

  const coverage = searchTerms.length ? hitWhere.size / searchTerms.length : 1;
  const strongHits = titleHits + tagHits + companyHits;

  // Did the part of the query that actually narrows things down land somewhere
  // that counts? A Java Developer posting that merely mentions "frontend" in a
  // paragraph about the team is not a frontend job, so body-only hits on the
  // discriminating term do not qualify.
  const specificTerms = searchTerms.filter((t) => !GENERIC_ROLE_WORDS.has(t));
  const specificStrong = specificTerms.filter((t) => {
    const w = hitWhere.get(t);
    return w === 'title' || w === 'tag' || w === 'company';
  });
  const hasSpecificSignal =
    specificTerms.length === 0 || specificStrong.length > 0 || skillsInTitleOrTags.length > 0;

  // ---- relevance gate ----
  // Browse mode (no constraints at all) shows everything; otherwise a posting
  // needs a real signal in its title/tags/company, or two strong skill hits.
  let relevant: boolean;
  let related = false;
  if (q.isBrowse) {
    relevant = true;
  } else if (searchTerms.length === 0 && q.skills.length === 0) {
    // Location-only or remote-only search: the hard filters above already
    // established the match, so anything that got here qualifies.
    relevant = true;
  } else {
    const structurallyStrong = (strongHits >= 1 && coverage >= 0.34) || skillsInTitleOrTags.length >= 2;
    relevant = hasSpecificSignal && structurallyStrong;

    // Adjacent fallback: the posting is in the same occupation family and has
    // real title evidence, but missed the discriminating word. Worth offering
    // *after* the exact matches, clearly flagged — not worth discarding.
    if (!relevant && structurallyStrong && titleHits >= 1 && q.family) {
      if (familyOfTitle(job.title) === q.family) {
        relevant = true;
        related = true;
      }
    }
  }

  // Cross-domain reject: "product designer" must not return a sales role just
  // because the description happens to contain the word "product". With no
  // title evidence at all, the posting has to at least belong to the same
  // occupation family — an "Office Assistant" tagged "frontend" by a noisy feed
  // is not a frontend job.
  if (relevant && q.family && titleHits === 0 && skillsInTitleOrTags.length < 2) {
    const jobFamily = familyOfTitle(job.title);
    if (jobFamily !== q.family) {
      return { job, score: 0, reasons, relevant: false, rejection: 'offTopic' };
    }
  }

  if (!relevant) {
    return { job, score: 0, reasons, relevant: false, rejection: 'offTopic' };
  }

  // ---- score ----
  // The denominator scales with how much the user asked for, so a posting has
  // to satisfy MORE of a specific query to reach the same number. Body-only
  // skill mentions are worth a third of a title/tag hit.
  const raw =
    titleHits * 16 +
    tagHits * 8 +
    companyHits * 9 +
    bodyHits * 2 +
    skillsInTitleOrTags.length * 7 +
    skillsInBody.length * 2;
  const asked = Math.max(1, searchTerms.length + q.skills.length);
  const relevance = Math.min(1, raw / (asked * 15));

  let score = 46 + relevance * 40;
  score -= (1 - coverage) * 14;

  // Named-location asks: an exact location beats "remote and probably open".
  if (q.location) {
    if (locationHit) score += 6;
    else score -= 4;
  }
  if (q.seniority && job.experience_level === q.seniority) {
    score += 4;
    reasons.push(`${q.seniority} level`);
  }
  if (q.isRemote === true && job.is_remote) score += 2;
  // Tiebreaker toward postings a candidate in Africa can actually take. This is
  // an African-facing career page, so when two roles score the same, the one
  // that is open to the continent should be the one shown first.
  if (!q.location && AFRICA_REACHABLE.test(job.location)) {
    score += 3;
    reasons.push(`Open to ${job.location}`);
  }
  // Freshness, graded. A role posted this week is meaningfully more applicable
  // than one posted four months ago, but this stays a tiebreaker: it must never
  // float a weak match above a strong one.
  const age = job.age_days;
  if (age === undefined) {
    score -= 1; // no date published — mildly less trustworthy than a dated one
  } else if (age <= 7) {
    score += 5;
    reasons.push(`Posted ${job.posted_at.toLowerCase()}`);
  } else if (age <= 30) {
    score += 3;
    reasons.push(`Posted ${job.posted_at.toLowerCase()}`);
  } else if (age <= 90) {
    score += 1;
  } else {
    score -= 3;
  }
  if (job.salary_formatted) score += 1;

  // ---- honest match_reason, built only from what actually matched ----
  const evidence: string[] = [];
  if (titleMatched.length) {
    evidence.push(`Title matches ${titleMatched.slice(0, 2).map((t) => `“${t}”`).join(' + ')}`);
  } else if (tagMatched.length) {
    evidence.push(`Listed under ${tagMatched.slice(0, 2).join(', ')}`);
  }
  if (skillsInTitleOrTags.length) {
    evidence.push(`${skillsInTitleOrTags.slice(0, 3).join(', ')} in the stack`);
  } else if (skillsInBody.length) {
    evidence.push(`${skillsInBody.slice(0, 3).join(', ')} mentioned in the description`);
  }
  for (const r of reasons) {
    if (evidence.length >= 3) break;
    if (!evidence.includes(r)) evidence.push(r);
  }
  if (job.is_remote && evidence.length < 3 && !evidence.includes('Remote')) evidence.push('Remote');

  // A related role must say so, and must never outrank an exact match.
  if (related) {
    score -= 18;
    evidence.unshift('Related field');
  }

  return {
    job: {
      ...job,
      match_score: Math.round(Math.max(45, Math.min(98, score))),
      match_reason: evidence.length ? evidence.join(' · ') : 'Matches your search',
    },
    score,
    reasons: evidence,
    relevant: true,
    related,
  };
}

// ---------------------------------------------------------------------------
// Remote-focused public feeds. These complement the employer boards; they are
// broad but shallow, so the same relevance gate applies to their output.
// ---------------------------------------------------------------------------

const FEED_TIMEOUT_MS = 6000;

async function getFeed(url: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerBot/1.0)', Accept: 'application/json' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchRemotive(term: string): Promise<JobListing[]> {
  const url = term
    ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=40`
    : 'https://remotive.com/api/remote-jobs?limit=40';
  const data = await getFeed(url);
  const jobs = data?.jobs as Array<Record<string, unknown>> | undefined;
  if (!jobs?.length) return [];
  return jobs.map((j): JobListing => {
    const body = stripHtml((j.description as string) || '');
    return {
      id: `remotive-${j.id}`,
      title: (j.title as string) || 'Remote role',
      company: (j.company_name as string) || 'Company',
      company_logo: (j.company_logo as string) || undefined,
      location: (j.candidate_required_location as string) || 'Remote (Worldwide)',
      is_remote: true,
      job_type: j.job_type === 'full_time' ? 'Full-time' : 'Contract',
      experience_level: levelFrom((j.title as string) || ''),
      salary_formatted: (j.salary as string) || undefined,
      description: body,
      snippet: body.slice(0, 190) + (body.length > 190 ? '…' : ''),
      tags: Array.isArray(j.tags) ? (j.tags as string[]).slice(0, 6) : [],
      apply_url: (j.url as string) || '',
      career_page_url: (j.url as string) || '',
      source: 'Remotive',
      posted_at: relativeTime(j.publication_date as string),
      age_days: ageInDays(j.publication_date as string),
    };
  });
}

/**
 * Jobicy carries a meaningful number of Africa-open remote roles and supports
 * a geo filter, which Remotive does not.
 */
async function fetchJobicy(term: string, geo?: string): Promise<JobListing[]> {
  const params = new URLSearchParams({ count: '50' });
  if (term) params.set('tag', term);
  if (geo) params.set('geo', geo);
  const data = await getFeed(`https://jobicy.com/api/v2/remote-jobs?${params.toString()}`);
  const jobs = data?.jobs as Array<Record<string, unknown>> | undefined;
  if (!jobs?.length) return [];
  return jobs.map((j): JobListing => {
    const body = stripHtml(((j.jobExcerpt as string) || (j.jobDescription as string) || ''));
    const jobTypes = j.jobType as string[] | undefined;
    return {
      id: `jobicy-${j.id}`,
      title: (j.jobTitle as string) || 'Remote role',
      company: (j.companyName as string) || 'Company',
      company_logo: (j.companyLogo as string) || undefined,
      location: (j.jobGeo as string) || 'Remote (Worldwide)',
      is_remote: true,
      job_type: /part/i.test(jobTypes?.[0] || '') ? 'Part-time' : 'Full-time',
      experience_level: levelFrom((j.jobTitle as string) || '', j.jobLevel as string),
      salary_formatted:
        j.annualSalaryMin && j.annualSalaryMax
          ? `${(j.salaryCurrency as string) || 'USD'} ${Number(j.annualSalaryMin).toLocaleString()} – ${Number(j.annualSalaryMax).toLocaleString()}`
          : undefined,
      description: body,
      snippet: body.slice(0, 190) + (body.length > 190 ? '…' : ''),
      tags: Array.isArray(j.jobIndustry) ? (j.jobIndustry as string[]).slice(0, 4) : [],
      apply_url: (j.url as string) || '',
      career_page_url: (j.url as string) || '',
      source: 'Jobicy',
      posted_at: relativeTime(j.pubDate as string),
      age_days: ageInDays(j.pubDate as string),
    };
  });
}

async function fetchArbeitnow(): Promise<JobListing[]> {
  const data = await getFeed('https://www.arbeitnow.com/api/job-board-api');
  const dataList = data?.data as Array<Record<string, unknown>> | undefined;
  if (!dataList?.length) return [];
  return dataList.slice(0, 100).map((j): JobListing => {
    const body = stripHtml((j.description as string) || '');
    const posted = j.created_at ? (j.created_at as number) * 1000 : undefined;
    return {
      id: `arbeitnow-${j.slug}`,
      title: (j.title as string) || 'Open role',
      company: (j.company_name as string) || 'Company',
      location: (j.location as string) || (j.remote ? 'Remote (Europe)' : 'Europe'),
      is_remote: !!j.remote,
      job_type: 'Full-time',
      experience_level: levelFrom((j.title as string) || ''),
      description: body,
      snippet: body.slice(0, 190) + (body.length > 190 ? '…' : ''),
      tags: Array.isArray(j.tags) ? (j.tags as string[]).slice(0, 5) : [],
      apply_url: (j.url as string) || '',
      career_page_url: (j.url as string) || '',
      source: 'Arbeitnow',
      posted_at: relativeTime(posted),
      age_days: ageInDays(posted),
    };
  });
}

// ---------------------------------------------------------------------------
// Inkdesk — a Nigerian job board (WP Job Manager) with a real RSS job feed.
//
// This is the only source from the requested shortlist that publishes anything
// machine-readable: MyJobMag has no feed and no JobPosting metadata, the
// HotNigerianJobs RSS has not been rebuilt since June 2021, and Indeed,
// Glassdoor and Arc have no open API at all. Inkdesk's feed is live (items
// hours old at verification) and its `search_keywords` parameter filters
// server-side, which is what makes it worth a request.
//
// It is an aggregator, not an employer board, so its `apply_url` lands on
// Inkdesk's listing page rather than the company's own form. Cards carry
// `source: 'Inkdesk'` so that is visible rather than implied.
// ---------------------------------------------------------------------------

async function getText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerBot/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Numeric and named XML entities, which WordPress emits liberally in titles. */
function decodeXml(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function tagValue(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeXml(m[1]).replace(/\s+/g, ' ').trim() : '';
}

function tagValues(item: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(item))) {
    const v = decodeXml(m[1]).replace(/\s+/g, ' ').trim();
    if (v) out.push(v);
  }
  return out;
}

/** Nigerian cities the feed names in titles, used to place a posting. */
const NG_CITY =
  /\b(lagos|abuja|ibadan|port harcourt|kano|ikeja|lekki|yaba|benin city|enugu|kaduna|abeokuta|uyo|jos|ilorin|onitsha|owerri|calabar|warri|asaba)\b/i;

async function fetchInkdesk(term: string): Promise<JobListing[]> {
  const params = new URLSearchParams({ feed: 'job_feed' });
  if (term) params.set('search_keywords', term);
  const xml = await getText(`https://jobs.inkdeskng.org/?${params.toString()}`);
  if (!xml) return [];

  const items = xml.split(/<item>/).slice(1);
  const jobs: JobListing[] = [];

  for (const item of items) {
    const rawTitle = tagValue(item, 'title');
    const link = tagValue(item, 'link');
    if (!rawTitle || !link) continue;

    // The feed carries no company or location tag, but its titles follow a
    // consistent "Role at Employer" convention. The " at " has to be found in
    // the WHOLE title before any suffix is stripped — titles like
    // "UI/UX Designer – AI Products (Remote) at Hired" put the employer after
    // the dash, so splitting on the dash first loses it entirely.
    const atMatch = rawTitle.match(/^([\s\S]*?)\s+\bat\b\s+([^–—]+?)(?:\s+[–—]\s+.*)?$/i);
    let title = (atMatch ? atMatch[1] : rawTitle).trim();
    const company = atMatch ? atMatch[2].trim() : '';
    // Drop trailing arrangement notes from the role name itself.
    title = title
      .replace(/\s*[–—]\s*(fully\s+)?(remote|hybrid|on[- ]?site|onsite)\b.*$/i, '')
      .replace(/\s*\((fully\s+)?(remote|hybrid|on[- ]?site|onsite)\)\s*$/i, '')
      .replace(/\s*[–—]\s*$/, '')
      .trim();
    if (!title) continue;
    // No employer in the title means we cannot attribute the posting, and an
    // invented placeholder reads as a bug on the card. Skip it instead.
    if (!company) continue;

    const body = tagValue(item, 'content:encoded') || tagValue(item, 'description');
    const plain = stripHtml(body);
    const jobType = tagValue(item, 'job_listing:job_type');
    const categories = tagValues(item, 'job_listing:job_category');
    const posted = tagValue(item, 'pubDate');

    const arrangementText = `${rawTitle} ${jobType}`;
    const isRemote = /\b(remote|work from home|wfh)\b/i.test(arrangementText);
    const city = rawTitle.match(NG_CITY) || plain.slice(0, 400).match(NG_CITY);
    const location = city
      ? `${city[1].replace(/\b\w/g, (c) => c.toUpperCase())}, Nigeria`
      : isRemote
        ? 'Remote (Nigeria)'
        : 'Nigeria';

    jobs.push({
      id: `inkdesk-${link.split('/').filter(Boolean).pop()}`,
      title,
      company,
      location,
      is_remote: isRemote,
      job_type: /part/i.test(jobType) ? 'Part-time'
        : /intern/i.test(`${jobType} ${title}`) ? 'Internship'
        : /contract|freelance/i.test(jobType) ? 'Contract'
        : 'Full-time',
      experience_level: levelFrom(title, jobType),
      description: plain,
      snippet: plain.slice(0, 190) + (plain.length > 190 ? '…' : ''),
      tags: categories.slice(0, 5),
      apply_url: link,
      career_page_url: link,
      source: 'Inkdesk',
      posted_at: relativeTime(posted),
      age_days: ageInDays(posted),
    });
  }
  return jobs;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/** Jobicy geo slugs for the countries we can map. */
const JOBICY_GEO: Record<string, string> = {
  NG: 'nigeria', KE: 'kenya', ZA: 'south-africa', GH: 'ghana', EG: 'egypt',
  AFRICA: 'africa', UK: 'united-kingdom', US: 'usa', CA: 'canada', EU: 'europe', IN: 'india',
};

export async function runSearch(rawQuery: string, limit = 40): Promise<SearchResult> {
  const parsed = parseQuery(rawQuery);
  const term = toSearchTerm(parsed);
  const country = parsed.location?.country;

  const boards = selectBoards(country, country ? 9 : 7);

  // Remote feeds only make sense when the user has not ruled remote out.
  const wantsFeeds = parsed.isRemote !== false;
  // Inkdesk is a Nigerian board, so it is only worth a request when the search
  // is unscoped or actually pointed at Nigeria / the continent.
  const wantsInkdesk = !country || country === 'NG' || country === 'AFRICA';

  const [boardJobs, remotive, jobicy, arbeitnow, inkdesk] = await Promise.all([
    fetchBoards(boards),
    wantsFeeds ? fetchRemotive(term) : Promise.resolve([]),
    wantsFeeds ? fetchJobicy(term, country ? JOBICY_GEO[country] : undefined) : Promise.resolve([]),
    wantsFeeds && (!country || ['EU', 'DE', 'UK'].includes(country)) ? fetchArbeitnow() : Promise.resolve([]),
    wantsInkdesk ? fetchInkdesk(term) : Promise.resolve([]),
  ]);

  const sourcesQueried = [
    ...boards.map((b) => b.company),
    ...(remotive.length ? ['Remotive'] : []),
    ...(jobicy.length ? ['Jobicy'] : []),
    ...(arbeitnow.length ? ['Arbeitnow'] : []),
    ...(inkdesk.length ? ['Inkdesk'] : []),
  ];

  // ---- dedupe on company + title ----
  const all = [...boardJobs, ...remotive, ...jobicy, ...arbeitnow, ...inkdesk];
  const seen = new Set<string>();
  const unique: JobListing[] = [];
  for (const job of all) {
    if (!job.apply_url) continue;
    const key = `${job.company.toLowerCase().trim()}|${job.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(job);
  }

  // ---- score and gate ----
  const rejected = { offTopic: 0, wrongLocation: 0, wrongArrangement: 0, stale: 0 };
  const exact: Scored[] = [];
  const relatedPool: Scored[] = [];
  for (const job of unique) {
    const scored = scoreJob(job, parsed);
    if (scored.relevant) (scored.related ? relatedPool : exact).push(scored);
    else if (scored.rejection) rejected[scored.rejection] += 1;
  }

  exact.sort((a, b) => b.score - a.score);
  relatedPool.sort((a, b) => b.score - a.score);

  // Related roles only appear once the exact matches run out, and never more
  // than a third of the grid — they are a courtesy, not filler.
  const kept = [...exact];
  if (exact.length < limit) {
    kept.push(...relatedPool.slice(0, Math.min(6, limit - exact.length)));
  }

  // Keep the grid varied: at most 3 roles per company for small previews, or up to 8 for broad searches
  const maxPerCompany = limit > 12 ? 8 : 3;
  const perCompany = new Map<string, number>();
  const jobs: JobListing[] = [];
  for (const s of kept) {
    const c = s.job.company.toLowerCase();
    const n = perCompany.get(c) || 0;
    if (n >= maxPerCompany) continue;
    perCompany.set(c, n + 1);
    jobs.push(s.job);
    if (jobs.length >= limit) break;
  }

  return {
    jobs,
    diagnostics: {
      parsed,
      sourcesQueried: [...new Set(sourcesQueried)],
      fetched: unique.length,
      relevant: exact.length,
      related: jobs.filter((j) => j.match_reason?.startsWith('Related field')).length,
      rejected,
    },
  };
}

/** Structured-filter entry point used by /api/jobs/search. */
export async function searchJobs(query: JobSearchQuery): Promise<JobListing[]> {
  const parts = [
    query.query || query.role || '',
    ...(query.skills || []),
    query.experience_level && query.experience_level !== 'All' ? query.experience_level : '',
    query.location || '',
    query.is_remote === true ? 'remote' : query.is_remote === false ? 'on-site' : '',
  ].filter(Boolean);
  const { jobs } = await runSearch(parts.join(' '), query.limit || 9);
  return jobs;
}

export { BOARDS };
