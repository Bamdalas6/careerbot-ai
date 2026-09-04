export const CREDIT_RATES = {
  CHAT_SEARCH: 1,       // 1 credit for live AI job search query
  CV_REVIEW: 2,         // 2 credits for full heuristic CV grading & keyword review
  CV_REBUILD: 3,        // 3 credits for generating upgraded rebuilt CV
  TAILOR_PITCH: 2,      // 2 credits for generating tailored bullet points and cover note
} as const;

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  price_ngn: number;
  badge?: string;
  popular?: boolean;
  description: string;
  features: readonly string[];
}

export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    price_usd: 5,
    price_ngn: 5000,
    badge: 'Beginner',
    popular: false,
    description: 'Perfect for quick searches and CV tune-ups',
    features: ['50 Search / Action Credits', '5+ Complete CV Rebuilds', '10+ Tailored Pitch Letters'],
  },
  {
    id: 'pro',
    name: 'Pro Job Hunter',
    credits: 150,
    price_usd: 12,
    price_ngn: 12000,
    badge: 'Most Popular',
    popular: true,
    description: 'Ideal for active job seekers targeting multiple companies',
    features: ['150 Search / Action Credits', '15+ Complete CV Rebuilds', '35+ Tailored Pitch Letters', 'Priority Live ATS Scanning'],
  },
  {
    id: 'accelerator',
    name: 'Career Accelerator',
    credits: 500,
    price_usd: 29,
    price_ngn: 29000,
    badge: 'Power User',
    popular: false,
    description: 'Maximum firepower for aggressive career pivots & multiple applications',
    features: ['500 Action Credits', 'Unlimited Searches & Rebuilds', 'Instant Interview Preparation', 'Lifetime History Storage'],
  },
] as const;

export type CreditActionType = keyof typeof CREDIT_RATES;
