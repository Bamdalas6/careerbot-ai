import type { JobListing, JobSearchQuery } from '@/types/job';
import {
  type ParsedQuery,
  parseQuery,
  toSearchTerm,
  familyOfTitle,
  locationMatches,
  locationAllowsRemote,
  STOPWORDS,
} from './query-parser';
import { BOARDS, fetchBoards, selectBoards, levelFrom, relativeTime, ageInDays, EXCLUDED_COMPANIES, isCompanyExcluded, isJobicyExcluded } from './ats-boards';
import { getCrawledJobs } from './db';

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
  if (isJobicyExcluded(job)) {
    return { job, score: 0, reasons: [], relevant: false, rejection: 'offTopic' };
  }
  const title = (job.title || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  const tags = Array.isArray(job.tags) ? job.tags : [];
  const tagText = tags.join(' ').toLowerCase();
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

function stripHtml(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Numeric and named XML entities, which WordPress and RSS feeds emit liberally in titles. */
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

async function getJsonFeed(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerBot/2.0)', Accept: 'application/json' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CareerBot/2.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
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

async function fetchRemotive(term: string): Promise<JobListing[]> {
  try {
    const url = term
      ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=40`
      : 'https://remotive.com/api/remote-jobs?limit=40';
    const data = (await getJsonFeed(url)) as { jobs?: Array<Record<string, unknown>> } | null;
    const jobs = data?.jobs;
    if (!jobs?.length) return [];
    return jobs
      .filter((j) => {
        const comp = String(j.company_name || '').toLowerCase().trim();
        return !isCompanyExcluded(comp);
      })
      .map((j): JobListing => {
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
  } catch (err) {
    console.warn('Remotive fetch error:', err);
    return [];
  }
}

/**
 * Map free-form search terms to valid RemoteOK tag slugs.
 */
function toRemoteOkTag(term: string): string | null {
  if (!term) return null;
  const lower = term.toLowerCase().trim();
  if (lower.includes('c++')) return 'dev';
  if (lower.includes('c#') || lower.includes('csharp')) return 'csharp';
  if (lower.includes('.net') || lower.includes('dotnet')) return 'dotnet';
  if (lower.includes('frontend') || lower.includes('front-end') || lower.includes('react') || lower.includes('vue') || lower.includes('angular')) return 'frontend';
  if (lower.includes('backend') || lower.includes('back-end') || lower.includes('node') || lower.includes('django') || lower.includes('rails')) return 'backend';
  if (lower.includes('fullstack') || lower.includes('full-stack')) return 'fullstack';
  if (lower.includes('devops') || lower.includes('sre') || lower.includes('cloud') || lower.includes('kubernetes')) return 'devops';
  if (lower.includes('engineer') || lower.includes('engineering') || lower.includes('developer') || lower.includes('software')) return 'engineer';
  if (lower.includes('python')) return 'python';
  if (lower.includes('javascript') || lower.includes('typescript')) return 'javascript';
  if (lower.includes('design') || lower.includes('designer') || lower.includes('ui') || lower.includes('ux')) return 'design';
  if (lower.includes('product')) return 'product';
  if (lower.includes('marketing') || lower.includes('growth')) return 'marketing';
  if (lower.includes('sales')) return 'sales';

  const firstWord = lower.split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '');
  return firstWord && firstWord.length >= 2 ? firstWord : null;
}

/**
 * Fetch global remote jobs from RemoteOK API with tag search and location filtering.
 */
async function fetchRemoteOk(term: string, country?: string): Promise<JobListing[]> {
  try {
    const tag = toRemoteOkTag(term);
    const url = tag
      ? `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`
      : 'https://remoteok.com/api';
    let data = await getJsonFeed(url);

    // If tag query produced no jobs (<= 1 item is only legal metadata), fall back to main feed
    if (tag && (!Array.isArray(data) || data.length <= 1)) {
      data = await getJsonFeed('https://remoteok.com/api');
    }

    if (!Array.isArray(data)) return [];

    // Item 0 is the legal metadata
    const rawJobs = data.slice(1) as Array<Record<string, unknown>>;
    if (!rawJobs.length) return [];

    const results: JobListing[] = [];
    for (const j of rawJobs) {
      const comp = String(j.company || '').trim();
      if (!comp || isCompanyExcluded(comp)) continue;

      const location = String(j.location || 'Remote (Worldwide)');

      // Location filtering: if country is Africa/Nigeria, exclude jobs explicitly restricted to other regions
      if (country) {
        const locLower = location.toLowerCase();
        if ((country === 'NG' || country === 'AFRICA') && /\b(us|usa|north america|canada|latam|apac)\s*only\b/i.test(locLower)) {
          continue;
        }
      }

      const title = String(j.position || 'Remote role');
      const body = stripHtml(String(j.description || ''));
      const posted = (j.date as string) || (typeof j.epoch === 'number' ? j.epoch * 1000 : undefined);
      const applyUrl = String(j.apply_url || j.url || (j.id ? `https://remoteok.com/l/${j.id}` : ''));

      results.push({
        id: `remoteok-${j.id || Math.random().toString(36).slice(2, 8)}`,
        title,
        company: comp,
        company_logo: (j.company_logo as string) || (j.logo as string) || undefined,
        location,
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        salary_formatted:
          j.salary_min && j.salary_max
            ? `USD ${Number(j.salary_min).toLocaleString()} – ${Number(j.salary_max).toLocaleString()}`
            : (j.salary as string | undefined),
        description: body,
        snippet: body.slice(0, 190) + (body.length > 190 ? '…' : ''),
        tags: Array.isArray(j.tags) ? (j.tags as string[]).slice(0, 6) : ['Remote', 'Tech'],
        apply_url: applyUrl,
        career_page_url: String(j.url || applyUrl),
        source: 'RemoteOK',
        posted_at: relativeTime(posted),
        age_days: ageInDays(posted),
      });
      if (results.length >= 40) break;
    }
    return results;
  } catch (err) {
    console.warn('RemoteOK fetch error:', err);
    return [];
  }
}

/**
 * Map search terms to the most relevant public WeWorkRemotely category RSS feed.
 */
function toWwrFeedUrl(term?: string): string {
  if (!term) return 'https://weworkremotely.com/remote-jobs.rss';
  const lower = term.toLowerCase();
  if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('creative')) {
    return 'https://weworkremotely.com/categories/remote-design-jobs.rss';
  }
  if (lower.includes('devops') || lower.includes('sysadmin') || lower.includes('sre') || lower.includes('cloud') || lower.includes('platform')) {
    return 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss';
  }
  if (lower.includes('product') || lower.includes('pm')) {
    return 'https://weworkremotely.com/categories/remote-product-jobs.rss';
  }
  if (lower.includes('customer') || lower.includes('support') || lower.includes('service')) {
    return 'https://weworkremotely.com/categories/remote-customer-support-jobs.rss';
  }
  if (lower.includes('finance') || lower.includes('accounting') || lower.includes('management') || lower.includes('operations')) {
    return 'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss';
  }
  if (
    lower.includes('developer') || lower.includes('engineer') || lower.includes('programming') ||
    lower.includes('software') || lower.includes('frontend') || lower.includes('backend') ||
    lower.includes('fullstack') || lower.includes('python') || lower.includes('react') ||
    lower.includes('javascript') || lower.includes('typescript') || lower.includes('golang') ||
    lower.includes('java') || lower.includes('c++') || lower.includes('c#') || lower.includes('dotnet')
  ) {
    return 'https://weworkremotely.com/categories/remote-programming-jobs.rss';
  }
  return 'https://weworkremotely.com/remote-jobs.rss';
}

/**
 * Fetch verified remote postings from WeWorkRemotely public category and search RSS feeds.
 */
async function fetchWeWorkRemotely(term?: string): Promise<JobListing[]> {
  try {
    const url = toWwrFeedUrl(term);
    let xml = await getText(url);
    if (!xml && url !== 'https://weworkremotely.com/remote-jobs.rss') {
      xml = await getText('https://weworkremotely.com/remote-jobs.rss');
    }
    if (!xml) return [];

    const items = xml.split(/<item[\s>]/).slice(1);
    const jobs: JobListing[] = [];

    for (const item of items) {
      const rawTitle = tagValue(item, 'title');
      const link = tagValue(item, 'link') || tagValue(item, 'guid');
      if (!rawTitle || !link) continue;

      const titleMatch = rawTitle.match(/^([^:]+):\s*(.*)$/);
      const company = titleMatch ? titleMatch[1].trim() : 'Remote Employer';
      const title = titleMatch ? titleMatch[2].trim() : rawTitle;

      if (isCompanyExcluded(company)) continue;

      const region = tagValue(item, 'region') || 'Remote (Worldwide)';
      const category = tagValue(item, 'category');
      const body = tagValue(item, 'description');
      const plain = stripHtml(body);
      const posted = tagValue(item, 'pubDate');

      jobs.push({
        id: `wwr-${link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title,
        company,
        location: region.toLowerCase().includes('remote') ? region : `Remote (${region})`,
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: plain,
        snippet: plain.slice(0, 190) + (plain.length > 190 ? '…' : ''),
        tags: [category, 'Remote'].filter(Boolean),
        apply_url: link,
        career_page_url: link,
        source: 'WeWorkRemotely',
        posted_at: relativeTime(posted),
        age_days: ageInDays(posted),
      });
      if (jobs.length >= 40) break;
    }
    return jobs;
  } catch (err) {
    console.warn('WeWorkRemotely fetch error:', err);
    return [];
  }
}

/**
 * Fetch modern remote tech roles from Himalayas JSON API.
 */
async function fetchHimalayas(_term?: string): Promise<JobListing[]> {
  try {
    const url = 'https://himalayas.app/jobs/api';
    const data = (await getJsonFeed(url)) as { jobs?: Array<Record<string, unknown>> } | null;
    if (!Array.isArray(data?.jobs)) return [];

    const results: JobListing[] = [];
    for (const j of data.jobs) {
      const comp = String(j.companyName || '').trim();
      if (!comp || isCompanyExcluded(comp)) continue;

      const title = String(j.title || 'Remote role');
      const body = stripHtml(String(j.description || j.excerpt || ''));
      const link = String(j.applicationLink || '');
      if (!link) continue;

      const pubSecs = typeof j.pubDate === 'number' ? j.pubDate * 1000 : undefined;
      const restrictions = Array.isArray(j.locationRestrictions) && j.locationRestrictions.length
        ? (j.locationRestrictions as string[]).join(', ')
        : 'Remote (Worldwide)';

      results.push({
        id: `him-${j.guid || link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title,
        company: comp,
        company_logo: (j.companyLogo as string) || undefined,
        location: restrictions,
        is_remote: true,
        job_type: String(j.employmentType || 'Full-time'),
        experience_level: levelFrom(title, Array.isArray(j.seniority) ? String(j.seniority[0]) : undefined),
        salary_formatted:
          j.minSalary && j.maxSalary
            ? `${String(j.currency || 'USD')} ${Number(j.minSalary).toLocaleString()} – ${Number(j.maxSalary).toLocaleString()}`
            : undefined,
        description: body,
        snippet: body.slice(0, 190) + (body.length > 190 ? '…' : ''),
        tags: Array.isArray(j.categories) ? (j.categories as string[]).slice(0, 5) : ['Remote', 'Tech'],
        apply_url: link,
        career_page_url: link,
        source: 'Himalayas',
        posted_at: relativeTime(pubSecs),
        age_days: ageInDays(pubSecs),
      });
      if (results.length >= 35) break;
    }
    return results;
  } catch (err) {
    console.warn('Himalayas fetch error:', err);
    return [];
  }
}

/**
 * Fetch global remote tech jobs from Working Nomads API.
 */
async function fetchWorkingNomads(_term?: string): Promise<JobListing[]> {
  try {
    const url = 'https://www.workingnomads.com/api/exposed_jobs/';
    const data = await getJsonFeed(url);
    if (!Array.isArray(data)) return [];

    const results: JobListing[] = [];
    for (const j of data as Array<Record<string, unknown>>) {
      const comp = String(j.company_name || '').trim();
      if (!comp || isCompanyExcluded(comp)) continue;

      const title = String(j.title || 'Remote role');
      const link = String(j.url || '');
      if (!link) continue;

      const body = stripHtml(String(j.description || ''));
      const loc = String(j.location || '');
      const location = loc === 'WORLDWIDE' ? 'Remote (Worldwide)' : (loc || 'Remote');
      const tags = typeof j.tags === 'string'
        ? (j.tags as string).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5)
        : ['Remote', 'Tech'];

      results.push({
        id: `wn-${link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title,
        company: comp,
        location,
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: body,
        snippet: body.slice(0, 190) + (body.length > 190 ? '…' : ''),
        tags,
        apply_url: link,
        career_page_url: link,
        source: 'Working Nomads',
        posted_at: relativeTime(j.pub_date as string),
        age_days: ageInDays(j.pub_date as string),
      });
      if (results.length >= 35) break;
    }
    return results;
  } catch (err) {
    console.warn('Working Nomads fetch error:', err);
    return [];
  }
}

async function fetchJobspresso(): Promise<JobListing[]> {
  try {
    let xml = await getText('https://jobspresso.co/jobs/feed/');
    if (!xml || !xml.includes('<item')) {
      xml = await getText('https://jobspresso.co/feed/');
    }
    if (!xml) return [];

    const items = xml.split(/<item[\s>]/).slice(1);
    const jobs: JobListing[] = [];

    for (const item of items) {
      const rawTitle = tagValue(item, 'title');
      const link = tagValue(item, 'link');
      if (!rawTitle || !link) continue;

      const creator = tagValue(item, 'dc:creator');
      const parts = creator.split(/<br\s*\/?>|⚲|&nbsp;/i).map((s) => stripHtml(s).trim()).filter(Boolean);
      const company = parts[0] || 'Remote Employer';
      const loc = parts[1] || 'Worldwide';

      if (isCompanyExcluded(company)) continue;

      const body = tagValue(item, 'content:encoded') || tagValue(item, 'description');
      const plain = stripHtml(body);
      const posted = tagValue(item, 'pubDate');

      jobs.push({
        id: `jp-${link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title: rawTitle,
        company,
        location: loc.toLowerCase().includes('remote') ? loc : `Remote (${loc})`,
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(rawTitle),
        description: plain,
        snippet: plain.slice(0, 190) + (plain.length > 190 ? '…' : ''),
        tags: ['Remote', 'Jobspresso'],
        apply_url: link,
        career_page_url: link,
        source: 'Jobspresso',
        posted_at: relativeTime(posted),
        age_days: ageInDays(posted),
      });
      if (jobs.length >= 30) break;
    }
    return jobs;
  } catch (err) {
    console.warn('Jobspresso fetch error:', err);
    return [];
  }
}

async function fetchArbeitnow(): Promise<JobListing[]> {
  try {
    const data = (await getJsonFeed('https://www.arbeitnow.com/api/job-board-api')) as { data?: Array<Record<string, unknown>> } | null;
    const dataList = data?.data;
    if (!dataList?.length) return [];
    return dataList.slice(0, 50).map((j): JobListing => {
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
  } catch (err) {
    console.warn('Arbeitnow fetch error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Inkdesk — a Nigerian job board (WP Job Manager) with a real RSS job feed.
// ---------------------------------------------------------------------------

/** Nigerian cities the feed names in titles, used to place a posting. */
const NG_CITY =
  /\b(lagos|abuja|ibadan|port harcourt|kano|ikeja|lekki|yaba|benin city|enugu|kaduna|abeokuta|uyo|jos|ilorin|onitsha|owerri|calabar|warri|asaba)\b/i;

async function fetchInkdesk(term: string): Promise<JobListing[]> {
  try {
    const params = new URLSearchParams({ feed: 'job_feed' });
    if (term) params.set('search_keywords', term);
    const xml = await getText(`https://jobs.inkdeskng.org/?${params.toString()}`);
    if (!xml) return [];

    const items = xml.split(/<item[\s>]/i).slice(1);
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
      if (isCompanyExcluded(company)) continue;

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
  } catch (err) {
    console.warn('Inkdesk fetch error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

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

  const [
    boardJobs,
    remotive,
    remoteOk,
    weWorkRemotely,
    himalayas,
    workingNomads,
    jobspresso,
    arbeitnow,
    inkdesk,
    crawled,
  ] = await Promise.all([
    fetchBoards(boards).catch(() => []),
    (wantsFeeds ? fetchRemotive(term) : Promise.resolve([])).catch(() => []),
    (wantsFeeds ? fetchRemoteOk(term, country) : Promise.resolve([])).catch(() => []),
    (wantsFeeds ? fetchWeWorkRemotely(term) : Promise.resolve([])).catch(() => []),
    (wantsFeeds ? fetchHimalayas(term) : Promise.resolve([])).catch(() => []),
    (wantsFeeds ? fetchWorkingNomads(term) : Promise.resolve([])).catch(() => []),
    (wantsFeeds ? fetchJobspresso() : Promise.resolve([])).catch(() => []),
    (wantsFeeds && (!country || ['EU', 'DE', 'UK'].includes(country)) ? fetchArbeitnow() : Promise.resolve([])).catch(() => []),
    (wantsInkdesk ? fetchInkdesk(term) : Promise.resolve([])).catch(() => []),
    getCrawledJobs(150).catch(() => []),
  ]);

  const sourcesQueried = [
    ...boards.map((b) => b.company),
    ...(remotive.length ? ['Remotive'] : []),
    ...(remoteOk.length ? ['RemoteOK'] : []),
    ...(weWorkRemotely.length ? ['WeWorkRemotely'] : []),
    ...(himalayas.length ? ['Himalayas'] : []),
    ...(workingNomads.length ? ['Working Nomads'] : []),
    ...(jobspresso.length ? ['Jobspresso'] : []),
    ...(arbeitnow.length ? ['Arbeitnow'] : []),
    ...(inkdesk.length ? ['Inkdesk'] : []),
    ...(crawled.length ? ['Regional & Harvester Feeds'] : []),
  ];

  // ---- dedupe on company + title and exclude blacklisted companies ----
  const all = [
    ...boardJobs,
    ...remotive,
    ...remoteOk,
    ...weWorkRemotely,
    ...himalayas,
    ...workingNomads,
    ...jobspresso,
    ...arbeitnow,
    ...inkdesk,
    ...crawled,
  ];
  const seenKey = new Set<string>();
  const seenUrl = new Set<string>();
  const unique: JobListing[] = [];
  for (const job of all) {
    if (!job.apply_url || !job.title || !job.company) continue;
    if (isJobicyExcluded(job)) continue;
    const compLower = job.company.toLowerCase().trim();
    if (isCompanyExcluded(compLower)) continue; // Never include Moniepoint

    const normTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const key = `${compLower}|${normTitle}`;
    const urlLower = job.apply_url.trim().toLowerCase();

    if (seenKey.has(key) || seenUrl.has(urlLower)) continue;
    seenKey.add(key);
    seenUrl.add(urlLower);
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

  // Related roles appear once exact matches run out
  const kept = [...exact];
  if (exact.length < limit) {
    kept.push(...relatedPool.slice(0, Math.min(10, limit - exact.length)));
  }

  // Resilient discovery fallback: If strict title matching yielded 0 roles,
  // find the closest relevant jobs from our live pool so users are never left with an empty screen.
  if (kept.length === 0 && unique.length > 0) {
    const rawTokens = (parsed.terms.length > 0 ? parsed.terms : rawQuery.toLowerCase().split(/[^a-z0-9+#.]+/))
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
    const candidatePool = unique.filter((j) => {
      if (parsed.isRemote === true && !j.is_remote) return false;
      if (parsed.isRemote === false && j.is_remote) return false;
      return true;
    });

    const ranked = candidatePool.map((job) => {
      const text = `${job.title} ${job.company} ${job.tags?.join(' ') || ''} ${job.location}`.toLowerCase();
      let matches = 0;
      for (const t of rawTokens) {
        const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const start = /^\w/.test(t) ? '\\b' : '(?<=^|[^a-zA-Z0-9_])';
        const end = /\w$/.test(t) ? '\\b' : '(?=[^a-zA-Z0-9_]|$)';
        if (new RegExp(`${start}${esc}${end}`, 'i').test(text)) matches += 1;
      }
      return {
        job: {
          ...job,
          match_score: matches > 0 ? Math.min(85, 65 + matches * 6) : 60,
          match_reason: matches > 0 ? 'Matching your career interest' : 'Active opening in our live network',
        },
        score: matches,
      };
    });

    const matchedItems = ranked.filter((item) => item.score > 0);
    for (const item of matchedItems.slice(0, Math.min(limit, 15))) {
      kept.push({
        job: item.job,
        score: item.job.match_score || 65,
        reasons: ['Recommended role'],
        relevant: true,
        related: true,
      });
    }
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
