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
