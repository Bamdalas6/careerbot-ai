import type { JobListing } from '@/types/job';

/**
 * Presentation helpers shared by every job surface (feed cards, suggested deck,
 * chat results, welcome screen) so a company always gets the same colour and a
 * job's salary/freshness reads the same everywhere.
 */

export interface CompanyTheme {
  /** Gradient classes for avatar badges (`bg-gradient-to-br` is applied by callers). */
  avatar: string;
  /** Soft tint for chips/backgrounds that sit next to the avatar. */
  soft: string;
  /** Text colour that reads on `soft`. */
  text: string;
}

// Tailwind only ships classes it can see as literal strings, so the palette is spelled out.
const COMPANY_THEMES: CompanyTheme[] = [
  { avatar: 'from-blue-500 to-indigo-600', soft: 'bg-blue-50', text: 'text-blue-700' },
  { avatar: 'from-emerald-400 to-teal-600', soft: 'bg-emerald-50', text: 'text-emerald-700' },
  { avatar: 'from-violet-500 to-purple-600', soft: 'bg-violet-50', text: 'text-violet-700' },
  { avatar: 'from-orange-400 to-rose-500', soft: 'bg-orange-50', text: 'text-orange-700' },
  { avatar: 'from-sky-400 to-cyan-600', soft: 'bg-sky-50', text: 'text-sky-700' },
  { avatar: 'from-pink-500 to-fuchsia-600', soft: 'bg-pink-50', text: 'text-pink-700' },
  { avatar: 'from-amber-400 to-orange-500', soft: 'bg-amber-50', text: 'text-amber-700' },
  { avatar: 'from-lime-500 to-green-600', soft: 'bg-lime-50', text: 'text-lime-700' },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function companyTheme(company: string | undefined): CompanyTheme {
  return COMPANY_THEMES[hashString((company || '').toLowerCase()) % COMPANY_THEMES.length];
}

export function companyInitials(company: string | undefined): string {
  const words = (company || '?')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(inc|ltd|llc|plc|limited|the|co)$/i.test(w));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Human salary text, or null when the listing does not disclose pay. */
export function formatJobSalary(job: JobListing): string | null {
  if (job.salary_formatted) {
    return job.salary_formatted.replace(/\/month\s*\/hour/gi, '/month');
  }
  if (job.salary_min) {
    const symbol = job.salary_currency === 'USD' ? '$' : job.salary_currency === 'GBP' ? '£' : '₦';
    const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
    if (job.salary_max && job.salary_max > job.salary_min) {
      return `${symbol}${fmt(job.salary_min)} – ${symbol}${fmt(job.salary_max)}`;
    }
    return `${symbol}${fmt(job.salary_min)}`;
  }
  return null;
}

export function isRemoteJob(job: JobListing): boolean {
  return job.is_remote === true || (job.location || '').toLowerCase().includes('remote');
}

/** True for listings posted within the last day — drives the "New" badge. */
export function isFreshJob(job: JobListing): boolean {
  if (job.age_days === 0) return true;
  return /just now|minute|hour/i.test(job.posted_at || '');
}

export function shortLocation(job: JobListing): string {
  if (job.is_remote && !job.location) return 'Remote';
  return (job.location || 'Remote').replace(/\s*\(.*?\)\s*/g, ' ').trim() || 'Remote';
}

export type FitLevel = 'strong' | 'good' | 'partial';

/** Buckets a raw CV keyword score into a label instead of inventing a precise percentage. */
export function fitLevelFromScore(score: number): FitLevel | null {
  if (score >= 8) return 'strong';
  if (score >= 4) return 'good';
  if (score > 0) return 'partial';
  return null;
}

export const FIT_LABELS: Record<FitLevel, { label: string; className: string }> = {
  strong: { label: 'Strong CV fit', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  good: { label: 'Good CV fit', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  partial: { label: 'Partial fit', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function timeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Shortens salary text for tight spaces: "₦350,000 - ₦450,000 / month" → "₦350k – ₦450k/mo". */
export function compactSalary(text: string): string {
  return text
    .replace(/\d{1,3}(?:,\d{3})+/g, (match) => {
      const n = Number(match.replace(/,/g, ''));
      if (n >= 1_000_000) return `${Number((n / 1_000_000).toFixed(1))}M`;
      if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
      return match;
    })
    .replace(/\s*\/\s*month/gi, '/mo')
    .replace(/\s*\/\s*hour/gi, '/hr')
    .replace(/\s*\/\s*year/gi, '/yr')
    .replace(/\s+-\s+/g, ' – ');
}

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
]);

const APPLICATION_FORM_PATTERN = /forms\.gle|docs\.google\.com\/forms|forms\.(cloud\.microsoft|office\.com)|wa\.me|whatsapp\.com/i;

export interface ApplyDestination {
  url: string;
  /** career-page: the employer's site / job board; form: an online application form; careers-search: no page on file. */
  kind: 'career-page' | 'form' | 'careers-search';
  /** Employer email when the listing only accepts applications by email. */
  email?: string;
}

function isHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

/**
 * Where "Apply" should send someone: the career page or online application,
 * never a mail client. Email-only listings have no career page on file, so they
 * get a search for the company's careers page (scoped to its email domain when
 * that is a company domain) and the address is surfaced separately.
 */
export function getApplyDestination(job: JobListing): ApplyDestination {
  const applyUrl = job.apply_url || '';
  if (isHttpUrl(job.career_page_url)) return { url: job.career_page_url, kind: 'career-page' };
  if (isHttpUrl(job.apply_url)) {
    return { url: job.apply_url, kind: APPLICATION_FORM_PATTERN.test(job.apply_url) ? 'form' : 'career-page' };
  }
  if (isHttpUrl(job.company_url)) return { url: job.company_url, kind: 'career-page' };

  const email = /^mailto:/i.test(applyUrl)
    ? decodeURIComponent(applyUrl.replace(/^mailto:/i, '').split('?')[0]).trim()
    : undefined;
  const domain = email?.split('@')[1]?.toLowerCase();
  const companyDomain = domain && !FREE_EMAIL_DOMAINS.has(domain) ? domain : '';
  const query = [job.company, 'careers', companyDomain || job.location].filter(Boolean).join(' ');
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    kind: 'careers-search',
    email: email || undefined,
  };
}

export function openApplyDestination(job: JobListing) {
  window.open(getApplyDestination(job).url, '_blank', 'noopener,noreferrer');
}
