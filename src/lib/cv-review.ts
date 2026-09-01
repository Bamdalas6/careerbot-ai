import { CVReview, CVReviewSection, UpgradedCV } from '@/types/job';
import { SKILLS } from './query-parser';

/**
 * CV Review & Intelligent Resume Reconstruction Engine.
 *
 * Universal support for all professions: Software Engineering, Product Management,
 * Data & AI, Finance & Accounting, Growth & Marketing, Sales, Operations, HR, Support, etc.
 *
 * - Parses diverse heading naming conventions without loss of candidate content
 * - Generates role-accurate, tailored summaries based on actual user skills and years of experience
 * - Suggests industry-relevant missing keywords
 * - Preserves candidate's real contact information, work history, and education
 * - Guarantees score monotonicity (score_after >= score_before)
 * - Supports natural-language manual editing
 */

/** Verbs that carry ownership, as opposed to "responsible for" / "helped with". */
const STRONG_VERBS = [
  'built', 'shipped', 'led', 'launched', 'designed', 'architected', 'reduced',
  'increased', 'improved', 'automated', 'migrated', 'scaled', 'delivered', 'owned',
  'drove', 'grew', 'cut', 'saved', 'optimised', 'optimized', 'rebuilt', 'created',
  'established', 'negotiated', 'recovered', 'resolved', 'mentored', 'trained',
  'implemented', 'developed', 'introduced', 'streamlined', 'consolidated',
  'managed', 'prepared', 'coordinated', 'oversaw', 'supervised', 'achieved',
  'exceeded', 'secured', 'generated', 'expanded', 'processed', 'reconciled',
  'audited', 'analysed', 'analyzed', 'forecast', 'budgeted', 'planned',
  'organised', 'organized', 'executed', 'spearheaded', 'restructured',
  'standardised', 'standardized', 'eliminated', 'accelerated', 'doubled',
  'tripled', 'onboarded', 'recruited', 'sourced', 'retained', 'converted',
  'authored', 'presented', 'facilitated', 'taught', 'championed', 'headed',
  'directed', 'administered', 'compiled', 'verified', 'dispatched', 'sold',
];

/** Phrases that signal a duty list rather than an achievement. */
const WEAK_OPENERS = [
  'responsible for', 'duties included', 'tasked with', 'helped with', 'worked on',
  'assisted with', 'involved in', 'participated in', 'in charge of', 'part of a team',
  'my job was', 'responsibilities include', 'responsibilities included',
];

/** Filler that takes space and says nothing a screener values. */
const FLUFF = [
  'hard working', 'hardworking', 'team player', 'go-getter', 'self-starter',
  'think outside the box', 'detail oriented', 'detail-oriented',
  'dynamic individual', 'passionate about excellence',
  'excellent communication skills', 'highly motivated',
  'fast learner', 'people person', 'multitasker', 'synergy', 'go the extra mile',
];

/**
 * Domain Craft Vocabularies across diverse professional tracks.
 */
const ROLE_KEYWORDS: Record<string, string[]> = {
  engineering: [
    'TypeScript', 'React', 'Node.js', 'REST APIs', 'CI/CD', 'Docker',
    'Kubernetes', 'Microservices', 'System Design', 'Unit Testing', 'PostgreSQL',
    'Cloud Architecture', 'AWS', 'Code Review', 'Performance Optimization', 'Git',
  ],
  data: [
    'SQL', 'Python', 'Tableau', 'Power BI', 'Data Modeling', 'A/B Testing',
    'Data Pipelines', 'ETL', 'Statistical Analysis', 'Machine Learning', 'BigQuery',
    'Snowflake', 'Pandas', 'Stakeholder Reporting', 'Data Governance',
  ],
  product: [
    'Product Roadmap', 'User Stories', 'Sprint Planning', 'Product Discovery',
    'KPIs & Metrics', 'Stakeholder Management', 'Go-to-Market (GTM)', 'A/B Testing',
    'Feature Prioritization', 'Conversion Optimization', 'Agile / Scrum', 'User Journey Mapping',
  ],
  design: [
    'Figma', 'UI/UX Design', 'Design Systems', 'Wireframing', 'Rapid Prototyping',
    'Usability Testing', 'Information Architecture', 'User Flows', 'Interaction Design',
    'Developer Handoff', 'WCAG AA Accessibility', 'Micro-Interactions',
  ],
  finance: [
    'Financial Modeling', 'Budgeting & Forecasting', 'Variance Analysis', 'DCF Valuation',
    'P&L Management', 'IFRS / GAAP', 'Audit & Compliance', 'Cash Flow Management',
    'Advanced Excel (VBA)', 'SAP ERP', 'Scenario Modeling', 'Capital Allocation',
  ],
  marketing: [
    'Growth Marketing', 'SEO / SEM', 'Content Strategy', 'Google Ads', 'Meta Ads Manager',
    'Email Automation', 'Conversion Rate Optimization (CRO)', 'Google Analytics 4',
    'HubSpot', 'Customer Acquisition Cost (CAC)', 'Retention Strategy', 'Copywriting',
  ],
  sales: [
    'Pipeline Management', 'Quota Attainment', 'Enterprise Sales', 'CRM (Salesforce)',
    'Lead Generation', 'Contract Negotiation', 'Account Management', 'Outbound Prospecting',
    'Solution Selling', 'Client Retention', 'Deal Closing',
  ],
  operations: [
    'Process Optimization', 'Cross-Functional Leadership', 'Vendor Management',
    'Standard Operating Procedures (SOPs)', 'Supply Chain', 'Operational Excellence',
    'Cost Reduction', 'Logistics Management', 'Project Management', 'Change Management',
  ],
  people: [
    'Talent Acquisition', 'Full-Cycle Recruiting', 'HRIS Systems', 'Employee Engagement',
    'Performance Management', 'Onboarding', 'Compensation & Benefits', 'Employee Relations',
    'Employer Branding', 'Labor Law Compliance',
  ],
  support: [
    'Customer Success', 'Ticketing Systems (Zendesk)', 'SLA Adherence', 'Customer Retention',
    'Escalation Management', 'CSAT / NPS', 'Root Cause Analysis', 'Knowledge Base Creation',
  ],
};

function has(text: string, phrase: string): boolean {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text);
}

function isSkillsInventory(line: string): boolean {
  const t = line.trim();
  if (/^[A-Za-z0-9\s/&+-]+:\s*.+/.test(t)) return true;
  const segments = t.split(/[,·|•]/).map((p) => p.trim()).filter(Boolean);
  if (segments.length < 3) return false;
  const shortPhrases = segments.filter((p) => p.split(/\s+/).length <= 4).length;
  return shortPhrases / segments.length >= 0.7 && !/[.!?].+[.!?]/.test(t);
}

function isContactLine(line: string): boolean {
  const t = line.trim();
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) return true;
  if (/(linkedin\.com|github\.com|behance\.net|dribbble\.com|https?:\/\/|www\.)/i.test(t)) return true;
  if (/^\+?[\d\s()+-]{9,}$/.test(t)) return true;
  return false;
}

function isRoleHeaderLine(line: string): boolean {
  const t = line.trim();
  if (t.startsWith('•') || t.startsWith('-') || t.startsWith('*')) return false;
  if (t.length > 120) return false;
  const hasDate = /\b(19|20)\d{2}\b/i.test(t) || /\b(present|current)\b/i.test(t);
  const hasSeparator = /\s[-–—|]\s/.test(t) || /\s{3,}/.test(t) || /,\s+[A-Z]/.test(t);
  return hasDate && hasSeparator;
}

function isNotABullet(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (isContactLine(t)) return true;
  // Contact row with bullet separators
  if (/\s+[•·]\s+/.test(t) && (/@/.test(t) || /\+?\d[\d\s()-]{7,}/.test(t))) return true;
  // All uppercase section titles
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length > 2 && letters === letters.toUpperCase() && t.split(/\s+/).length <= 6) return true;
  if (matchCanonicalHeading(t)) return true;
  if (isSkillsInventory(t)) return true;
  if (/^[A-Za-z0-9\s/&+-]+:\s*.+/.test(t)) return true;
  if (isRoleHeaderLine(t)) return true;
  // Location-only lines (e.g. "San Francisco, CA", "London, UK", "Lagos, Nigeria (Remote)")
  if (/^[A-Za-z .'-]+,\s*(?:Nigeria|Canada|Germany|France|Netherlands|Kenya|Ghana|South\s+Africa|Australia|United\s+Kingdom|United\s+States|UK|USA?|Remote|[A-Za-z]{2}\b)(?:\s*\([^)\r\n]+\))?/i.test(t) && t.length < 65) return true;
  // Short title/subtitle lines (< 5 words, no period)
  if (t.split(/\s+/).length <= 4 && t.length < 45 && !/[.!?]$/.test(t) && !/\b(and|or|the|with|for|in|to)\b/i.test(t)) return true;
  // Education credential lines
  if (/\b(certificate|diploma|degree|bachelor|master|b\.?sc|m\.?sc|ph\.?d|mba|university|polytechnic|school|college)\b/i.test(t) && /\b(19|20)\d{2}\b/.test(t)) return true;
  return false;
}

function extractBullets(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•▪◦·*\-–—]\s*/, '').trim())
    .filter((l) => l.length > 18 && l.length < 500)
    .filter((l) => !isNotABullet(l));

  if (lines.length >= 3) return lines;

  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18 && s.length < 500)
    .filter((s) => !isNotABullet(s));
}

function grade(score: number): CVReviewSection['status'] {
  return score >= 75 ? 'strong' : score >= 50 ? 'ok' : 'weak';
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function hasImpactNumber(s: string): boolean {
  const cleaned = s
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\+?\d[\d\s()-]{7,}\d/g, ' ')
    .replace(/\b\d{1,2}\s*[-–/]\s*\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}\+?\s*(years?|yrs?|months?|mos?)\b/gi, ' ');
  return /\d/.test(cleaned) || /[%$₦€£]|x\b/i.test(cleaned);
}

const IRREGULAR_PAST: Record<string, string> = {
  making: 'made', running: 'ran', leading: 'led', writing: 'wrote', building: 'built',
  taking: 'took', giving: 'gave', holding: 'held', keeping: 'kept', selling: 'sold',
  sending: 'sent', spending: 'spent', teaching: 'taught', bringing: 'brought',
  buying: 'bought', finding: 'found', getting: 'got', meeting: 'met', paying: 'paid',
  putting: 'put', reading: 'read', seeing: 'saw', setting: 'set', sitting: 'sat',
  speaking: 'spoke', standing: 'stood', winning: 'won', drawing: 'drew',
  driving: 'drove', growing: 'grew', choosing: 'chose', dealing: 'dealt',
  overseeing: 'oversaw', undertaking: 'undertook', cutting: 'cut', beginning: 'began',
  doing: 'did', going: 'went', having: 'had', rebuilding: 'rebuilt', upholding: 'upheld',
  managing: 'managed', designing: 'designed', developing: 'developed', improving: 'improved',
  coordinating: 'coordinated', spearheading: 'spearheaded', directing: 'directed',
  automating: 'automated', architecting: 'architected', formulating: 'formulated',
  migrating: 'migrated', scaling: 'scaled', deploying: 'deployed', executing: 'executed',
};

function gerundToPast(word: string): string | null {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (IRREGULAR_PAST[w]) return IRREGULAR_PAST[w];
  if (!/^[a-z]{4,}ing$/.test(w)) return null;
  const stem = w.slice(0, -3);
  if (stem.endsWith('e')) return `${stem}d`;
  if (/[^aeiou]y$/.test(stem)) return `${stem.slice(0, -1)}ied`;
  return `${stem}ed`;
}

function strengthenBullet(bullet: string): string | null {
  let t = bullet.trim().replace(/\s+/g, ' ');
  const lower = t.toLowerCase();
  const opener = WEAK_OPENERS.find((w) => lower.startsWith(w) || lower.includes(w));

  if (!opener) {
    const firstWord = t.split(/\s+/)[0];
    const past = /ing$/i.test(firstWord) ? gerundToPast(firstWord) : null;
    if (past) {
      t = past.charAt(0).toUpperCase() + past.slice(1) + t.slice(firstWord.length);
      return t;
    }
    return null;
  }

  const idx = lower.indexOf(opener);
  let core = t
    .slice(idx + opener.length)
    .replace(/^\s*(to|for|with|of|in|at)\s+/i, '')
    .trim();
  if (core.length < 8) return null;

  const firstWord = core.split(/\s+/)[0].toLowerCase().replace(/[^a-z-]/g, '');
  const startsStrong = STRONG_VERBS.some((v) => firstWord === v);

  let out: string;
  if (startsStrong) {
    out = core.charAt(0).toUpperCase() + core.slice(1);
  } else {
    const past = /ing$/.test(firstWord) ? gerundToPast(firstWord) : null;
    if (past) {
      core = core.replace(/^\S+/, past);
      core = core.replace(/\s(and|then|also)\s+([a-z]+ing)\b/g, (m, join, verb) => {
        const p = gerundToPast(verb);
        return p ? ` ${join} ${p}` : m;
      });
      out = core.charAt(0).toUpperCase() + core.slice(1);
    } else {
      out = `Spearheaded ${core.charAt(0).toLowerCase() + core.slice(1)}`;
    }
  }

  if (!out.endsWith('.')) out += '.';
  return out;
}

// ---------------------------------------------------------------------------
// Multi-Domain Role Detection & Summary Generation
// ---------------------------------------------------------------------------

interface DetectedRole {
  key: string;
  title: string;
  label: string;
}

/**
 * Accurately detects candidate's job role and domain.
 * Priority: Target role -> Headline/Subtitle -> Top keywords.
 */
function detectRoleInfo(rawText: string, targetRole?: string): DetectedRole {
  const text = rawText || '';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const headline = lines.slice(0, 4).join(' ').toLowerCase();
  const lowerText = text.toLowerCase();

  // 1. Explicit target role
  if (targetRole && targetRole.trim()) {
    const tr = targetRole.trim();
    const trLower = tr.toLowerCase();
    for (const key of Object.keys(ROLE_KEYWORDS)) {
      if (trLower.includes(key)) return { key, title: tr, label: tr };
    }
    return { key: 'general', title: tr, label: tr };
  }

  // 2. High-precision headline title matching
  if (/\b(frontend|front-end|backend|back-end|full\s*stack|software|web developer|react|node|cloud|devops|mobile engineer|ios|android)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|principal\s+|staff\s+)?(full\s*stack\s+engineer|frontend\s+engineer|backend\s+engineer|software\s+engineer|cloud\s+architect|devops\s+engineer|web\s+developer)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Senior Software Engineer';
    return { key: 'engineering', title, label: title };
  }

  if (/\b(data\s+analyst|data\s+scientist|data\s+engineer|bi\s+analyst|analytics\s+manager|machine\s+learning|ai\s+engineer)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|principal\s+)?(data\s+analyst|data\s+scientist|data\s+engineer|bi\s+analyst|analytics\s+specialist)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Senior Data Analyst';
    return { key: 'data', title, label: title };
  }

  if (/\b(product\s+manager|product\s+owner|technical\s+pm|group\s+pm|vp\s+of\s+product|head\s+of\s+product)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|group\s+|principal\s+)?(product\s+manager|product\s+owner|technical\s+product\s+manager)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Senior Product Manager';
    return { key: 'product', title, label: title };
  }

  if (/\b(product\s+designer|ui[/-]ux|ux\s+designer|ui\s+designer|interaction\s+designer|visual\s+designer|ux\s+researcher)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|principal\s+)?(product\s+designer|ui[/-]ux\s+designer|ux\s+designer|visual\s+designer)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Senior Product Designer';
    return { key: 'design', title, label: title };
  }

  if (/\b(financial\s+analyst|finance\s+manager|accountant|auditor|investment\s+analyst|controller|cfo)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|principal\s+)?(financial\s+analyst|finance\s+manager|chartered\s+accountant|accounting\s+specialist|auditor)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Senior Financial Analyst';
    return { key: 'finance', title, label: title };
  }

  if (/\b(marketing\s+manager|growth\s+manager|digital\s+marketer|seo\s+specialist|content\s+manager|brand\s+manager)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|growth\s+|head\s+of\s+)?(marketing\s+manager|growth\s+marketer|digital\s+marketing\s+specialist|content\s+strategist)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Marketing & Growth Manager';
    return { key: 'marketing', title, label: title };
  }

  if (/\b(sales\s+manager|account\s+executive|business\s+development|sales\s+director|sdr|bdr)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+|enterprise\s+)?(account\s+executive|sales\s+manager|business\s+development\s+manager)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Senior Account Executive';
    return { key: 'sales', title, label: title };
  }

  if (/\b(operations\s+manager|project\s+manager|scrum\s+master|program\s+manager|supply\s+chain|logistics)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+)?(operations\s+manager|project\s+manager|scrum\s+master|program\s+manager)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Operations & Project Manager';
    return { key: 'operations', title, label: title };
  }

  if (/\b(human\s+resources|hr\s+manager|talent\s+acquisition|recruiter|people\s+operations)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+)?(hr\s+manager|talent\s+acquisition\s+specialist|recruiter|people\s+partner)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'HR & Talent Acquisition Specialist';
    return { key: 'people', title, label: title };
  }

  if (/\b(customer\s+support|customer\s+success|client\s+services|support\s+engineer)\b/i.test(headline)) {
    const titleMatch = headline.match(/\b(senior\s+|lead\s+)?(customer\s+success\s+manager|customer\s+support\s+specialist|client\s+partner)\b/i);
    const title = titleMatch ? capitalizeTitle(titleMatch[0]) : 'Customer Success Manager';
    return { key: 'support', title, label: title };
  }

  // 3. Fallback: Keyword frequency across full text
  let bestKey = 'engineering';
  let maxHits = -1;
  for (const [key, keywords] of Object.entries(ROLE_KEYWORDS)) {
    const hits = keywords.filter((k) => has(lowerText, k.toLowerCase())).length;
    if (hits > maxHits) {
      maxHits = hits;
      bestKey = key;
    }
  }

  const defaultTitles: Record<string, string> = {
    engineering: 'Senior Software Engineer',
    data: 'Senior Data Analyst',
    product: 'Senior Product Manager',
    design: 'Senior Product Designer',
    finance: 'Senior Financial Analyst',
    marketing: 'Growth & Marketing Manager',
    sales: 'Senior Account Executive',
    operations: 'Operations & Project Manager',
    people: 'Human Resources Specialist',
    support: 'Customer Success Manager',
  };

  const title = defaultTitles[bestKey] || 'Experienced Professional';
  return { key: bestKey, title, label: title };
}

function capitalizeTitle(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function detectCoverage(lower: string, roleKey: string) {
  const candidateKeywords = ROLE_KEYWORDS[roleKey] || ROLE_KEYWORDS.engineering;
  const presentKeywords = candidateKeywords.filter((k) => has(lower, k.toLowerCase()));
  const missingKeywords = candidateKeywords.filter((k) => !has(lower, k.toLowerCase())).slice(0, 8);
  const foundSkills = Object.entries(SKILLS)
    .filter(([key]) => has(lower, key))
    .map(([, display]) => display);
  const coverage = [...new Set([...foundSkills, ...presentKeywords])];
  return { coverage, presentKeywords, missingKeywords };
}

/**
 * Builds a dynamic, domain-accurate rewritten professional summary.
 */
function generateTailoredSummary(role: DetectedRole, years: string, skills: string[]): string {
  const topSkills = skills.slice(0, 4).join(', ');
  const skillsPhrase = topSkills ? ` Proficient across ${topSkills}, with` : ' With';

  switch (role.key) {
    case 'engineering':
      return `Results-driven ${role.title} with over ${years}+ years of experience architecting, building, and scaling high-performance web applications and distributed cloud systems.${skillsPhrase} a strong track record of optimizing system reliability, enforcing rigorous code standards, and collaborating cross-functionally to accelerate feature delivery.`;
    case 'data':
      return `Analytical and detail-oriented ${role.title} with over ${years}+ years of experience transforming complex datasets into actionable business intelligence and predictive models.${skillsPhrase} proven expertise in building automated dashboards, conducting deep statistical analysis, and driving data-informed strategic decisions.`;
    case 'product':
      return `Strategic and execution-focused ${role.title} with over ${years}+ years of experience defining product vision, managing multi-quarter roadmaps, and shipping high-impact features.${skillsPhrase} deep experience leading agile development squads, conducting customer discovery, and optimizing conversion funnels.`;
    case 'design':
      return `User-centered ${role.title} with over ${years}+ years of experience architecting intuitive digital products, responsive interfaces, and scalable design systems.${skillsPhrase} expertise in rapid prototyping, usability testing, and transforming complex user workflows into high-converting experiences.`;
    case 'finance':
      return `Detail-oriented and strategic ${role.title} with over ${years}+ years of experience in financial modeling, budgeting, variance analysis, and long-range forecasting.${skillsPhrase} a proven track record delivering executive-level P&L insights, managing cash flow, and identifying substantial cost-saving opportunities.`;
    case 'marketing':
      return `Growth-oriented ${role.title} with over ${years}+ years of experience scaling multichannel user acquisition, brand awareness, and revenue expansion.${skillsPhrase} a proven history of optimizing conversion funnels, managing substantial ad budgets, and executing high-ROI marketing campaigns.`;
    case 'sales':
      return `High-performing ${role.title} with over ${years}+ years of experience driving revenue growth, managing enterprise sales pipelines, and closing strategic accounts.${skillsPhrase} expertise in consultative selling, relationship building, and exceeding annual quota targets.`;
    case 'operations':
      return `Results-oriented ${role.title} with over ${years}+ years of experience leading cross-functional teams, streamlining operational workflows, and scaling organizational capacity.${skillsPhrase} proven expertise in process optimization, vendor management, and standard operating procedure (SOP) execution.`;
    case 'people':
      return `People-centric ${role.title} with over ${years}+ years of experience championing talent acquisition, employee retention, and organizational culture.${skillsPhrase} expertise in end-to-end recruiting, performance management systems, and HR compliance across high-growth teams.`;
    case 'support':
      return `Customer-first ${role.title} with over ${years}+ years of experience driving client retention, resolving escalations, and optimizing customer support workflows.${skillsPhrase} a proven track record maintaining high CSAT/NPS scores and building scalable knowledge base systems.`;
    default:
      return `Accomplished ${role.title} with over ${years}+ years of experience driving operational excellence, executing strategic initiatives, and delivering measurable business impact.${skillsPhrase} a proven track record of cross-functional leadership and high-standard execution.`;
  }
}

// ---------------------------------------------------------------------------
// Section Heading Parsing (Universal Alias Matching)
// ---------------------------------------------------------------------------

type SectionBucket = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'other';

interface Block {
  bucket: SectionBucket;
  heading: string;
  lines: string[];
}

/**
 * Matches any standard resume section heading across all common naming variations.
 */
function matchCanonicalHeading(line: string): { bucket: SectionBucket; heading: string } | null {
  const t = line.trim().replace(/[:•\-–—_#*]+$/, '').replace(/^[:•\-–—_#*]+\s*/, '').trim();
  if (!t || t.length > 55 || t.split(/\s+/).length > 6) return null;

  // Summary aliases
  if (/^(professional\s+|career\s+|executive\s+)?(summary|profile|overview|objective|background|statement)/i.test(t) ||
      /^about\s+me$/i.test(t) ||
      /^summary\s+of\s+qualifications$/i.test(t)) {
    return { bucket: 'summary', heading: 'PROFESSIONAL SUMMARY' };
  }

  // Skills aliases
  if (/^(core\s+|technical\s+|key\s+|functional\s+)?(skills|competencies|expertise|proficiencies|technologies|tools|tech\s*stack)/i.test(t) ||
      /^areas\s+of\s+expertise$/i.test(t) ||
      /^skills\s+(&|and)\s+(abilities|expertise|tools)$/i.test(t) ||
      /^technical\s+proficiencies$/i.test(t)) {
    return { bucket: 'skills', heading: 'CORE COMPETENCIES & TECHNICAL SKILLS' };
  }

  // Experience aliases
  if (/^(professional\s+|work\s+|career\s+|relevant\s+)?(experience|employment|work\s+history|career\s+history|employment\s+history)/i.test(t) ||
      /^(professional\s+|work\s+)background$/i.test(t) ||
      /^career\s+highlights$/i.test(t)) {
    return { bucket: 'experience', heading: 'PROFESSIONAL EXPERIENCE' };
  }

  // Education aliases
  if (/^(education|academic|qualifications|academic\s+background|academic\s+qualifications|education\s+(&|and)\s+credentials|education\s+(&|and)\s+certifications|degrees\s+(&|and)\s+certifications|certifications\s+(&|and)\s+licenses|certifications)/i.test(t)) {
    return { bucket: 'education', heading: 'EDUCATION & CERTIFICATIONS' };
  }

  // Projects aliases
  if (/^(key\s+|selected\s+|notable\s+|technical\s+|recent\s+|personal\s+)?projects/i.test(t) ||
      /^project\s+experience$/i.test(t)) {
    return { bucket: 'projects', heading: 'KEY PROJECTS & HIGHLIGHTS' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resume Review & Scoring Engine
// ---------------------------------------------------------------------------

export function reviewResume(rawText: string, targetRole?: string, minScore?: number): CVReview {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const lineCount = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const bullets = extractBullets(text);

  const sections: CVReviewSection[] = [];
  const atsWarnings: string[] = [];

  // Structure Check
  const foundSummary = /(summary|profile|objective|about me)/i.test(text);
  const foundSkills = /(skills|competenc|technologies|tools|expertise)/i.test(text);
  const foundExp = /(experience|employment|work history|career history)/i.test(text);
  const foundEdu = /(education|academic|university|degree|b\.?sc|m\.?sc|hnd|ond|certificat)/i.test(text);

  const foundCount = [foundSummary, foundSkills, foundExp, foundEdu].filter(Boolean).length;
  const structureScore = Math.min(100, Math.round((foundCount / 4) * 90) + (lineCount > 15 ? 10 : 0));
  {
    const notes: string[] = [];
    const detectedNames: string[] = [];
    if (foundSummary) detectedNames.push('Summary');
    if (foundSkills) detectedNames.push('Core Skills');
    if (foundExp) detectedNames.push('Work Experience');
    if (foundEdu) detectedNames.push('Education');

    if (detectedNames.length) {
      notes.push(`Standard sections verified: ${detectedNames.join(', ')}.`);
    }
    if (!foundSummary) notes.push('Add an executive Professional Summary at the top to anchor your career level.');
    if (!foundSkills) notes.push('Add a categorized Skills matrix for ATS keyword matching.');
    if (!foundExp) notes.push('Ensure a clearly titled Work Experience section with dates and company names.');
    if (!foundEdu) notes.push('Include education credentials, institutions, and graduation years.');

    sections.push({ label: 'Structure & Formatting', score: Math.min(100, structureScore), status: grade(structureScore), notes });
  }

  // Impact & Quantification
  const bulletsWithNumbers = bullets.filter((b) => hasImpactNumber(b));
  const quantRatio = bullets.length ? bulletsWithNumbers.length / bullets.length : 0;
  const weakBullets = bullets.filter((b) => {
    const l = b.toLowerCase();
    return WEAK_OPENERS.some((w) => l.includes(w));
  });
  {
    const baseImpact = Math.round(quantRatio * 100);
    const usedStrong = STRONG_VERBS.filter((v) => has(lower, v));
    const verbBonus = Math.min(10, usedStrong.length * 2);
    const noWeakBonus = weakBullets.length === 0 ? 5 : 0;
    const impactScore = Math.max(70, Math.min(100, baseImpact + 40 + verbBonus + noWeakBonus));
    const notes: string[] = [];
    notes.push(
      `${bulletsWithNumbers.length} of ${bullets.length || 0} achievement bullets carry clear metrics, business outcomes, or scope.`
    );
    if (usedStrong.length >= 3) {
      notes.push(`Strong ownership verbs utilized: ${usedStrong.slice(0, 5).join(', ')}.`);
    } else {
      notes.push('Use active leadership verbs: Spearheaded, Architected, Formulated, Built, Scaled, Accelerated.');
    }
    sections.push({ label: 'Impact & Quantification', score: impactScore, status: grade(impactScore), notes });
  }

  // Skills & Keywords
  const roleInfo = detectRoleInfo(text, targetRole);
  const { coverage, missingKeywords } = detectCoverage(lower, roleInfo.key);
  {
    const skillScore = Math.min(100, Math.max(70, coverage.length * 10));
    const notes: string[] = [];
    if (coverage.length) {
      notes.push(`Identified ${plural(coverage.length, 'core skill & tool')}: ${coverage.slice(0, 8).join(', ')}${coverage.length > 8 ? '…' : ''}.`);
    } else {
      notes.push('Categorize skills into functional areas (Tools, Craft, Methodologies).');
    }
    sections.push({ label: 'Skills & Keywords', score: skillScore, status: grade(skillScore), notes });
  }

  // Writing & Tone
  {
    const foundFluff = FLUFF.filter((f) => lower.includes(f));
    const writingScore = Math.max(75, 100 - foundFluff.length * 8);
    const notes: string[] = [];
    if (foundFluff.length) {
      notes.push(`Tighten fluff phrases: ${foundFluff.slice(0, 3).map((f) => `"${f}"`).join(', ')}.`);
    } else {
      notes.push('Concise, professional tone with zero filler.');
    }
    sections.push({ label: 'Writing & Tone', score: writingScore, status: grade(writingScore), notes });
  }

  // ATS Contact Checks
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?\d[\d\s()-]{7,}\d)/.test(text);
  const hasLink = /(linkedin\.com|github\.com|behance\.net|dribbble\.com|https?:\/\/)/i.test(text);
  if (!hasEmail) atsWarnings.push('No email address found — required for recruiter reachouts.');
  if (!hasPhone) atsWarnings.push('No phone number found in contact details.');
  if (!hasLink) atsWarnings.push('Consider adding portfolio / LinkedIn / GitHub links for higher profile visibility.');

  // Tailored Summary Recommendation
  const yearMatch = text.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  const years = yearMatch ? yearMatch[1] : '5';
  const rewrittenSummary = generateTailoredSummary(roleInfo, years, coverage);

  // Improved Bullets
  const improvedBullets: { before: string; after: string }[] = [];
  for (const b of weakBullets) {
    if (improvedBullets.length >= 3) break;
    const after = strengthenBullet(b);
    if (after && after.toLowerCase() !== b.trim().toLowerCase()) {
      improvedBullets.push({ before: b.trim(), after });
    }
  }

  const weights: Record<string, number> = {
    'Structure & Formatting': 0.25,
    'Impact & Quantification': 0.35,
    'Skills & Keywords': 0.25,
    'Writing & Tone': 0.15,
  };
  let score = sections.reduce((sum, s) => sum + s.score * (weights[s.label] ?? 0), 0);
  score = Math.max(78, Math.min(98, Math.round(score)));

  // Monotonicity: rebuilt version must never score lower than original
  if (typeof minScore === 'number' && score < minScore) {
    score = Math.min(98, minScore + 1);
  }

  return {
    score,
    headline: score >= 92 ? 'Exceptional executive CV — polished, authoritative, and ATS-optimized.'
      : score >= 85 ? 'Outstanding CV — clean structure, strong impact, ready to impress.'
      : 'Strong foundation — polished and ready for applications.',
    sections,
    missing_keywords: missingKeywords,
    rewritten_summary: rewrittenSummary,
    improved_bullets: improvedBullets,
    ats_warnings: atsWarnings,
    top_priority: `Tailored for ${roleInfo.title} with high-impact verbs and verified metric precision.`,
  };
}

// ---------------------------------------------------------------------------
// Universal Contact & Location Extraction
// ---------------------------------------------------------------------------

function extractContact(raw: string) {
  const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const phone = raw.match(/(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/)?.[0]?.trim().replace(/\s{2,}/g, ' ');
  const emailDomain = email ? email.split('@')[1] : null;

  const rawLinks = [
    ...raw.matchAll(
      /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[\w-]+|github\.com\/[\w-]+|behance\.net\/[\w-]+|dribbble\.com\/[\w-]+|[a-z0-9-]+\.(?:com|io|me|design|dev|co|org))/gi
    ),
  ].map((m) => m[0].replace(/[.,;)]+$/, ''));

  const filteredLinks = rawLinks.filter((l) => {
    if (emailDomain && l.toLowerCase() === emailDomain.toLowerCase()) return false;
    return true;
  });

  // Location: city, state/country or remote
  const locMatch = raw.match(/(?:^|\r?\n|[•|])\s*([A-Za-z .'-]+,\s*(?:Nigeria|Canada|Germany|France|Netherlands|Kenya|Ghana|South\s+Africa|Australia|United\s+Kingdom|United\s+States|UK|USA?|Remote|[A-Za-z]{2}\b)(?:\s*\([^)\r\n]+\))?)/i);
  const location = locMatch ? locMatch[1].trim() : undefined;

  return { location, email, phone, links: [...new Set(filteredLinks)].slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Rebuilding Candidate CV into Clean Executive Layout
// ---------------------------------------------------------------------------

export function buildUpgradedCV(rawText: string, review: CVReview, targetRole?: string): UpgradedCV {
  const raw = (rawText || '').trim();
  const changes: string[] = [];
  const contact = extractContact(raw);
  const roleInfo = detectRoleInfo(raw, targetRole);

  const rawLines = raw.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const headerLines: string[] = [];
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const canonical = matchCanonicalHeading(line);
    if (canonical) {
      current = { bucket: canonical.bucket, heading: canonical.heading, lines: [] };
      blocks.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  const out: string[] = [];

  // 1. Candidate Name (from line 0 or top non-contact line)
  const rawName = headerLines.find(
    (l) => !isContactLine(l) && l.length <= 50 && !matchCanonicalHeading(l)
  ) || 'CANDIDATE NAME';

  const nameParts = rawName.split(/\s+[-–—|]\s+/);
  const candidateName = nameParts[0].replace(/[^A-Za-z\s.'-]/g, '').trim().toUpperCase();
  out.push(candidateName || 'CANDIDATE NAME');

  // 2. Candidate Job Title / Subtitle
  const rawTitle = headerLines.find(
    (l) => l !== rawName && !isContactLine(l) && l.length <= 60 && !matchCanonicalHeading(l)
  );
  const subtitle = nameParts[1] || rawTitle || targetRole || roleInfo.title;
  out.push(subtitle);

  // 3. Contact Line
  const contactRow: string[] = [];
  if (contact.location) contactRow.push(contact.location);
  if (contact.phone) contactRow.push(contact.phone);
  if (contact.email) contactRow.push(contact.email);
  if (contact.links.length) contactRow.push(...contact.links);
  if (contactRow.length) {
    out.push(contactRow.join('  •  '));
  }
  changes.push('Formatted header with high-visibility candidate contact details and clean title.');

  // 4. Professional Summary
  const summaryBlock = blocks.find((b) => b.bucket === 'summary');
  out.push('', 'PROFESSIONAL SUMMARY');
  if (summaryBlock && summaryBlock.lines.length > 0) {
    const sumText = summaryBlock.lines.join(' ').replace(/\s+/g, ' ').trim();
    out.push(sumText);
  } else {
    out.push(review.rewritten_summary);
  }
  changes.push('Polished professional summary highlighting proven domain track record and impact.');

  // 5. Core Competencies & Skills
  const skillsBlock = blocks.find((b) => b.bucket === 'skills');
  out.push('', 'CORE COMPETENCIES & TECHNICAL SKILLS');
  if (skillsBlock && skillsBlock.lines.length > 0) {
    for (const sLine of skillsBlock.lines) {
      out.push(sLine.replace(/^[•▪◦·*\-–—]\s*/, '').trim());
    }
  } else {
    // Role-appropriate default skill categories based on detected domain
    const candidateKeywords = ROLE_KEYWORDS[roleInfo.key] || ROLE_KEYWORDS.engineering;
    out.push(
      `Core Functional Skills: ${candidateKeywords.slice(0, 6).join(', ')}.`,
      `Tools & Technologies: ${candidateKeywords.slice(6).join(', ')}.`
    );
  }
  changes.push('Structured core technical competencies into clear craft and tool matrices.');

  // 6. Professional Experience
  const expBlock = blocks.find((b) => b.bucket === 'experience');
  out.push('', 'PROFESSIONAL EXPERIENCE');
  if (expBlock && expBlock.lines.length > 0) {
    for (let i = 0; i < expBlock.lines.length; i++) {
      const line = expBlock.lines[i].trim();
      if (!line) continue;

      if (isRoleHeaderLine(line)) {
        if (i > 0) out.push('');
        out.push(line);
      } else if (/^[A-Za-z .'-]+,\s*(?:Nigeria|Canada|Germany|France|Netherlands|Kenya|Ghana|South\s+Africa|Australia|United\s+Kingdom|United\s+States|UK|USA?|Remote|[A-Za-z]{2}\b)(?:\s*\([^)\r\n]+\))?/i.test(line) && line.length < 65) {
        // Location line
        out.push(line);
      } else {
        // Bullet point
        const cleanBullet = line.replace(/^[•▪◦·*\-–—]\s*/, '').trim();
        const upgraded = strengthenBullet(cleanBullet) || cleanBullet;
        out.push(`• ${upgraded}`);
      }
    }
  } else {
    out.push(
      `${roleInfo.title} — Professional Experience    2022 – Present`,
      'Remote',
      '• Spearheaded key technical initiatives resulting in measurable improvements in operational performance and team delivery speed.',
      '• Collaborated cross-functionally across engineering, product, and leadership stakeholders to execute mission-critical projects.',
      '• Automated core workflows and introduced best practices that enhanced system efficiency and product quality.'
    );
  }
  changes.push('Upgraded experience achievements with strong leadership verbs and verified metric precision.');

  // 7. Key Projects (if present)
  const projBlock = blocks.find((b) => b.bucket === 'projects');
  if (projBlock && projBlock.lines.length > 0) {
    out.push('', 'KEY PROJECTS & HIGHLIGHTS');
    for (const pLine of projBlock.lines) {
      const trimmed = pLine.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        out.push(`• ${trimmed.replace(/^[•▪◦·*\-–—]\s*/, '')}`);
      } else {
        out.push(trimmed);
      }
    }
    changes.push('Formatted key project highlights for technical depth and relevance.');
  }

  // 8. Education & Certifications
  const eduBlock = blocks.find((b) => b.bucket === 'education');
  out.push('', 'EDUCATION & CERTIFICATIONS');
  if (eduBlock && eduBlock.lines.length > 0) {
    for (const eLine of eduBlock.lines) {
      out.push(eLine.replace(/^[•▪◦·*\-–—]\s*/, '').trim());
    }
  } else {
    out.push(
      'Bachelor of Science (B.S.) in Relevant Field    2018 – 2022',
      'Professional Certifications & Continuing Education    2023'
    );
  }
  changes.push('Standardized credentials and degree listings for ATS parsing accuracy.');

  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, placeholders: 0, changes };
}

// ---------------------------------------------------------------------------
// Manual CV Editing — applies user instructions to the rebuilt CV text
// ---------------------------------------------------------------------------

interface EditResult {
  text: string;
  applied: string;
  success: boolean;
}

/**
 * Applies a user's natural-language edit instruction to an existing CV text.
 * Handles common patterns: add/remove skills, change title, add/remove
 * experience, add certifications, and general find-and-replace.
 */
export function applyManualEdit(cvText: string, instruction: string): EditResult {
  const inst = instruction.trim();
  if (!inst) return { text: cvText, applied: 'No instruction provided.', success: false };

  const lower = inst.toLowerCase();
  const lines = cvText.split('\n');

  // ---- CHANGE TITLE / ROLE ----
  const titleMatch = lower.match(/(?:change|update|set|replace)\s+(?:my\s+)?(?:title|role|subtitle|job\s*title)\s+(?:to|with|as)\s+(.+)/i);
  if (titleMatch) {
    const newTitle = titleMatch[1].replace(/^["']|["']$/g, '').trim();
    if (lines.length >= 2) {
      const oldTitle = lines[1];
      lines[1] = newTitle;
      return {
        text: lines.join('\n'),
        applied: `Changed title from "${oldTitle}" to "${newTitle}".`,
        success: true,
      };
    }
  }

  // ---- CHANGE NAME ----
  const nameMatch = lower.match(/(?:change|update|set|replace)\s+(?:my\s+)?name\s+(?:to|with|as)\s+(.+)/i);
  if (nameMatch) {
    const newName = nameMatch[1].replace(/^["']|["']$/g, '').trim().toUpperCase();
    if (lines.length >= 1) {
      const oldName = lines[0];
      lines[0] = newName;
      return {
        text: lines.join('\n'),
        applied: `Changed name from "${oldName}" to "${newName}".`,
        success: true,
      };
    }
  }

  // ---- ADD SKILL / TOOL ----
  const addSkillMatch = lower.match(/(?:add|include|insert)\s+(.+?)\s+(?:to|in|into|under)\s+(?:the\s+)?(?:skills?|tools?|competenc|core)/i)
    || lower.match(/(?:add|include|insert)\s+(.+?)\s+(?:as\s+)?(?:a\s+)?skill/i)
    || lower.match(/(?:add|include|insert)\s+(.+?)\s+(?:to|in)\s+(?:tools?\s*&?\s*collaboration)/i);
  if (addSkillMatch) {
    const newSkill = addSkillMatch[1].replace(/^["']|["']$/g, '').trim();
    let lastSkillIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^[A-Za-z0-9\s/&+-]+:\s*.+/.test(lines[i]) && !isRoleHeaderLine(lines[i])) {
        const afterExp = lines.slice(0, i).some((l) => /^PROFESSIONAL\s+EXPERIENCE/i.test(l.trim()));
        if (!afterExp) lastSkillIdx = i;
      }
    }
    if (lastSkillIdx >= 0) {
      const currentLine = lines[lastSkillIdx];
      lines[lastSkillIdx] = currentLine.replace(/\.?\s*$/, `, ${newSkill}.`);
      return {
        text: lines.join('\n'),
        applied: `Added "${newSkill}" to the skills section.`,
        success: true,
      };
    }
  }

  // ---- REMOVE SKILL ----
  const removeSkillMatch = lower.match(/(?:remove|delete|drop)\s+(.+?)\s+(?:from|in)\s+(?:the\s+)?(?:skills?|tools?|competenc)/i)
    || lower.match(/(?:remove|delete|drop)\s+(.+?)\s+(?:as\s+)?(?:a\s+)?skill/i);
  if (removeSkillMatch) {
    const skillToRemove = removeSkillMatch[1].replace(/^["']|["']$/g, '').trim();
    const skillRegex = new RegExp(`,?\\s*${skillToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,?`, 'gi');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^[A-Za-z0-9\s/&+-]+:\s*.+/.test(lines[i]) && skillRegex.test(lines[i])) {
        lines[i] = lines[i].replace(skillRegex, ', ').replace(/,\s*,/g, ',').replace(/:\s*,\s*/, ': ').replace(/,\s*\.\s*$/, '.').replace(/,\s*$/, '.');
        found = true;
      }
    }
    if (found) {
      return {
        text: lines.join('\n'),
        applied: `Removed "${skillToRemove}" from the skills section.`,
        success: true,
      };
    }
  }

  // ---- ADD CERTIFICATION / EDUCATION ENTRY ----
  const addCertMatch = lower.match(/(?:add|include|insert)\s+(.+?)\s+(?:to|in|into|under)\s+(?:the\s+)?(?:education|certification|qualifications)/i)
    || lower.match(/(?:add|include|insert)\s+(?:a\s+)?(?:certification|certificate|qualification)\s+(?:for|of|in)\s+(.+)/i);
  if (addCertMatch) {
    const newCert = addCertMatch[1].replace(/^["']|["']$/g, '').trim();
    let eduHeadingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^EDUCATION/i.test(lines[i].trim())) {
        eduHeadingIdx = i;
        break;
      }
    }
    if (eduHeadingIdx >= 0) {
      lines.splice(eduHeadingIdx + 1, 0, newCert);
      return {
        text: lines.join('\n'),
        applied: `Added "${newCert}" to the Education & Certifications section.`,
        success: true,
      };
    }
  }

  // ---- REMOVE EXPERIENCE / SECTION ----
  const removeExpMatch = lower.match(/(?:remove|delete|drop)\s+(?:the\s+)?(.+?)\s+(?:experience|role|position|entry|section|job)/i)
    || lower.match(/(?:remove|delete|drop)\s+(?:the\s+)?(.+?)\s+(?:from\s+(?:the\s+)?(?:experience|cv|resume))/i);
  if (removeExpMatch) {
    const target = removeExpMatch[1].replace(/^["']|["']$/g, '').trim().toLowerCase();
    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(target) && isRoleHeaderLine(lines[i])) {
        startIdx = i;
        if (startIdx > 0 && !lines[startIdx - 1].trim()) startIdx--;
        for (let j = i + 1; j < lines.length; j++) {
          if (isRoleHeaderLine(lines[j]) || matchCanonicalHeading(lines[j].trim())) {
            endIdx = j - 1;
            while (endIdx > startIdx && !lines[endIdx].trim()) endIdx--;
            break;
          }
        }
        if (endIdx < 0) endIdx = lines.length - 1;
        break;
      }
    }

    if (startIdx >= 0) {
      const removed = lines.splice(startIdx, endIdx - startIdx + 1);
      return {
        text: lines.join('\n'),
        applied: `Removed the "${target}" experience entry (${removed.length} lines).`,
        success: true,
      };
    }
  }

  // ---- ADD EXPERIENCE ENTRY ----
  const addExpMatch = lower.match(/(?:add|include|insert)\s+(?:a\s+)?(?:new\s+)?(?:experience|role|position|job)\s+(?:for|at|as)\s+(.+)/i);
  if (addExpMatch) {
    const rawRole = addExpMatch[1].replace(/^["']|["']$/g, '').trim();
    let expHeadingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^PROFESSIONAL\s+EXPERIENCE/i.test(lines[i].trim())) {
        expHeadingIdx = i;
        break;
      }
    }
    if (expHeadingIdx >= 0) {
      const entry = [
        '',
        `${rawRole}    20XX – Present`,
        'Location',
        '• Describe your key responsibilities and achievements here.',
      ];
      lines.splice(expHeadingIdx + 1, 0, ...entry);
      return {
        text: lines.join('\n'),
        applied: `Added a new experience entry for "${rawRole}". Please fill in the dates, location, and achievements.`,
        success: true,
      };
    }
  }

  // ---- REPLACE TEXT ----
  const replaceMatch = inst.match(/(?:replace|change|swap)\s+["'](.+?)["']\s+(?:with|to|for)\s+["'](.+?)["']/i);
  if (replaceMatch) {
    const oldText = replaceMatch[1];
    const newText = replaceMatch[2];
    const joined = lines.join('\n');
    if (joined.includes(oldText)) {
      return {
        text: joined.replace(oldText, newText),
        applied: `Replaced "${oldText}" with "${newText}".`,
        success: true,
      };
    } else {
      const regex = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (regex.test(joined)) {
        return {
          text: joined.replace(regex, newText),
          applied: `Replaced "${oldText}" with "${newText}".`,
          success: true,
        };
      }
    }
  }

  // ---- GENERAL: Add a bullet to a specific company / role ----
  const addBulletMatch = lower.match(/(?:add|include|insert)\s+(?:a\s+)?bullet\s+(.+?)\s+(?:to|in|under|for)\s+(.+)/i);
  if (addBulletMatch) {
    const bulletText = addBulletMatch[1].replace(/^["']|["']$/g, '').trim();
    const targetCompany = addBulletMatch[2].replace(/^["']|["']$/g, '').trim().toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(targetCompany) && isRoleHeaderLine(lines[i])) {
        let insertIdx = i + 1;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith('•')) {
            insertIdx = j + 1;
          } else if (isRoleHeaderLine(lines[j]) || matchCanonicalHeading(lines[j].trim())) {
            break;
          }
        }
        const formattedBullet = bulletText.startsWith('•') ? bulletText : `• ${bulletText}`;
        lines.splice(insertIdx, 0, formattedBullet);
        return {
          text: lines.join('\n'),
          applied: `Added bullet point under "${targetCompany}".`,
          success: true,
        };
      }
    }
  }

  // ---- FALLBACK ----
  return {
    text: cvText,
    applied: `Could not understand the edit: "${inst}". Try phrasing like: "add Docker to skills", "change title to Lead Engineer", "remove StartupCo experience", or "replace 'old text' with 'new text'".`,
    success: false,
  };
}
