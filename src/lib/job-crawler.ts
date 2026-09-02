import { JobListing } from '@/types/job';
import { BOARDS, fetchBoards, EXCLUDED_COMPANIES } from './ats-boards';

/**
 * Fetch Nigerian jobs from Inkdesk Nigeria feed.
 */
export async function fetchInkdeskRssJobs(): Promise<JobListing[]> {
  try {
    const res = await fetch('https://jobs.inkdeskng.org/?feed=job_feed', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerBot/2.0)' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split(/<item>/).slice(1);
    const jobs: JobListing[] = [];

    for (const item of items) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i);

      if (!titleMatch || !linkMatch) continue;

      const rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      const link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      const desc = descMatch
        ? descMatch[1]
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

      const atMatch = rawTitle.match(/^([\s\S]*?)\s+\bat\b\s+([^–—]+?)(?:\s+[–—]\s+.*)?$/i);
      const title = (atMatch ? atMatch[1] : rawTitle).trim();
      const company = (atMatch ? atMatch[2] : 'Nigerian Employer').trim();

      // Skip excluded companies like Moniepoint
      if (EXCLUDED_COMPANIES.has(company.toLowerCase())) continue;

      jobs.push({
        id: `ink-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        company,
        location: 'Nigeria (Lagos, Abuja & Remote)',
        is_remote: desc.toLowerCase().includes('remote') || title.toLowerCase().includes('remote'),
        job_type: 'Full-time',
        experience_level: title.toLowerCase().includes('senior') ? 'Senior' : 'Mid-Level',
        description: desc.slice(0, 1000),
        snippet: desc.slice(0, 200) + '...',
        tags: ['Nigeria', 'Tech', 'Hiring'],
        apply_url: link,
        source: 'Inkdesk',
        posted_at: 'Recently',
      });
    }

    return jobs;
  } catch (err) {
    console.warn('Inkdesk RSS fetch error:', err);
    return [];
  }
}

/**
 * Fetch global remote jobs from RemoteOK.
 */
export async function fetchRemoteOkJobs(): Promise<JobListing[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CareerBot-AI/1.0' },
      next: { revalidate: 7200 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Filter out legal/header item
    const rawJobs = data.slice(1);

    return rawJobs
      .filter((j: Record<string, unknown>) => {
        const company = String(j.company || '').toLowerCase().trim();
        return !EXCLUDED_COMPANIES.has(company);
      })
      .slice(0, 40)
      .map((j: Record<string, unknown>): JobListing => {
        const title = String(j.position || 'Open Role');
        const company = String(j.company || 'Tech Company');
        const desc = String(j.description || '').replace(/<[^>]*>/g, ' ').slice(0, 800);

        return {
          id: `rok-${j.id || Math.random().toString(36).slice(2, 8)}`,
          title,
          company,
          location: String(j.location || 'Remote (Worldwide)'),
          is_remote: true,
          job_type: 'Full-time',
          experience_level: title.toLowerCase().includes('senior') ? 'Senior' : 'Mid-Level',
          description: desc,
          snippet: desc.slice(0, 200) + '...',
          tags: Array.isArray(j.tags) ? (j.tags as string[]) : ['Remote', 'Tech'],
          apply_url: String(j.url || `https://remoteok.com/l/${j.id}`),
          source: 'RemoteOK',
          posted_at: 'Recently',
        };
      });
  } catch (err) {
    console.warn('RemoteOK API fetch error:', err);
    return [];
  }
}

/**
 * Fetch global remote jobs from Arbeitnow.
 */
export async function fetchArbeitnowRemoteJobs(): Promise<JobListing[]> {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'CareerBot-AI/1.0' },
      next: { revalidate: 7200 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];

    return data.data
      .filter((j: Record<string, unknown>) => {
        const company = String(j.company_name || '').toLowerCase().trim();
        return !EXCLUDED_COMPANIES.has(company);
      })
      .slice(0, 30)
      .map((j: Record<string, unknown>): JobListing => {
        const title = String(j.title || 'Open Position');
        const company = String(j.company_name || 'Tech Company');
        const desc = String(j.description || '').replace(/<[^>]*>/g, ' ').slice(0, 800);

        return {
          id: `arb-${j.slug || Math.random().toString(36).slice(2, 8)}`,
          title,
          company,
          location: j.remote ? 'Remote (Worldwide / EMEA)' : String(j.location || 'Remote'),
          is_remote: Boolean(j.remote),
          job_type: 'Full-time',
          experience_level: title.toLowerCase().includes('senior') ? 'Senior' : 'Mid-Level',
          description: desc,
          snippet: desc.slice(0, 200) + '...',
          tags: Array.isArray(j.tags) ? (j.tags as string[]) : ['Remote', 'Tech'],
          apply_url: String(j.url || ''),
          source: 'Arbeitnow',
          posted_at: 'Recently',
        };
      });
  } catch (err) {
    console.warn('Arbeitnow API fetch error:', err);
    return [];
  }
}

/**
 * Execute full multi-platform sweep across all Nigerian ATS boards, RSS feeds, and remote APIs.
 */
export async function runFullJobHarvester(): Promise<JobListing[]> {
  const [atsJobs, inkdeskJobs, remoteOkJobs, arbeitnowJobs] = await Promise.all([
    fetchBoards(BOARDS),
    fetchInkdeskRssJobs(),
    fetchRemoteOkJobs(),
    fetchArbeitnowRemoteJobs(),
  ]);

  const allJobs = [...atsJobs, ...inkdeskJobs, ...remoteOkJobs, ...arbeitnowJobs];

  // Strictly filter out Moniepoint or any blacklisted company
  const filtered = allJobs.filter((job) => {
    const comp = job.company.toLowerCase().trim();
    return !EXCLUDED_COMPANIES.has(comp);
  });

  // Deduplicate by apply_url or title+company
  const seen = new Set<string>();
  const uniqueJobs: JobListing[] = [];

  for (const job of filtered) {
    const key = job.apply_url || `${job.company.toLowerCase()}-${job.title.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueJobs.push(job);
    }
  }

  return uniqueJobs;
}
