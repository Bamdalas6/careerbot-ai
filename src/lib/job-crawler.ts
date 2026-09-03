import type { JobListing } from '@/types/job';
import { BOARDS, fetchBoards, isCompanyExcluded, isJobicyExcluded, levelFrom, relativeTime, ageInDays } from './ats-boards';
import { saveCrawledJobs } from './db';

const CRAWLER_TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CareerBot/2.0';

function stripHtml(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

async function fetchWithTimeout(url: string, headers: Record<string, string> = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRAWLER_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
        ...headers,
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// 1. Regional African Job Boards (Jobberman, MyJobMag, NG Indeed, Inkdesk)
// ============================================================================

/**
 * Scrapes fresh Nigerian jobs from Jobberman (https://www.jobberman.com/jobs).
 */
export async function fetchJobbermanJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://www.jobberman.com/jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const cards = html.split(/data-cy="listing-cards-components"/).slice(1);
    const jobs: JobListing[] = [];

    for (const card of cards) {
      const linkMatch = card.match(/href="(https:\/\/www\.jobberman\.com\/listings\/[^"]+)"/);
      const titleMatch =
        card.match(/data-cy="listing-title-link"[^>]*title="([^"]+)"/) ||
        card.match(/<p class="[^"]*text-link-500[^"]*">([^<]+)<\/p>/);
      const companyMatch = card.match(/<p class="text-sm text-blue-700[^>]*>\s*([^<]+)\s*<\/p>/);
      const locMatch = card.match(/<span[^>]*bg-brand-secondary-100[^>]*>\s*([A-Za-z\s]+)\s*<\/span>/);
      const salaryMatch = card.match(/NGN\s*<span[^>]*>([^<]+)<\/span>/);

      if (!linkMatch || !titleMatch) continue;

      const title = stripHtml(titleMatch[1]);
      const company = companyMatch ? stripHtml(companyMatch[1]) : 'Nigerian Employer';
      if (isCompanyExcluded(company)) continue;

      const locText = locMatch ? stripHtml(locMatch[1]) : 'Lagos';
      const isRemote = /remote|work from home/i.test(`${title} ${card}`);
      const salary = salaryMatch ? `NGN ${stripHtml(salaryMatch[1])}` : undefined;
      const snippet = `${title} position at ${company} located in ${locText}. ${salary ? `Salary: ${salary}.` : ''} Full details and application on Jobberman.`;

      jobs.push({
        id: `jb-${linkMatch[1].split('/').filter(Boolean).pop()}`,
        title,
        company,
        location: isRemote ? `Remote (${locText}, Nigeria)` : `${locText}, Nigeria`,
        is_remote: isRemote,
        job_type: /part/i.test(card) ? 'Part-time' : /contract/i.test(card) ? 'Contract' : 'Full-time',
        experience_level: levelFrom(title),
        salary_formatted: salary,
        description: snippet,
        snippet: snippet.slice(0, 190) + (snippet.length > 190 ? '…' : ''),
        tags: ['Nigeria', 'Jobberman', locText],
        apply_url: linkMatch[1],
        career_page_url: linkMatch[1],
        source: 'Jobberman',
        posted_at: 'Recently',
        age_days: 2,
      });
    }
    return jobs;
  } catch (err) {
    console.warn('Jobberman scraper error:', err);
    return [];
  }
}

/**
 * Scrapes fresh Nigerian tech & corporate jobs from MyJobMag (https://www.myjobmag.com/jobs).
 */
export async function fetchMyJobMagJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://www.myjobmag.com/jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/<h2><a\s+[^>]*href="(\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/gi)];
    const jobs: JobListing[] = [];

    for (const m of matches) {
      const url = `https://www.myjobmag.com${m[1]}`;
      const rawText = stripHtml(m[2]);
      const atMatch = rawText.match(/^([\s\S]*?)\s+\bat\b\s+([^–—]+)$/i);
      const title = atMatch ? atMatch[1].trim() : rawText;
      const company = atMatch ? atMatch[2].trim() : 'Nigerian Employer';
      if (isCompanyExcluded(company)) continue;

      const isRemote = /remote/i.test(title);
      const snippet = `${title} opening at ${company} in Nigeria. View role requirements and apply via MyJobMag.`;

      jobs.push({
        id: `mjm-${m[1].split('/').filter(Boolean).pop()}`,
        title,
        company,
        location: isRemote ? 'Remote (Nigeria)' : 'Nigeria',
        is_remote: isRemote,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: snippet,
        snippet: snippet.slice(0, 190) + (snippet.length > 190 ? '…' : ''),
        tags: ['Nigeria', 'MyJobMag'],
        apply_url: url,
        career_page_url: url,
        source: 'MyJobMag',
        posted_at: 'Recently',
        age_days: 3,
      });
    }
    return jobs;
  } catch (err) {
    console.warn('MyJobMag scraper error:', err);
    return [];
  }
}

/**
 * Parses Nigerian listings from Indeed (NG Indeed).
 */
export async function fetchNgIndeedJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://ng.indeed.com/jobs?q=developer&l=Nigeria');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const jobs: JobListing[] = [];
    const matches = [...html.matchAll(/href="(\/rc\/clk\?[^"]+|\/viewjob\?[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

    for (const m of matches.slice(0, 20)) {
      const url = `https://ng.indeed.com${m[1].replace(/&amp;/g, '&')}`;
      const title = stripHtml(m[2]);
      if (title.length < 3) continue;

      jobs.push({
        id: `ind-${Math.random().toString(36).slice(2, 9)}`,
        title,
        company: 'Employer via Indeed',
        location: 'Nigeria',
        is_remote: /remote/i.test(title),
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: `${title} role in Nigeria listed on Indeed.`,
        snippet: `${title} role in Nigeria listed on Indeed.`,
        tags: ['Nigeria', 'Indeed'],
        apply_url: url,
        career_page_url: url,
        source: 'Indeed',
        posted_at: 'Recently',
        age_days: 4,
      });
    }
    return jobs;
  } catch {
    return [];
  }
}

/**
 * Fetch Nigerian jobs from Inkdesk Nigeria WP Job Manager RSS feed.
 */
export async function fetchInkdeskRssJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://jobs.inkdeskng.org/?feed=job_feed');
    if (!res || !res.ok) return [];
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1);
    const jobs: JobListing[] = [];

    for (const item of items) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i);
      const pubMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

      if (!titleMatch || !linkMatch) continue;

      const rawTitle = decodeXml(titleMatch[1]).trim();
      const link = decodeXml(linkMatch[1]).trim();
      const desc = descMatch ? stripHtml(descMatch[1]) : '';
      const pubDate = pubMatch ? decodeXml(pubMatch[1]).trim() : undefined;

      const atMatch = rawTitle.match(/^([\s\S]*?)\s+\bat\b\s+([^–—]+?)(?:\s+[–—]\s+.*)?$/i);
      const title = (atMatch ? atMatch[1] : rawTitle).trim();
      const company = (atMatch ? atMatch[2] : 'Nigerian Employer').trim();

      if (isCompanyExcluded(company)) continue;

      jobs.push({
        id: `ink-${link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 7)}`,
        title,
        company,
        location: 'Nigeria (Lagos, Abuja & Remote)',
        is_remote: desc.toLowerCase().includes('remote') || title.toLowerCase().includes('remote'),
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: desc.slice(0, 1000),
        snippet: desc.slice(0, 190) + (desc.length > 190 ? '…' : ''),
        tags: ['Nigeria', 'Tech', 'Inkdesk'],
        apply_url: link,
        career_page_url: link,
        source: 'Inkdesk',
        posted_at: relativeTime(pubDate),
        age_days: ageInDays(pubDate),
      });
    }

    return jobs;
  } catch (err) {
    console.warn('Inkdesk RSS fetch error:', err);
    return [];
  }
}

// ============================================================================
// 2. Startup & Tech Job Harvesters (Y Combinator, Wellfound, Contra, HiringCafe, Arc.dev)
// ============================================================================

/**
 * Scrapes top startup roles from Y Combinator (https://www.ycombinator.com/jobs).
 */
export async function fetchYCombinatorJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://www.ycombinator.com/jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/href="(\/companies\/([^/]+)\/jobs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const jobs: JobListing[] = [];

    for (const m of matches) {
      const link = m[1];
      const compSlug = m[2].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const rawTitle = stripHtml(m[3]);
      if (!rawTitle || rawTitle.includes('<img') || rawTitle.length < 3) continue;
      if (isCompanyExcluded(compSlug)) continue;

      const url = `https://www.ycombinator.com${link}`;
      const snippet = `Y Combinator startup opportunity: ${rawTitle} at ${compSlug}. Work with high-impact founders backed by YC.`;

      jobs.push({
        id: `yc-${link.split('/').filter(Boolean).pop()}`,
        title: rawTitle,
        company: compSlug,
        location: 'Remote (Worldwide / US)',
        is_remote: true,
        job_type: /intern/i.test(rawTitle) ? 'Internship' : 'Full-time',
        experience_level: levelFrom(rawTitle),
        description: snippet,
        snippet: snippet.slice(0, 190) + (snippet.length > 190 ? '…' : ''),
        tags: ['Y Combinator', 'Startup', 'Tech'],
        apply_url: url,
        career_page_url: url,
        source: 'Y Combinator',
        posted_at: 'Recently',
        age_days: 1,
      });
    }
    return jobs;
  } catch (err) {
    console.warn('YC scraper error:', err);
    return [];
  }
}

/**
 * Scrapes tech roles from Wellfound (formerly AngelList Talent).
 */
export async function fetchWellfoundJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://wellfound.com/jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const jobs: JobListing[] = [];

    // Parse individual job cards
    const jobMatches = [...html.matchAll(/href="(\/jobs\/\d+-[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const m of jobMatches) {
      const link = `https://wellfound.com${m[1]}`;
      const title = stripHtml(m[2]);
      if (!title || title.length < 3) continue;

      const idx = html.indexOf(m[0]);
      const surrounding = html.slice(idx, idx + 450);
      const compMatch = surrounding.match(/<span>([^<•]+)(?:<!-- -->)?\s*•\s*<\/span>/);
      const comp = compMatch ? stripHtml(compMatch[1]).trim() : 'Tech Startup';
      if (isCompanyExcluded(comp)) continue;

      const locMatch = surrounding.match(/<span class="text-gray-700">([\s\S]*?)<\/span>/);
      const rawLoc = locMatch ? stripHtml(locMatch[1]).replace(/\s+/g, ' ').trim() : 'Remote (Worldwide)';
      const isRemote = /remote/i.test(`${rawLoc} ${title}`);

      // Extract salary if available in the text
      const salaryMatch = rawLoc.match(/(\$[0-9kK\s–—-]+)/);
      const salary = salaryMatch ? salaryMatch[1].trim() : undefined;

      const snippet = `${title} opening at ${comp} on Wellfound. Location: ${rawLoc}.`;

      jobs.push({
        id: `wf-${m[1].split('/').filter(Boolean).pop()?.split('?')[0]}`,
        title,
        company: comp,
        location: isRemote && !rawLoc.toLowerCase().includes('remote') ? `Remote (${rawLoc})` : rawLoc,
        is_remote: isRemote,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        salary_formatted: salary,
        description: snippet,
        snippet: snippet.slice(0, 190) + (snippet.length > 190 ? '…' : ''),
        tags: ['Startup', 'Wellfound', 'Tech'],
        apply_url: link,
        career_page_url: link,
        source: 'Wellfound',
        posted_at: 'Recently',
        age_days: 2,
      });
    }

    // Also parse featured hiring startups if job cards were sparse
    if (jobs.length < 15) {
      const startupMatches = [...html.matchAll(/href="(\/company\/[^"]+\/jobs)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of startupMatches) {
        const url = `https://wellfound.com${m[1]}`;
        const slug = m[1].split('/')[2] || 'tech-startup';
        const comp = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (isCompanyExcluded(comp)) continue;

        const snippet = `Explore open startup positions at ${comp} on Wellfound.`;
        jobs.push({
          id: `wf-${slug}-jobs`,
          title: `Software & Product Opportunities at ${comp}`,
          company: comp,
          location: 'Remote (Worldwide)',
          is_remote: true,
          job_type: 'Full-time',
          experience_level: 'Mid-Level',
          description: snippet,
          snippet,
          tags: ['Startup', 'Wellfound', 'Tech'],
          apply_url: url,
          career_page_url: url,
          source: 'Wellfound',
          posted_at: 'Recently',
          age_days: 1,
        });
      }
    }

    return jobs;
  } catch (err) {
    console.warn('Wellfound scraper error:', err);
    return [];
  }
}

/**
 * Scrapes freelance and independent roles from Contra (https://contra.com/hire/ via public sitemap & hire pages).
 */
export async function fetchContraJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://contra.com/sitemaps/hire-pages/1.xml');
    if (!res || !res.ok) return [];
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>(https:\/\/contra\.com\/hire\/[^<]+)<\/loc>/g)].map((m) => m[1]);
    const jobs: JobListing[] = [];

    for (const url of urls.slice(0, 30)) {
      const slug = url.replace('https://contra.com/hire/', '');
      const words = slug.split('-');
      const inIdx = words.indexOf('in');
      const forIdx = words.indexOf('for');

      const titleWords = (inIdx !== -1 ? words.slice(0, inIdx) : words)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace(/\bUi\b/g, 'UI')
        .replace(/\bUx\b/g, 'UX')
        .replace(/\bAi\b/g, 'AI');

      const locWords = inIdx !== -1
        ? words.slice(inIdx + 1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : 'Remote (Worldwide)';

      const title = `${titleWords}${forIdx !== -1 ? ' Specialist' : ''}`;
      const snippet = `Freelance & contract opportunity for ${title} on Contra. Apply or submit proposal directly.`;

      jobs.push({
        id: `contra-${slug}`,
        title,
        company: 'Client via Contra',
        location: locWords.toLowerCase().includes('remote') ? locWords : `Remote (${locWords})`,
        is_remote: true,
        job_type: 'Contract',
        experience_level: levelFrom(title),
        description: snippet,
        snippet: snippet.slice(0, 190) + (snippet.length > 190 ? '…' : ''),
        tags: ['Freelance', 'Contract', 'Contra'],
        apply_url: url,
        career_page_url: url,
        source: 'Contra',
        posted_at: 'Recently',
        age_days: 2,
      });
    }
    return jobs;
  } catch (err) {
    console.warn('Contra fetch error:', err);
    return [];
  }
}

/**
 * Ingests roles from Hiring.Cafe.
 */
export async function fetchHiringCafeJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://hiring.cafe/recently-posted-jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const jobs: JobListing[] = [];
    const matches = [...html.matchAll(/href="(\/job\/[^"]+|\/jobs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const m of matches) {
      const url = `https://hiring.cafe${m[1]}`;
      const title = stripHtml(m[2]);
      if (!title || title.length < 3) continue;
      jobs.push({
        id: `hc-${m[1].split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title,
        company: 'Employer via HiringCafe',
        location: 'Remote (Worldwide)',
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: `${title} opportunity discovered on Hiring.Cafe.`,
        snippet: `${title} opportunity discovered on Hiring.Cafe.`,
        tags: ['Startup', 'Tech', 'HiringCafe'],
        apply_url: url,
        career_page_url: url,
        source: 'HiringCafe',
        posted_at: 'Recently',
        age_days: 2,
      });
      if (jobs.length >= 25) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

/**
 * Ingests remote tech jobs from Arc.dev (https://arc.dev/remote-jobs).
 */
export async function fetchArcDevJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://arc.dev/remote-jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const jobs: JobListing[] = [];
    const matches = [...html.matchAll(/href="(\/remote-jobs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const seen = new Set<string>();

    for (const m of matches) {
      const rawText = stripHtml(m[2]);
      if (!rawText || rawText.length < 3 || seen.has(rawText)) continue;
      seen.add(rawText);

      const roleClean = rawText.replace(/\s*jobs\s*$/i, '').trim();
      const hasRoleSuffix = /engineer|developer|architect|specialist|manager|scientist|analyst/i.test(roleClean);
      const title = `Remote ${roleClean.replace(/\b\w/g, (c) => c.toUpperCase())}${hasRoleSuffix ? '' : ' Developer'}`;
      const slug = m[1].split('/').filter(Boolean).pop() || 'role';
      const url = `https://arc.dev${m[1]}`;

      jobs.push({
        id: `arc-${slug}`,
        title,
        company: 'Verified Startups via Arc.dev',
        location: 'Remote (Worldwide)',
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: `Verified remote developer role: ${title} on Arc.dev network. Explore requirements and apply directly.`,
        snippet: `Verified remote developer role: ${title} on Arc.dev network. Explore requirements and apply directly.`,
        tags: ['Remote', 'Developer', 'Arc.dev', roleClean],
        apply_url: url,
        career_page_url: url,
        source: 'Arc.dev',
        posted_at: 'Recently',
        age_days: 2,
      });

      if (jobs.length >= 25) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// ============================================================================
// 3. Design & Creative Job Boards (Dribbble, Authentic Jobs, Behance)
// ============================================================================

/**
 * Scrapes design, UI/UX, and creative opportunities from Dribbble (https://dribbble.com/jobs).
 */
export async function fetchDribbbleJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://dribbble.com/jobs');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const items = html.split(/<li\s+class="job-list-item/).slice(1);
    const jobs: JobListing[] = [];

    for (const item of items) {
      const linkMatch = item.match(/href="(\/jobs\/\d+-[^"]+)"/);
      const compMatch = item.match(/class="job-board-job-company">([^<]+)<\/span>/);
      const titleMatch = item.match(/class="job-title job-board-job-title">([^<]+)<\/h4>/);
      const locMatch = item.match(/class="color-deep-blue-sea-light-40"[^>]*>([\s\S]*?)<\/div>/);

      if (!linkMatch || !titleMatch) continue;

      const title = stripHtml(titleMatch[1]);
      const company = compMatch ? stripHtml(compMatch[1]) : 'Creative Studio';
      if (isCompanyExcluded(company)) continue;

      const rawLoc = locMatch ? stripHtml(locMatch[1]) : 'Remote';
      const isRemote = /anywhere|remote/i.test(rawLoc);
      const url = `https://dribbble.com${linkMatch[1].split('?')[0]}`;
      const snippet = `${title} opening at ${company}. Verified creative & design listing from Dribbble.`;

      jobs.push({
        id: `drb-${linkMatch[1].split('/').filter(Boolean).pop()?.split('?')[0]}`,
        title,
        company,
        location: isRemote ? 'Remote (Worldwide)' : rawLoc,
        is_remote: true,
        job_type: /contract|freelance/i.test(item) ? 'Contract' : 'Full-time',
        experience_level: levelFrom(title),
        description: snippet,
        snippet: snippet.slice(0, 190) + (snippet.length > 190 ? '…' : ''),
        tags: ['Design', 'Creative', 'Dribbble'],
        apply_url: url,
        career_page_url: url,
        source: 'Dribbble',
        posted_at: 'Recently',
        age_days: 2,
      });
    }
    return jobs;
  } catch (err) {
    console.warn('Dribbble scraper error:', err);
    return [];
  }
}

/**
 * Parses creative & tech jobs from Authentic Jobs RSS feed (https://authenticjobs.com/feed/?post_type=job_listing).
 */
export async function fetchAuthenticJobs(): Promise<JobListing[]> {
  try {
    let xml = '';
    const res = await fetchWithTimeout('https://authenticjobs.com/feed/?post_type=job_listing');
    if (res && res.ok) {
      xml = await res.text();
    }
    if (!xml || !xml.includes('<item')) {
      const fallbackRes = await fetchWithTimeout('https://authenticjobs.com/feed/');
      if (fallbackRes && fallbackRes.ok) xml = await fallbackRes.text();
    }
    if (!xml) return [];

    const items = xml.split(/<item[\s>]/).slice(1);
    const jobs: JobListing[] = [];

    for (const item of items) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
      const descMatch = item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i) || item.match(/<description>([\s\S]*?)<\/description>/i);
      const pubMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

      if (!titleMatch || !linkMatch) continue;

      const title = decodeXml(stripHtml(titleMatch[1]));
      const link = stripHtml(linkMatch[1]);
      if (!title || !link) continue;

      // Extract company from link structure e.g. /job/<id>/<company>-<role-slug>/
      const slugMatch = link.match(/\/job\/\d+\/([a-z0-9]+)-/i);
      let company = 'Design & Tech Employer';
      if (slugMatch) {
        const rawComp = slugMatch[1].toLowerCase();
        if (rawComp === 'openai') company = 'OpenAI';
        else if (rawComp === 'airbnb') company = 'Airbnb';
        else company = slugMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());
      } else {
        const atMatch = title.match(/^([\s\S]*?)\s+\bat\b\s+([^–—]+)$/i);
        if (atMatch) company = atMatch[2].trim();
      }

      if (isCompanyExcluded(company)) continue;

      const fullDesc = descMatch ? stripHtml(descMatch[1]) : '';
      const salMatch = fullDesc.match(/(\$[0-9,]+\s*(?:to|–|-)\s*\$[0-9,]+)/i);
      const salary = salMatch ? salMatch[1].trim() : undefined;
      const posted = pubMatch ? stripHtml(pubMatch[1]) : undefined;

      jobs.push({
        id: `aj-${link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title,
        company,
        location: 'Remote (Worldwide)',
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        salary_formatted: salary,
        description: fullDesc || `${title} at ${company} on Authentic Jobs.`,
        snippet: (fullDesc || `${title} at ${company} on Authentic Jobs.`).slice(0, 190) + '…',
        tags: ['Design', 'Creative', 'Tech', 'Authentic Jobs'],
        apply_url: link,
        career_page_url: link,
        source: 'Authentic Jobs',
        posted_at: relativeTime(posted),
        age_days: ageInDays(posted),
      });
    }
    return jobs;
  } catch (err) {
    console.warn('Authentic Jobs feed error:', err);
    return [];
  }
}

/**
 * Ingests design roles from Behance.
 */
export async function fetchBehanceJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://www.behance.net/joblist');
    if (!res || !res.ok) return [];
    const html = await res.text();
    const jobs: JobListing[] = [];
    const matches = [...html.matchAll(/href="(\/job\/[^"]+|\/joblist\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const m of matches) {
      const url = `https://www.behance.net${m[1]}`;
      const title = stripHtml(m[2]);
      if (!title || title.length < 3) continue;
      jobs.push({
        id: `beh-${m[1].split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
        title,
        company: 'Creative Employer via Behance',
        location: 'Remote (Worldwide)',
        is_remote: true,
        job_type: 'Full-time',
        experience_level: levelFrom(title),
        description: `${title} role on Adobe Behance creative network.`,
        snippet: `${title} role on Adobe Behance creative network.`,
        tags: ['Design', 'Creative', 'Behance'],
        apply_url: url,
        career_page_url: url,
        source: 'Behance',
        posted_at: 'Recently',
        age_days: 2,
      });
      if (jobs.length >= 25) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// ============================================================================
// 4. Open Remote Boards (RemoteOK, WeWorkRemotely, Himalayas, Working Nomads, Jobspresso, Arbeitnow)
// ============================================================================

/**
 * Fetch global remote jobs from RemoteOK.
 */
export async function fetchRemoteOkJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://remoteok.com/api');
    if (!res || !res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const rawJobs = data.slice(1);

    return rawJobs
      .filter((j: Record<string, unknown>) => {
        const company = String(j.company || '').trim();
        return !isCompanyExcluded(company);
      })
      .slice(0, 45)
      .map((j: Record<string, unknown>): JobListing => {
        const title = String(j.position || 'Remote Role');
        const company = String(j.company || 'Tech Company');
        const desc = stripHtml(String(j.description || '')).slice(0, 800);
        const posted = j.date as string | undefined;

        return {
          id: `rok-${j.id || Math.random().toString(36).slice(2, 8)}`,
          title,
          company,
          location: String(j.location || 'Remote (Worldwide)'),
          is_remote: true,
          job_type: 'Full-time',
          experience_level: levelFrom(title),
          salary_formatted:
            j.salary_min && j.salary_max
              ? `USD ${Number(j.salary_min).toLocaleString()} – ${Number(j.salary_max).toLocaleString()}`
              : (j.salary as string | undefined),
          description: desc,
          snippet: desc.slice(0, 190) + (desc.length > 190 ? '…' : ''),
          tags: Array.isArray(j.tags) ? (j.tags as string[]) : ['Remote', 'Tech'],
          apply_url: String(j.apply_url || j.url || `https://remoteok.com/l/${j.id}`),
          career_page_url: String(j.url || `https://remoteok.com/l/${j.id}`),
          source: 'RemoteOK',
          posted_at: relativeTime(posted),
          age_days: ageInDays(posted),
        };
      });
  } catch (err) {
    console.warn('RemoteOK API fetch error:', err);
    return [];
  }
}

/**
 * Fetch global remote jobs from WeWorkRemotely RSS feed.
 */
export async function fetchWeWorkRemotelyJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://weworkremotely.com/remote-jobs.rss');
    if (!res || !res.ok) return [];
    const xml = await res.text();
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
    }
    return jobs;
  } catch (err) {
    console.warn('WWR RSS fetch error:', err);
    return [];
  }
}

/**
 * Fetch modern remote tech roles from Himalayas API.
 */
export async function fetchHimalayasJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://himalayas.app/jobs/api');
    if (!res || !res.ok) return [];
    const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
    if (!Array.isArray(data?.jobs)) return [];

    return data.jobs
      .filter((j) => {
        const comp = String(j.companyName || '').trim();
        return !isCompanyExcluded(comp);
      })
      .map((j): JobListing => {
        const title = String(j.title || 'Remote Role');
        const company = String(j.companyName || 'Tech Company');
        const desc = stripHtml(String(j.description || j.excerpt || '')).slice(0, 900);
        const pubSecs = typeof j.pubDate === 'number' ? j.pubDate * 1000 : undefined;
        const restrictions = Array.isArray(j.locationRestrictions) && j.locationRestrictions.length
          ? (j.locationRestrictions as string[]).join(', ')
          : 'Remote (Worldwide)';
        const link = String(j.applicationLink || '');

        return {
          id: `him-${j.guid || link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
          title,
          company,
          location: restrictions,
          is_remote: true,
          job_type: String(j.employmentType || 'Full-time'),
          experience_level: levelFrom(title, Array.isArray(j.seniority) ? String(j.seniority[0]) : undefined),
          salary_formatted:
            j.minSalary && j.maxSalary
              ? `${String(j.currency || 'USD')} ${Number(j.minSalary).toLocaleString()} – ${Number(j.maxSalary).toLocaleString()}`
              : undefined,
          description: desc,
          snippet: desc.slice(0, 190) + (desc.length > 190 ? '…' : ''),
          tags: Array.isArray(j.categories) ? (j.categories as string[]).slice(0, 5) : ['Remote', 'Tech'],
          apply_url: link,
          career_page_url: link,
          source: 'Himalayas',
          posted_at: relativeTime(pubSecs),
          age_days: ageInDays(pubSecs),
        };
      });
  } catch (err) {
    console.warn('Himalayas API fetch error:', err);
    return [];
  }
}

/**
 * Fetch global remote jobs from Working Nomads API.
 */
export async function fetchWorkingNomadsJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://www.workingnomads.com/api/exposed_jobs/');
    if (!res || !res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((j: Record<string, unknown>) => {
        const comp = String(j.company_name || '').trim();
        return !isCompanyExcluded(comp);
      })
      .map((j: Record<string, unknown>): JobListing => {
        const title = String(j.title || 'Remote Role');
        const company = String(j.company_name || 'Tech Company');
        const desc = stripHtml(String(j.description || '')).slice(0, 900);
        const loc = String(j.location || '');
        const location = loc === 'WORLDWIDE' ? 'Remote (Worldwide)' : (loc || 'Remote');
        const tags = typeof j.tags === 'string'
          ? (j.tags as string).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5)
          : ['Remote', 'Tech'];

        return {
          id: `wn-${String(j.url || '').split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 8)}`,
          title,
          company,
          location,
          is_remote: true,
          job_type: 'Full-time',
          experience_level: levelFrom(title),
          description: desc,
          snippet: desc.slice(0, 190) + (desc.length > 190 ? '…' : ''),
          tags,
          apply_url: String(j.url || ''),
          career_page_url: String(j.url || ''),
          source: 'Working Nomads',
          posted_at: relativeTime(j.pub_date as string),
          age_days: ageInDays(j.pub_date as string),
        };
      });
  } catch (err) {
    console.warn('Working Nomads API fetch error:', err);
    return [];
  }
}

/**
 * Fetch remote jobs from Jobspresso RSS feed.
 */
export async function fetchJobspressoJobs(): Promise<JobListing[]> {
  try {
    let xml = '';
    const res = await fetchWithTimeout('https://jobspresso.co/jobs/feed/');
    if (res && res.ok) {
      xml = await res.text();
    }
    if (!xml || !xml.includes('<item')) {
      const fallbackRes = await fetchWithTimeout('https://jobspresso.co/feed/');
      if (fallbackRes && fallbackRes.ok) xml = await fallbackRes.text();
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
    }
    return jobs;
  } catch (err) {
    console.warn('Jobspresso feed fetch error:', err);
    return [];
  }
}

/**
 * Fetch global remote jobs from Arbeitnow.
 */
export async function fetchArbeitnowRemoteJobs(): Promise<JobListing[]> {
  try {
    const res = await fetchWithTimeout('https://www.arbeitnow.com/api/job-board-api');
    if (!res || !res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];

    return data.data
      .filter((j: Record<string, unknown>) => {
        const company = String(j.company_name || '').trim();
        return !isCompanyExcluded(company);
      })
      .slice(0, 40)
      .map((j: Record<string, unknown>): JobListing => {
        const title = String(j.title || 'Open Position');
        const company = String(j.company_name || 'Tech Company');
        const desc = stripHtml(String(j.description || '')).slice(0, 800);
        const posted = j.created_at ? (j.created_at as number) * 1000 : undefined;

        return {
          id: `arb-${j.slug || Math.random().toString(36).slice(2, 8)}`,
          title,
          company,
          location: j.remote ? 'Remote (Worldwide / EMEA)' : String(j.location || 'Remote'),
          is_remote: Boolean(j.remote),
          job_type: 'Full-time',
          experience_level: levelFrom(title),
          description: desc,
          snippet: desc.slice(0, 190) + (desc.length > 190 ? '…' : ''),
          tags: Array.isArray(j.tags) ? (j.tags as string[]) : ['Remote', 'Tech'],
          apply_url: String(j.url || ''),
          career_page_url: String(j.url || ''),
          source: 'Arbeitnow',
          posted_at: relativeTime(posted),
          age_days: ageInDays(posted),
        };
      });
  } catch (err) {
    console.warn('Arbeitnow API fetch error:', err);
    return [];
  }
}

// ============================================================================
// Orchestrated Harvester: multi-platform sweep across all regional & remote boards
// ============================================================================

/**
 * Execute full multi-platform sweep across:
 * - Regional Nigerian / African boards: Jobberman, MyJobMag, NG Indeed, Inkdesk
 * - Startup & Tech boards: Y Combinator, Wellfound, Contra, Hiring.Cafe, Arc.dev
 * - Design & Creative boards: Dribbble, Authentic Jobs, Behance
 * - Remote open boards: RemoteOK, WeWorkRemotely, Himalayas, Working Nomads, Jobspresso, Arbeitnow
 * - Real ATS employer boards: Greenhouse, Lever, Workable, Ashby
 *
 * Saves unique results to the database pool (`crawled_jobs`) and returns them.
 */
export async function runFullJobHarvester(): Promise<JobListing[] & { added: number; total: number }> {
  const [
    atsJobs,
    jobbermanJobs,
    myJobMagJobs,
    ngIndeedJobs,
    inkdeskJobs,
    ycJobs,
    wellfoundJobs,
    contraJobs,
    hiringCafeJobs,
    arcJobs,
    dribbbleJobs,
    authenticJobs,
    behanceJobs,
    remoteOkJobs,
    wwrJobs,
    himalayasJobs,
    workingNomadsJobs,
    jobspressoJobs,
    arbeitnowJobs,
  ] = await Promise.all([
    fetchBoards(BOARDS).catch(() => []),
    fetchJobbermanJobs().catch(() => []),
    fetchMyJobMagJobs().catch(() => []),
    fetchNgIndeedJobs().catch(() => []),
    fetchInkdeskRssJobs().catch(() => []),
    fetchYCombinatorJobs().catch(() => []),
    fetchWellfoundJobs().catch(() => []),
    fetchContraJobs().catch(() => []),
    fetchHiringCafeJobs().catch(() => []),
    fetchArcDevJobs().catch(() => []),
    fetchDribbbleJobs().catch(() => []),
    fetchAuthenticJobs().catch(() => []),
    fetchBehanceJobs().catch(() => []),
    fetchRemoteOkJobs().catch(() => []),
    fetchWeWorkRemotelyJobs().catch(() => []),
    fetchHimalayasJobs().catch(() => []),
    fetchWorkingNomadsJobs().catch(() => []),
    fetchJobspressoJobs().catch(() => []),
    fetchArbeitnowRemoteJobs().catch(() => []),
  ]);

  const allJobs = [
    ...atsJobs,
    ...jobbermanJobs,
    ...myJobMagJobs,
    ...ngIndeedJobs,
    ...inkdeskJobs,
    ...ycJobs,
    ...wellfoundJobs,
    ...contraJobs,
    ...hiringCafeJobs,
    ...arcJobs,
    ...dribbbleJobs,
    ...authenticJobs,
    ...behanceJobs,
    ...remoteOkJobs,
    ...wwrJobs,
    ...himalayasJobs,
    ...workingNomadsJobs,
    ...jobspressoJobs,
    ...arbeitnowJobs,
  ];

  // Deduplicate by company|normalized_title and apply_url, enforce freshness (<= 150 days) and blacklist
  const seenKey = new Set<string>();
  const seenUrl = new Set<string>();
  const uniqueJobs: JobListing[] = [];

  for (const job of allJobs) {
    if (!job.apply_url || !job.title || !job.company) continue;
    if (isJobicyExcluded(job)) continue;

    const compLower = job.company.toLowerCase().trim();
    if (isCompanyExcluded(compLower)) continue;

    if (job.age_days !== undefined && job.age_days > 150) continue;

    const urlLower = job.apply_url.trim().toLowerCase();
    const normTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const key = `${compLower}|${normTitle}`;

    if (!seenKey.has(key) && !seenUrl.has(urlLower)) {
      seenKey.add(key);
      seenUrl.add(urlLower);
      uniqueJobs.push(job);
    }
  }

  // Persist into the crawled_jobs database pool
  const saveResult = await saveCrawledJobs(uniqueJobs);

  return Object.assign(uniqueJobs, { added: saveResult.added, total: saveResult.total });
}
