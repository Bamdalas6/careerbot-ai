import { NextRequest, NextResponse } from 'next/server';
import { saveCrawledJobs } from '@/lib/db';
import { isCompanyExcluded, isJobicyExcluded } from '@/lib/ats-boards';
import { JobListing } from '@/types/job';

/**
 * Intelligent parser for unstructured job posts / tweets / telegram messages.
 */
function parseRawJobPost(rawText: string, sourceUrl?: string, sourceName = 'Community'): JobListing | null {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // Extract URL from raw text if not provided
  const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
  const applyUrl = sourceUrl || (urlMatch ? urlMatch[0] : `https://x.com/search?q=${encodeURIComponent(lines[0])}`);

  // Extract Title: Look for phrases like "Hiring:", "Role:", "Looking for", or take first line
  let title = lines[0].replace(/^(we are hiring|hiring|job alert|new role|looking for)[:\s-]*/i, '').trim();
  if (title.length > 80) title = title.slice(0, 77) + '...';

  // Extract Company if present (e.g. "at Paystack", "@PaystackHQ")
  const atMatch = rawText.match(/(?:at|@)\s*([A-Za-z0-9_\s]{2,30})/i);
  let company = atMatch ? atMatch[1].trim() : 'Tech Company';

  // Check if excluded company or Jobicy
  if (isCompanyExcluded(company) || isJobicyExcluded({ source: sourceName, apply_url: applyUrl, title, company })) {
    return null;
  }

  // Detect location
  let location = 'Nigeria (Lagos, Abuja & Remote)';
  if (/remote/i.test(rawText)) location = 'Remote (Nigeria / Africa / Worldwide)';
  else if (/lagos/i.test(rawText)) location = 'Lagos, Nigeria';
  else if (/abuja/i.test(rawText)) location = 'Abuja, Nigeria';

  // Detect experience level
  let level = 'Mid-Level';
  if (/senior|lead|principal|head/i.test(rawText)) level = 'Senior';
  else if (/junior|entry|intern|graduate/i.test(rawText)) level = 'Junior';

  return {
    id: `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title || 'Open Role',
    company,
    location,
    is_remote: /remote/i.test(rawText),
    job_type: /part[- ]time|contract/i.test(rawText) ? 'Contract' : 'Full-time',
    experience_level: level,
    description: rawText,
    snippet: rawText.slice(0, 200) + '...',
    tags: ['Nigeria', 'Community', 'Direct'],
    apply_url: applyUrl,
    source: sourceName,
    posted_at: 'Just now',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Support single job or array of jobs
    const rawItems: Array<Record<string, unknown>> = Array.isArray(body)
      ? body
      : Array.isArray(body.jobs)
      ? body.jobs
      : [body];

    const parsedJobs: JobListing[] = [];

    for (const item of rawItems) {
      // If structured job
      if (item.title && item.company && item.apply_url) {
        const companyStr = String(item.company).trim();
        if (isCompanyExcluded(companyStr)) {
          continue; // Skip blacklisted companies like Moniepoint
        }
        if (
          isJobicyExcluded({
            source: item.source ? String(item.source) : undefined,
            apply_url: String(item.apply_url),
            id: item.id ? String(item.id) : undefined,
            title: String(item.title),
            company: companyStr,
          })
        ) {
          continue; // Strictly reject any Jobicy postings
        }

        parsedJobs.push({
          id: String(item.id || `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
          title: String(item.title).trim(),
          company: companyStr,
          location: String(item.location || 'Nigeria (Remote / Hybrid)'),
          is_remote: Boolean(item.is_remote ?? String(item.location || '').toLowerCase().includes('remote')),
          job_type: (item.job_type as string) || 'Full-time',
          experience_level: (item.experience_level as string) || 'Mid-Level',
          description: String(item.description || item.snippet || item.title),
          snippet: String(item.snippet || item.description || item.title).slice(0, 200),
          tags: Array.isArray(item.tags) ? (item.tags as string[]) : ['Tech', 'Hiring'],
          apply_url: String(item.apply_url),
          source: String(item.source || 'Community Feed'),
          posted_at: String(item.posted_at || 'Recently'),
        });
      }
      // If raw text / tweet / telegram message
      else if (item.raw_text || item.text || item.tweet) {
        const text = String(item.raw_text || item.text || item.tweet);
        const parsed = parseRawJobPost(text, item.url as string, (item.source as string) || '𝕏 (Twitter)');
        if (parsed) {
          parsedJobs.push(parsed);
        }
      }
    }

    if (!parsedJobs.length) {
      return NextResponse.json(
        { success: false, error: 'No valid or allowed job records found in payload.' },
        { status: 400 }
      );
    }

    const result = await saveCrawledJobs(parsedJobs);

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${parsedJobs.length} job(s).`,
      added: result.added,
      total: result.total,
      jobs: parsedJobs,
    });
  } catch (err: unknown) {
    console.error('Job ingestion backdoor error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest jobs' },
      { status: 500 }
    );
  }
}
