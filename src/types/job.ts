export interface JobListing {
  id: string;
  title: string;
  company: string;
  company_logo?: string;
  company_url?: string;
  location: string;
  is_remote: boolean;
  job_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance' | string;
  experience_level?: 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive' | 'All' | string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_formatted?: string;
  description: string;
  snippet?: string;
  tags: string[];
  apply_url: string;
  source:
    | 'Remotive'
    | 'RemoteOK'
    | 'Arbeitnow'
    | 'Jobicy'
    | 'Inkdesk'
    | 'Greenhouse'
    | 'Lever'
    | 'Workable'
    | 'Ashby'
    | 'Direct ATS'
    | 'Curated'
    | 'MyJobMag'
    | 'Twitter'
    | 'Community'
    | string;
  posted_at: string;
  /**
   * Age in days, or undefined when the source published no date. Kept alongside
   * `posted_at` because the display string cannot be filtered on reliably — a
   * freshness cutoff has to compare numbers, not parse "11mo ago".
   */
  age_days?: number;
  career_page_url?: string;
  match_score?: number; // 0-100%
  match_reason?: string; // AI generated explanation
}

export interface JobSearchQuery {
  query?: string;
  role?: string;
  skills?: string[];
  location?: string;
  is_remote?: boolean;
  salary_min?: number;
  experience_level?: string;
  limit?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  jobs?: JobListing[];
  suggested_queries?: string[];
  extracted_filters?: Partial<JobSearchQuery>;
}

export interface ApplicationEvent {
  id: string;
  type: 'applied' | 'followed_up' | 'interview_scheduled' | 'interview_done' | 'offer_received' | 'rejected' | 'accepted' | 'note';
  date: string;
  note?: string;
}

export interface SavedJob extends JobListing {
  saved_at: string;
  status: 'saved' | 'applied' | 'followed_up' | 'interviewing' | 'offer' | 'rejected' | 'accepted';
  notes?: string;
  applied_at?: string;
  follow_up_at?: string;
  follow_up_count?: number;
  contact_name?: string;
  contact_email?: string;
  contact_linkedin?: string;
  timeline?: ApplicationEvent[];
}

export interface ResumeProfile {
  name?: string;
  extracted_title?: string;
  skills: string[];
  experience_years?: number;
  preferred_locations?: string[];
  preferred_roles?: string[];
  summary?: string;
}

/**
 * A structured critique of a CV, produced by the heuristic reviewer. Everything
 * here is derived from the actual text — no invented scores — so the same CV
 * always grades the same way and the advice points at real gaps.
 */
export interface CVReview {
  /** 0–100 overall, a weighted roll-up of the section scores below. */
  score: number;
  /** One-line verdict, e.g. "Solid, but quantify your impact." */
  headline: string;
  /** Per-area grades with concrete, specific findings. */
  sections: CVReviewSection[];
  /** Role-relevant keywords the CV is missing, worth adding if truthful. */
  missing_keywords: string[];
  /** A tightened, ATS-friendly rewrite of the professional summary. */
  rewritten_summary: string;
  /** Weak bullet → stronger, quantified rewrite. */
  improved_bullets: { before: string; after: string }[];
  /** Machine-screening problems: length, contact info, dense blocks, etc. */
  ats_warnings: string[];
  /** The single highest-leverage change to make first. */
  top_priority: string;
}

export interface CVReviewSection {
  label: string;
  score: number; // 0–100
  status: 'strong' | 'ok' | 'weak';
  notes: string[];
}

/**
 * A rebuilt CV document produced from the review — the user's own content,
 * restructured into ATS-friendly sections with the weak bullets replaced by
 * their stronger rewrites. Nothing is invented: where a real figure is needed,
 * a visible `[...]` placeholder is left for the candidate to fill in.
 */
export interface UpgradedCV {
  /** The full rebuilt CV as plain text, ready to copy or download. */
  text: string;
  /** Number of `[...]` placeholders still awaiting a real number. */
  placeholders: number;
  /** Plain-language list of what was changed, so the rewrite is auditable. */
  changes: string[];
}
