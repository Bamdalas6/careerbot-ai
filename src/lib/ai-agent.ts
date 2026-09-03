import { JobListing, JobSearchQuery, ResumeProfile } from '@/types/job';
import { runSearch } from './job-providers';

export interface ChatResponse {
  message: string;
  jobs: JobListing[];
  suggested_queries: string[];
  extracted_filters: Partial<JobSearchQuery>;
}

/** Small-talk that should never trigger a board sweep. */
const GREETING = /^(hi|hii|hey|hello|yo|good (morning|afternoon|evening)|how are you|who are you|what can you do|help)\b/i;

/** Already shown as a structured seniority chip; don't repeat it as a role word. */
const LEVEL_WORDS = new Set([
  'senior', 'sr', 'junior', 'jr', 'entry', 'mid', 'intermediate', 'lead', 'principal',
  'staff', 'intern', 'internship', 'graduate', 'trainee', 'fresher', 'experienced',
  'head', 'director', 'vp', 'chief', 'executive', 'nysc',
]);

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Natural-language job discovery.
 *
 * The reply deliberately states what was understood and what was searched.
 * A user who sees "role: product designer · Lagos, Nigeria · 14 boards" can
 * tell instantly when the bot misread them — which is impossible when the
 * reply is just "I found 6 relevant positions".
 */
export async function processChatQuery(
  userPrompt: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<ChatResponse> {
  const trimmed = (userPrompt || '').trim();

  // A bare greeting with no role words in it is conversation, not a search.
  if (GREETING.test(trimmed) && trimmed.split(/\s+/).length <= 5) {
    return {
      message:
        `Hi 👋 I'm **CareerBot**. I read your question, work out the role, location and work ` +
        `arrangement you mean, then search live openings straight from employer career pages — ` +
        `Renmoney, FairMoney, Kuda, Jumia, Interswitch, Andela, One Acre Fund, Canonical and more — ` +
        `plus remote feeds that hire into Africa.\n\n` +
        `Every card links to verified application pages or direct employer forms. Tell me what you're after, ` +
        `or upload your CV and I'll match you to what's open.`,
      jobs: [],
      suggested_queries: [
        'Frontend developer jobs in Lagos',
        'Remote data analyst roles open to Nigeria',
        'Entry level product designer in Africa',
        'Backend engineer, Python, Kenya',
      ],
      extracted_filters: {},
    };
  }

  const wantsAll = /\b(all|every|more|show all|list all|all roles|all jobs|full list|everything)\b/i.test(trimmed);
  const searchLimit = wantsAll ? 80 : 30;
  const { jobs, diagnostics } = await runSearch(trimmed, searchLimit);
  const { parsed, sourcesQueried, fetched, relevant, related, rejected } = diagnostics;

  // ---- what the bot understood, echoed back so mistakes are visible ----
  const understood: string[] = [];
  const roleWords = parsed.terms.filter(
    (t) => !LEVEL_WORDS.has(t) && !parsed.skills.some((s) => s.toLowerCase() === t)
  );
  if (roleWords.length) understood.push(`**${roleWords.slice(0, 3).join(' ')}**`);
  if (parsed.skills.length) understood.push(parsed.skills.slice(0, 4).join(', '));
  if (parsed.seniority) understood.push(`${parsed.seniority}-level`);
  if (parsed.location) understood.push(parsed.location.label);
  if (parsed.isRemote === true) understood.push('remote');
  if (parsed.isRemote === false) understood.push('on-site');

  const extractedFilters: Partial<JobSearchQuery> = {
    query: parsed.terms.join(' ') || trimmed,
    skills: parsed.skills.length ? parsed.skills : undefined,
    location: parsed.location?.label,
    is_remote: parsed.isRemote,
    experience_level: parsed.seniority,
  };

  const sourceLine = `Searched ${plural(sourcesQueried.length, 'live source')} and read ${plural(fetched, 'open posting')}.`;

  let message: string;
  const suggested: string[] = [];

  if (jobs.length > 0) {
    const top = jobs[0];
    const filteredOut =
      rejected.offTopic + rejected.wrongLocation + rejected.wrongArrangement + rejected.stale;

    const displayCountNote =
      jobs.length < relevant
        ? `Showing the top ${jobs.length} best-matched roles out of ${plural(relevant, 'matching opening')} below:`
        : `Showing all ${jobs.length} matching roles below:`;

    message =
      (understood.length ? `Reading that as ${understood.join(' · ')}.\n\n` : '') +
      `${sourceLine} Found ${plural(relevant, 'matching opening')}` +
      (filteredOut ? ` (filtered out ${filteredOut} non-matching or stale postings)` : '') +
      `.\n\n` +
      `Best fit is **${top.title}** at **${top.company}** — ${top.match_reason} (${top.match_score}%). ` +
      (related
        ? `Exact matches were thin, so I've added ${plural(related, 'nearby role')} from the same field — those are marked *Related field* so you can tell them apart. `
        : '') +
      (rejected.stale
        ? `Nothing here is older than five months — filtered out ${plural(rejected.stale, 'stale posting')}. `
        : '') +
      (jobs.some((j) => ['Greenhouse', 'Lever', 'Workable', 'Ashby', 'Direct ATS'].includes(j.source))
        ? `Cards from employer boards open the company's application form directly; aggregated listings open verified application pages.`
        : `Every card links directly to the verified application page.`) +
      `\n\n${displayCountNote}`;

    if (parsed.location) suggested.push(`Remote ${roleWords[0] || 'roles'} open to ${parsed.location.label}`);
    if (!parsed.seniority) suggested.push(`Entry level ${roleWords.slice(0, 2).join(' ') || 'roles'}`);
    suggested.push(`${roleWords.slice(0, 2).join(' ') || 'Jobs'} in Lagos`, 'Remote roles hiring across Africa');
  } else {
    // Explain the actual reason nothing came back rather than shrugging.
    const why: string[] = [];
    if (rejected.stale) why.push(`${rejected.stale} were older than five months`);
    if (rejected.wrongLocation) why.push(`${rejected.wrongLocation} were outside ${parsed.location?.label ?? 'your location'}`);
    if (rejected.wrongArrangement) why.push(`${rejected.wrongArrangement} weren't ${parsed.isRemote ? 'remote' : 'on-site'}`);
    if (rejected.offTopic) why.push(`${rejected.offTopic} were a different kind of role`);

    message =
      (understood.length ? `Reading that as ${understood.join(' · ')}.\n\n` : '') +
      `${sourceLine} None of them genuinely fit` +
      (why.length ? ` — ${why.join(', ')}` : '') +
      `.\n\nI'd rather show you nothing than pad the list with roles you didn't ask for. ` +
      `Try a broader title, drop the location, or allow remote.`;

    if (parsed.location) suggested.push(`${roleWords.slice(0, 2).join(' ') || 'Roles'} anywhere in Africa`);
    if (parsed.isRemote === true) suggested.push(`${roleWords.slice(0, 2).join(' ') || 'Roles'} including on-site`);
    suggested.push('Frontend developer jobs in Lagos', 'Remote data analyst roles', 'Entry level roles in Nigeria');
  }

  return {
    message,
    jobs,
    suggested_queries: [...new Set(suggested)].slice(0, 4),
    extracted_filters: extractedFilters,
  };
}

// Comprehensive Multi-Industry Skill & Tool Dictionary
const SKILL_DICTIONARY: string[] = [
  // Engineering & Web Development
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Python', 'Go', 'Rust',
  'Java', 'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Flutter', 'React Native',
  'HTML5', 'CSS3', 'Tailwind CSS', 'Sass', 'Redux', 'Zustand', 'Vue.js', 'Angular', 'Svelte',
  'GraphQL', 'REST APIs', 'gRPC', 'WebSockets', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'SQLite', 'DynamoDB', 'Cassandra', 'Elasticsearch', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Git', 'GitHub', 'GitLab', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Terraform', 'Linux', 'Microservices',
  'Serverless', 'Jest', 'Cypress', 'Playwright', 'Webpack', 'Vite', 'Kafka', 'RabbitMQ',
  'System Design', 'TDD', 'Agile', 'Scrum', 'Performance Optimization',

  // Design & Creative
  'Figma', 'FigJam', 'UI/UX Design', 'UI Design', 'UX Design', 'Design Systems', 'Design Tokens',
  'Auto-Layout', 'Wireframing', 'Prototyping', 'Rapid Prototyping', 'Usability Testing',
  'User Research', 'User Interviews', 'User Journey Mapping', 'User Flows', 'Information Architecture',
  'Interaction Design', 'Visual Design', 'Brand Identity', 'Typography', 'Developer Handoff',
  'WCAG AA', 'Accessibility', 'Micro-Interactions', 'Adobe XD', 'Adobe Photoshop', 'Adobe Illustrator',
  'Adobe Creative Cloud', 'InDesign', 'After Effects', 'Canva', 'Webflow', 'Framer', 'Sketch',

  // Data, Analytics & AI
  'SQL', 'PostgreSQL', 'Python', 'R', 'Pandas', 'NumPy', 'Scikit-learn', 'PyTorch', 'TensorFlow',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Generative AI', 'LLMs',
  'Tableau', 'Power BI', 'Looker', 'Metabase', 'Excel', 'VBA', 'Data Modeling', 'Data Pipelines',
  'ETL', 'dbt', 'Snowflake', 'BigQuery', 'Databricks', 'Apache Spark', 'Airflow', 'Statistical Analysis',
  'A/B Testing', 'Hypothesis Testing', 'Regression Analysis', 'Forecasting', 'Cohort Analysis',
  'Predictive Modeling', 'Business Intelligence',

  // Finance & Accounting
  'Financial Modeling', 'Three-statement modeling', 'DCF valuation', 'Valuation', 'Variance Analysis',
  'Budgeting & Forecasting', 'Financial Planning & Analysis (FP&A)', 'P&L Management',
  'Financial Reporting', 'Cash Flow Management', 'Working Capital', 'Audit & Compliance',
  'IFRS', 'GAAP', 'Tax Accounting', 'Advanced Excel', 'SAP ERP', 'SAP', 'Oracle ERP',
  'Hyperion', 'Bloomberg Terminal', 'QuickBooks', 'NetSuite', 'Xero', 'Capital Budgeting',
  'Scenario Modeling', 'M&A', 'Due Diligence',

  // Marketing & Growth
  'Growth Marketing', 'Digital Marketing', 'SEO', 'SEM', 'SEO/SEM', 'Google Ads', 'Meta Ads Manager',
  'LinkedIn Campaign Manager', 'Content Marketing', 'Content Strategy', 'Copywriting',
  'Email Marketing', 'Marketing Automation', 'HubSpot', 'Mailchimp', 'Klaviyo',
  'Google Analytics 4', 'Mixpanel', 'Amplitude', 'Conversion Rate Optimization (CRO)',
  'Customer Acquisition Cost (CAC)', 'LTV Optimization', 'Social Media Marketing',
  'Brand Strategy', 'Public Relations', 'Influencer Marketing', 'Zapier',

  // Sales & Business Development
  'Sales Pipeline', 'Pipeline Management', 'Enterprise Sales', 'B2B Sales', 'Lead Generation',
  'Cold Calling', 'Outbound Prospecting', 'Account Management', 'Key Account Management',
  'Solution Selling', 'Consultative Selling', 'Contract Negotiation', 'Deal Closing',
  'CRM Management', 'Salesforce', 'HubSpot CRM', 'Quota Attainment', 'Client Retention',

  // Product Management
  'Product Strategy', 'Product Roadmap', 'User Stories', 'Product Discovery', 'Sprint Planning',
  'Backlog Grooming', 'Feature Prioritization', 'KPIs & Metrics', 'OKRs', 'Go-to-Market (GTM)',
  'Customer Interviews', 'Competitive Analysis', 'Agile / Scrum', 'Jira', 'Confluence', 'Linear',
  'Notion', 'Market Research', 'PRDs',

  // Operations & HR
  'Process Optimization', 'Project Management', 'Scrum Master', 'Operations Management',
  'Supply Chain Management', 'Logistics Planning', 'Vendor Management', 'SOPs',
  'Standard Operating Procedures', 'Cost Reduction', 'Change Management', 'Asana', 'Monday.com',
  'Talent Acquisition', 'Full-Cycle Recruiting', 'Technical Recruiting', 'HRIS Systems',
  'Workday', 'BambooHR', 'Employee Relations', 'Performance Management', 'Onboarding',
  'Compensation & Benefits', 'Labor Law Compliance',

  // Customer Support & Success
  'Customer Success', 'Technical Support', 'Customer Support', 'Zendesk', 'Intercom', 'Freshdesk',
  'SLA Adherence', 'Ticket Management', 'CSAT / NPS', 'Escalation Management',
  'Knowledge Base Creation', 'Customer Retention', 'Root Cause Analysis',
];

/**
 * Parses raw resume text to extract candidate name, job title, skills, experience, and location.
 */
export function parseResumeText(rawText: string): ResumeProfile {
  const text = (rawText || '').trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Candidate Name
  let name = '';
  for (const line of lines.slice(0, 3)) {
    if (!/@/.test(line) && !/http|www|\.com|\.org|\+?\d{8,}/i.test(line)) {
      const clean = line.replace(/[^A-Za-z\s.'-]/g, '').trim();
      if (clean.length >= 3 && clean.length <= 40 && clean.split(/\s+/).length <= 4) {
        name = clean.toUpperCase();
        break;
      }
    }
  }

  // 2. Candidate Location
  const locMatch = text.match(
    /(?:^|\r?\n|[•|])\s*([A-Za-z .'-]+,\s*(?:Nigeria|Canada|Germany|France|Netherlands|Kenya|Ghana|South\s+Africa|Australia|United\s+Kingdom|United\s+States|UK|USA?|Remote|[A-Za-z]{2}\b)(?:\s*\([^)\r\n]+\))?)/i
  );
  const preferred_locations = locMatch ? [locMatch[1].trim()] : [];

  // 3. Extract Job Title
  let extractedTitle = '';
  for (const line of lines.slice(0, 4)) {
    if (line.toUpperCase() === name) continue;
    if (/@/.test(line) || /http|www|\.com|\.org|\+?\d{8,}/i.test(line)) continue;
    if (/^(summary|profile|skills|experience|education|objective)/i.test(line)) continue;
    if (line.length > 4 && line.length <= 65 && !/[.!?]$/.test(line)) {
      extractedTitle = line.replace(/^[•▪◦·*\-–—|]\s*/, '').trim();
      break;
    }
  }

  // 4. Extract Skills from Dedicated Skills Section
  const skillsFound = new Set<string>();
  let inSkillsSection = false;

  for (const line of lines) {
    if (
      /^(core\s+|technical\s+|key\s+|functional\s+)?(skills|competencies|expertise|proficiencies|technologies|tools|tech\s*stack)/i.test(
        line
      ) ||
      /^areas\s+of\s+expertise/i.test(line)
    ) {
      inSkillsSection = true;
      continue;
    }
    if (inSkillsSection) {
      if (
        /^(experience|employment|work\s+history|education|academic|projects|summary|profile|certifications)/i.test(
          line
        )
      ) {
        inSkillsSection = false;
        continue;
      }
      // Parse skill line avoiding comma split inside parentheses
      const cleanLine = line.replace(/^[A-Za-z0-9\s/&+-]+:\s*/, '').replace(/^[•▪◦·*\-–—]\s*/, '');
      const parts = cleanLine.split(/,(?![^(]*\))|[·|•;]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const s = part.replace(/\.$/, '').trim();
        if (s.length >= 2 && s.length <= 45 && !/^(and|or|with|the|in|for)$/i.test(s)) {
          skillsFound.add(s);
        }
      }
    }
  }

  // 5. Match against comprehensive skill dictionary across full text
  for (const skill of SKILL_DICTIONARY) {
    const esc = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_])${esc}([^a-zA-Z0-9_]|$)`, 'i');
    if (regex.test(text)) {
      const alreadyHas = Array.from(skillsFound).some((s) => s.toLowerCase() === skill.toLowerCase());
      if (!alreadyHas) {
        skillsFound.add(skill);
      }
    }
  }

  const skills = Array.from(skillsFound);

  // 6. Experience Years
  let experienceYears = 3;
  const expMatch = text.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  if (expMatch) {
    experienceYears = parseInt(expMatch[1], 10);
  } else {
    const yearsFound = Array.from(text.matchAll(/\b(19\d\d|20\d\d)\b/g)).map((m) => parseInt(m[1], 10));
    if (yearsFound.length >= 2) {
      const minYear = Math.min(...yearsFound);
      const maxYear = new Date().getFullYear();
      const diff = maxYear - minYear;
      if (diff > 0 && diff <= 35) {
        experienceYears = Math.min(diff, 15);
      }
    }
  }

  // 7. Fallback title if not detected from header
  if (!extractedTitle) {
    const skillsLower = skills.map((s) => s.toLowerCase());
    if (skillsLower.some((s) => ['react', 'vue', 'angular', 'next.js', 'typescript', 'frontend'].includes(s))) {
      extractedTitle = 'Frontend Engineer';
    } else if (skillsLower.some((s) => ['figma', 'ui/ux design', 'wireframing', 'design systems'].includes(s))) {
      extractedTitle = 'Product Designer';
    } else if (skillsLower.some((s) => ['financial modeling', 'dcf valuation', 'fp&a', 'variance analysis'].includes(s))) {
      extractedTitle = 'Financial Analyst';
    } else if (skillsLower.some((s) => ['sql', 'tableau', 'power bi', 'python', 'data modeling'].includes(s))) {
      extractedTitle = 'Data Analyst';
    } else if (skillsLower.some((s) => ['seo', 'google ads', 'hubspot', 'growth marketing'].includes(s))) {
      extractedTitle = 'Marketing Manager';
    } else if (skillsLower.some((s) => ['pipeline management', 'salesforce', 'enterprise sales'].includes(s))) {
      extractedTitle = 'Account Executive';
    } else if (skillsLower.some((s) => ['talent acquisition', 'recruiting', 'hris'].includes(s))) {
      extractedTitle = 'Human Resources Specialist';
    } else {
      extractedTitle = 'Experienced Professional';
    }
  }

  const preferred_roles = [
    extractedTitle,
    `Senior ${extractedTitle.replace(/^Senior\s+/i, '')}`,
    `Lead ${extractedTitle.replace(/^Lead\s+|^Senior\s+/i, '')}`,
  ];

  const summary = `Extracted ${skills.length} core competencies including ${skills.slice(0, 4).join(', ')} with ~${experienceYears}+ years experience.`;

  return {
    name,
    extracted_title: extractedTitle,
    skills: skills.length > 0 ? skills : ['Communication', 'Project Management', 'Problem Solving'],
    experience_years: experienceYears,
    preferred_locations,
    preferred_roles,
    summary,
  };
}

import { getDomainStoryArc } from './follow-up-generator';

/**
 * Generates tailored cover notes & key talking points for a specific job across any profession,
 * with an authentic, story-driven, mission-aligned tone.
 */
export function generateTailoredPitch(
  job: JobListing,
  userSkills: string[] = ['Problem Solving', 'Execution']
) {
  const topSkills = job.tags.slice(0, 3).join(', ') || userSkills.slice(0, 3).join(', ');
  const arc = getDomainStoryArc(job.title, job.company);

  return {
    pitch_bullets: [
      `Formative connection to the problem space: ${arc.origin.slice(0, 140)}...`,
      `Deep practical craftsmanship in ${topSkills || 'relevant methodologies'}, built on ownership and measurable outcomes.`,
      `Genuine mission alignment with ${job.company}: eager to tackle high-stakes challenges as your next ${job.title}.`,
    ],
    cover_note: `Hi ${job.company} Team,\n\n${arc.origin}\n\nOver the past several years, I have specialized in ${topSkills}, taking full ownership of complex projects and building systems engineered for real-world impact. ${arc.philosophy}\n\n${arc.click(job.company, job.title)}\n\nIf you're still looking for someone who can step in and take full ownership, I'd love to explore how I could contribute.\n\nWarm Regards,`,
    interview_tips: [
      `Anchor your answers in a real origin story: share the specific moment or problem that made you passionate about ${job.tags[0] || job.title}.`,
      `Prepare 2 concrete examples demonstrating deep ownership, resilience under pressure, and how you delivered measurable business results.`,
      `Research ${job.company}'s core mission and be ready to articulate why their specific product and challenges matter deeply to you.`,
    ],
  };
}

