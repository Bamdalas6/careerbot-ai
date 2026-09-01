import { JobListing } from '@/types/job';

/**
 * Real employer job boards, fetched live from the free public ATS APIs.
 *
 * Every token in BOARDS was verified against the live endpoint with
 * scripts/probe-boards.mjs — a 404 or an empty payload means the token is wrong
 * and the board never makes it in here. Re-run that script if results dry up;
 * companies do migrate between ATS vendors.
 *
 * These are genuine postings on the employer's own board, which is the whole
 * point: every apply_url lands on the company's real application form rather
 * than an aggregator or a reseller.
 */

export type AtsProvider = 'greenhouse' | 'lever' | 'workable' | 'ashby';

export interface BoardRef {
  provider: AtsProvider;
  /** Token in the ATS URL, e.g. boards-api.greenhouse.io/v1/boards/<token>/jobs */
  token: string;
  company: string;
  /**
   * Where this employer actually hires. Used to pick which boards to query for
   * a given search instead of hammering all of them every time.
   * 'GLOBAL' means remote-first / hires worldwide.
   */
  regions: string[];
  /** Rough posting count at verification time, for ordering. */
  size: number;
}

export const BOARDS: BoardRef[] = [
  // ---- Nigeria ----
  { provider: 'greenhouse', token: 'moniepoint', company: 'Moniepoint', regions: ['NG', 'AFRICA'], size: 124 },
  { provider: 'workable', token: 'renmoney', company: 'Renmoney', regions: ['NG', 'AFRICA'], size: 113 },
  { provider: 'workable', token: 'fairmoney', company: 'FairMoney', regions: ['NG', 'AFRICA'], size: 38 },
  { provider: 'workable', token: 'kuda', company: 'Kuda', regions: ['NG', 'AFRICA'], size: 14 },
  { provider: 'workable', token: 'helium-health', company: 'Helium Health', regions: ['NG', 'AFRICA'], size: 3 },

  // ---- Pan-African ----
  { provider: 'greenhouse', token: 'oneacrefund', company: 'One Acre Fund', regions: ['NG', 'KE', 'RW', 'TZ', 'ET', 'ZM', 'AFRICA'], size: 39 },
  { provider: 'greenhouse', token: 'jumia', company: 'Jumia', regions: ['NG', 'GH', 'EG', 'KE', 'CI', 'AFRICA'], size: 26 },
  { provider: 'ashby', token: 'andela', company: 'Andela', regions: ['NG', 'KE', 'AFRICA', 'GLOBAL'], size: 17 },
  { provider: 'greenhouse', token: 'luno', company: 'Luno', regions: ['ZA', 'AFRICA', 'GLOBAL'], size: 9 },
  { provider: 'lever', token: 'copia', company: 'Copia Global', regions: ['KE', 'AFRICA', 'GLOBAL'], size: 8 },
  { provider: 'greenhouse', token: 'acumen', company: 'Acumen', regions: ['NG', 'KE', 'AFRICA', 'GLOBAL'], size: 5 },
  { provider: 'lever', token: 'apolloagriculture', company: 'Apollo Agriculture', regions: ['KE', 'ZM', 'AFRICA'], size: 2 },

  // ---- Global / remote-first (hire into Africa too) ----
  { provider: 'greenhouse', token: 'remotecom', company: 'Remote', regions: ['GLOBAL', 'AFRICA'], size: 226 },
  { provider: 'greenhouse', token: 'canonical', company: 'Canonical', regions: ['GLOBAL', 'AFRICA'], size: 303 },
  { provider: 'lever', token: 'tala', company: 'Tala', regions: ['KE', 'AFRICA', 'GLOBAL'], size: 10 },
  { provider: 'greenhouse', token: 'branch', company: 'Branch', regions: ['GLOBAL'], size: 9 },
];

const BOARD_TIMEOUT_MS = 6500;
const UA = 'Mozilla/5.0 (compatible; CareerBot/1.0)';

/** Greenhouse returns HTML-entity-encoded markup, so entities decode first. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function plainText(html: string): string {
  return decodeEntities(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetOf(text: string): string {
  const t = text.slice(0, 190).trim();
  return text.length > 190 ? `${t}…` : t;
}

async function getJson(url: string): Promise<Record<string, unknown> | unknown[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BOARD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      // Boards change a few times a day at most; 30 min keeps searches fast
      // without serving genuinely stale postings.
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) return null;
    return await res.json();
  } catch {
    // A single dead or slow board must never fail the whole search.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRemoteText(...parts: (string | undefined | null)[]): boolean {
  const s = parts.filter(Boolean).join(' ').toLowerCase();
  return /\b(remote|anywhere|worldwide|distributed|home[- ]based|telecommut)\b/.test(s);
}

/** Tags derived from a posting's own department/function metadata plus its text. */
function deriveTags(title: string, extra: string[], body: string): string[] {
  const tags = extra.filter(Boolean).map((t) => t.trim()).filter(Boolean);
  const haystack = `${title} ${body}`.toLowerCase();
  const probe = [
    'React', 'TypeScript', 'JavaScript', 'Python', 'Node.js', 'Java', 'Go', 'Kotlin',
    'Swift', 'Flutter', 'SQL', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Django',
    'Laravel', 'PHP', 'Figma', 'Excel', 'Power BI', 'Salesforce', 'Machine Learning',
  ];
  for (const p of probe) {
    if (tags.length >= 6) break;
    if (haystack.includes(p.toLowerCase()) && !tags.some((t) => t.toLowerCase() === p.toLowerCase())) {
      tags.push(p);
    }
  }
  return tags.slice(0, 6);
}

/**
 * Age of a posting in whole days, or undefined when the source gave no date.
 *
 * `posted_at` is a display string ("3w ago", "Recently") and cannot be filtered
 * on — a freshness cutoff has to compare numbers. Everything that builds a
 * JobListing sets `age_days` from the same timestamp it formats.
 */
function ageInDays(dateStr?: string | number | null): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  // A board with a clock skew can report tomorrow; treat that as today.
  return days < 0 ? 0 : days;
}

function relativeTime(dateStr?: string | number | null): string {
  const days = ageInDays(dateStr);
  if (days === undefined) return 'Recently';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function levelFrom(title: string, hint?: string): JobListing['experience_level'] {
  const t = `${title} ${hint || ''}`.toLowerCase();
  if (/\b(vp|vice president|chief|head of|director)\b/.test(t)) return 'Executive';
  if (/\b(lead|principal|staff|manager)\b/.test(t)) return 'Lead';
  if (/\b(senior|sr\.?|mid-senior)\b/.test(t)) return 'Senior';
  if (/\b(junior|jr\.?|intern|graduate|entry|trainee|associate)\b/.test(t)) return 'Entry';
  return 'Mid';
}

// ---------------------------------------------------------------------------
// Per-provider fetchers. Each returns [] on any failure.
// ---------------------------------------------------------------------------

async function fetchGreenhouse(board: BoardRef): Promise<JobListing[]> {
  const data = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`)) as Record<string, unknown> | null;
  const jobs = data?.jobs as Array<Record<string, unknown>> | undefined;
  if (!jobs?.length) return [];
  return jobs.map((j): JobListing => {
    const body = plainText((j.content as string) || '');
    const location = ((j.location as Record<string, unknown>)?.name as string) || 'Not specified';
    const departments = ((j.departments as Array<Record<string, unknown>>) || []).map((d) => d?.name as string).filter(Boolean);
    const posted = (j.first_published || j.updated_at) as string;
    return {
      id: `gh-${board.token}-${j.id}`,
      title: (j.title as string) || 'Open role',
      company: (j.company_name as string) || board.company,
      location,
      is_remote: isRemoteText(location, j.title as string),
      job_type: 'Full-time',
      experience_level: levelFrom((j.title as string) || ''),
      description: body,
      snippet: snippetOf(body),
      tags: deriveTags((j.title as string) || '', departments, body),
      apply_url: j.absolute_url as string,
      career_page_url: `https://job-boards.greenhouse.io/${board.token}`,
      source: 'Greenhouse',
      posted_at: relativeTime(posted),
      age_days: ageInDays(posted),
    };
  });
}

async function fetchLever(board: BoardRef): Promise<JobListing[]> {
  const data = (await getJson(`https://api.lever.co/v0/postings/${board.token}?mode=json`)) as Array<Record<string, unknown>> | null;
  if (!Array.isArray(data) || !data.length) return [];
  return data.map((j): JobListing => {
    const body = ((j.descriptionPlain as string) || plainText((j.description as string) || '')).replace(/\s+/g, ' ').trim();
    const categories = j.categories as Record<string, unknown> | undefined;
    const location = (categories?.location as string) || (j.country as string) || 'Not specified';
    return {
      id: `lv-${board.token}-${j.id}`,
      title: (j.text as string) || 'Open role',
      company: board.company,
      location,
      is_remote: j.workplaceType === 'remote' || isRemoteText(location, j.workplaceType as string),
      job_type: categories?.commitment === 'Part-time' ? 'Part-time' : 'Full-time',
      experience_level: levelFrom((j.text as string) || ''),
      description: body,
      snippet: snippetOf(body),
      tags: deriveTags((j.text as string) || '', [categories?.department as string, categories?.team as string].filter(Boolean), body),
      apply_url: (j.hostedUrl as string) || (j.applyUrl as string),
      career_page_url: `https://jobs.lever.co/${board.token}`,
      source: 'Lever',
      posted_at: relativeTime(j.createdAt as number),
      age_days: ageInDays(j.createdAt as number),
    };
  });
}

async function fetchWorkable(board: BoardRef): Promise<JobListing[]> {
  const data = (await getJson(`https://apply.workable.com/api/v1/widget/accounts/${board.token}?details=true`)) as Record<string, unknown> | null;
  const jobs = data?.jobs as Array<Record<string, unknown>> | undefined;
  if (!jobs?.length) return [];
  return jobs.map((j): JobListing => {
    const body = plainText((j.description as string) || '');
    const location = [j.city as string, j.state !== j.city ? (j.state as string) : null, j.country as string]
      .filter(Boolean)
      .join(', ') || (j.telecommuting ? 'Remote' : 'Not specified');
    return {
      id: `wk-${board.token}-${j.shortcode}`,
      title: (j.title as string) || 'Open role',
      company: (data?.name as string) || board.company,
      location,
      is_remote: !!j.telecommuting || isRemoteText(location, j.title as string),
      job_type: j.employment_type === 'Part-time' ? 'Part-time' : 'Full-time',
      experience_level: levelFrom((j.title as string) || '', j.experience as string),
      description: body,
      snippet: snippetOf(body),
      tags: deriveTags((j.title as string) || '', [j.department as string, j.function as string].filter(Boolean), body),
      apply_url: (j.application_url as string) || (j.url as string) || (j.shortlink as string),
      career_page_url: `https://apply.workable.com/${board.token}/`,
      source: 'Workable',
      posted_at: relativeTime(j.published_on as string),
      age_days: ageInDays(j.published_on as string),
    };
  });
}

async function fetchAshby(board: BoardRef): Promise<JobListing[]> {
  const data = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${board.token}`)) as Record<string, unknown> | null;
  const jobs = data?.jobs as Array<Record<string, unknown>> | undefined;
  if (!jobs?.length) return [];
  return jobs
    .filter((j) => j.isListed !== false)
    .map((j): JobListing => {
      const body = ((j.descriptionPlain as string) || plainText((j.descriptionHtml as string) || '')).replace(/\s+/g, ' ').trim();
      const address = j.address as Record<string, unknown> | undefined;
      const postalAddress = address?.postalAddress as Record<string, unknown> | undefined;
      const location = (j.location as string) || (postalAddress?.addressCountry as string) || 'Not specified';
      return {
        id: `ab-${board.token}-${j.id}`,
        title: j.title || 'Open role',
        company: board.company,
        location,
        is_remote: !!j.isRemote || isRemoteText(location, j.workplaceType as string),
        job_type: j.employmentType === 'PartTime' ? 'Part-time' : 'Full-time',
        experience_level: levelFrom((j.title as string) || ''),
        description: body,
        snippet: snippetOf(body),
        tags: deriveTags((j.title as string) || '', [j.department as string, j.team as string].filter(Boolean), body),
        apply_url: (j.applyUrl as string) || (j.jobUrl as string),
        career_page_url: `https://jobs.ashbyhq.com/${board.token}`,
        source: 'Ashby',
        posted_at: relativeTime(j.publishedAt as string),
        age_days: ageInDays(j.publishedAt as string),
      };
    });
}

const FETCHERS: Record<AtsProvider, (b: BoardRef) => Promise<JobListing[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  workable: fetchWorkable,
  ashby: fetchAshby,
};

/**
 * Pick which boards to query. Location-specific searches go to the employers
 * who actually hire there; everything else gets the largest boards. This keeps
 * a search to a handful of parallel requests rather than all fifteen.
 */
export function selectBoards(country: string | undefined, limit = 8): BoardRef[] {
  if (!country) {
    return [...BOARDS].sort((a, b) => b.size - a.size).slice(0, limit);
  }
  const exact = BOARDS.filter((b) => b.regions.includes(country));
  const african = country === 'AFRICA' ? BOARDS.filter((b) => b.regions.includes('AFRICA')) : [];
  const global = BOARDS.filter((b) => b.regions.includes('GLOBAL'));

  const picked: BoardRef[] = [];
  for (const group of [exact, african, global]) {
    for (const b of [...group].sort((x, y) => y.size - x.size)) {
      if (picked.length >= limit) break;
      if (!picked.some((p) => p.token === b.token && p.provider === b.provider)) picked.push(b);
    }
  }
  return picked;
}

/** Fetch every given board in parallel; failures contribute nothing. */
export async function fetchBoards(boards: BoardRef[]): Promise<JobListing[]> {
  const results = await Promise.all(
    boards.map(async (b) => {
      try {
        return await FETCHERS[b.provider](b);
      } catch {
        return [] as JobListing[];
      }
    })
  );
  return results.flat();
}

export { relativeTime, ageInDays, levelFrom, plainText };
