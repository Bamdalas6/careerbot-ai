import { JobListing, JobSearchQuery, ResumeProfile } from '@/types/job';
import { runSearch } from './job-providers';
import { ParsedQuery, parseQuery } from './query-parser';

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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Dynamic, charismatic wingman commentary tailored to parsed intent:
 * remote pajamas dream, entry-level grinds, senior battle scars, salary bags, tech stacks.
 */
function generateWingmanCommentary(parsed: ParsedQuery, rawPrompt: string): string {
  const quips: string[] = [];

  // 1. Remote vs On-site vs Hybrid
  if (parsed.isRemote === true) {
    const remoteQuips = [
      'Sweatpants on, commute skipped, and zero morning traffic jams? Elite lifestyle choice. 🛋️💻',
      'Hunting for that work-from-anywhere freedom where your daily commute is walking to the coffee pot.',
      'Filtering strictly for pajamas-friendly, high-trust remote setups with zero cubicle surveillance.',
    ];
    quips.push(remoteQuips[Math.abs(hashString(rawPrompt + 'remote')) % remoteQuips.length]);
  } else if (parsed.isRemote === false) {
    if (/\bhybrid\b/i.test(rawPrompt)) {
      const hybridQuips = [
        'Best of both worlds: Deep work from your couch on Tuesday, high-fives and whiteboard energy on Thursday. 🛋️🏢',
        'Hunting for that goldilocks hybrid balance — focused autonomy when you need it, face-to-face team synergy when it counts. ⚡✨',
      ];
      quips.push(hybridQuips[Math.abs(hashString(rawPrompt + 'hybrid')) % hybridQuips.length]);
    } else {
      const onsiteQuips = [
        'Gearing up for real-world collaboration! Whiteboards, actual high-fives, and office AC on blast. 🏢✨',
        'Looking for a proper in-office base where you can brainstorm in person (and raid the office snack stash).',
      ];
      quips.push(onsiteQuips[Math.abs(hashString(rawPrompt + 'onsite')) % onsiteQuips.length]);
    }
  }

  // 2. Seniority & Level
  if (parsed.seniority === 'Entry') {
    const entryQuips = [
      "No 'must have 8 years experience with a tool launched last summer' absurdity allowed here. Real launchpads only! 🚀",
      "Breaking into the arena without the usual entry-level catch-22 paradox. Let's get that foot firmly in the door!",
      'Time to trade student lecture slides and NYSC boots for an honest paycheck. Hunting for teams ready to sponsor your learning curve.',
    ];
    quips.push(entryQuips[Math.abs(hashString(rawPrompt + 'entry')) % entryQuips.length]);
  } else if (parsed.seniority === 'Senior') {
    const seniorQuips = [
      'Senior tier: Time to get paid for making tricky architecture look effortless and putting out production fires before lunch. ⚡👑',
      'Heavy-hitter mode activated. Seeking teams ready to respect your battle scars and compensate accordingly.',
    ];
    quips.push(seniorQuips[Math.abs(hashString(rawPrompt + 'senior')) % seniorQuips.length]);
  } else if (parsed.seniority === 'Lead' || parsed.seniority === 'Executive') {
    const leadQuips = [
      'Leadership radar on: Looking for teams that need strategic vision, roadmap clarity, and someone to herd the brilliant cats. 🎯💼',
      'Steering the ship: Seeking a desk with real ownership, autonomy, and high-impact influence.',
    ];
    quips.push(leadQuips[Math.abs(hashString(rawPrompt + 'lead')) % leadQuips.length]);
  } else if (parsed.seniority === 'Mid') {
    quips.push('Mid-level powerhouse: The absolute sweet spot of autonomous building and minimal corporate overhead. 🛠️');
  }

  // 3. Salary & Bag Hunting
  const wantsHighPay =
    parsed.minSalary != null ||
    /(?:[$₦£€]|\b(?:salary|pay|paying|pays|money|bag|high[- ]paying|well[- ]paid|cash|compensation|six[- ]figures|\d+k|\d+m|naira|dollars?|pounds?|euros?|shillings?|cedis?|rands?|usd|ngn|gbp|eur|kes|ghs|zar|cad|aud)\b)/i.test(rawPrompt);
  if (wantsHighPay && quips.length < 2) {
    const payQuips = [
      "Bag-securing protocol engaged 💰: Filtering for offers that pay real compensation, not just 'valuable exposure'.",
      'Hunting for compensation packages that actually respect your craft and leave plenty of room for savings and good coffee. 📈',
    ];
    quips.push(payQuips[Math.abs(hashString(rawPrompt + 'pay')) % payQuips.length]);
  }

  // 4. Skills & Tech Stack or Role Family
  if (quips.length < 2 && parsed.skills.length > 0) {
    const skillNames = parsed.skills.map((s) => s.toLowerCase());
    if (skillNames.some((s) => ['react', 'next.js', 'vue', 'angular', 'svelte', 'frontend'].includes(s))) {
      quips.push('Crafting pixel-perfect layouts and snappy interfaces that never break layout shift. 🎨✨');
    } else if (skillNames.some((s) => ['python', 'node.js', 'go', 'rust', 'java', 'backend', 'fastapi', 'c++', 'c#'].includes(s))) {
      quips.push('Backend firepower: Clean APIs, rock-solid endpoints, and databases that hum under load. ⚙️🔥');
    } else if (skillNames.some((s) => ['machine learning', 'ml', 'ai', 'data science', 'pytorch', 'tensorflow'].includes(s))) {
      quips.push('Taming messy datasets and building intelligence that actually moves the needle. 🤖📊');
    } else if (skillNames.some((s) => ['figma', 'ui/ux', 'design'].includes(s))) {
      quips.push('Making sure the world looks less like Windows 95 and more like pure digital poetry. ✨');
    } else {
      quips.push(`Dialing in on ${parsed.skills.slice(0, 3).join(', ')} — weapon of choice primed and ready.`);
    }
  } else if (quips.length < 2 && parsed.family) {
    if (parsed.family === 'product') {
      quips.push('Writing crisp PRDs, slaying roadmap scope creep, and keeping everyone aligned. 📋🚀');
    } else if (parsed.family === 'marketing' || parsed.family === 'sales') {
      quips.push('Driving real pipeline, closing deals, and generating revenue velocity. 📈💼');
    } else if (parsed.family === 'finance') {
      quips.push('Balancing books, calculating DCFs, and delivering the kind of ROI that makes leadership cheer. 📊💵');
    }
  }

  // 5. Target Location or Company Shoutouts
  if (quips.length < 2 && parsed.location) {
    if (parsed.location.country === 'NG' || parsed.location.label.toLowerCase().includes('lagos')) {
      quips.push('Tapping into the Nigerian tech scene — high-velocity fintechs, direct employer portals, and zero middleman delay. 🇳🇬⚡');
    } else if (parsed.location.isRegion) {
      quips.push(`Sweeping verified opportunities across ${parsed.location.label} — premier cross-border pipelines primed and ready. 🌍`);
    } else {
      quips.push(`Targeting ${parsed.location.label} — hunting verified openings in your preferred territory. 📍`);
    }
  }

  const companyMatch = rawPrompt.match(/\b(fairmoney|kuda|renmoney|interswitch|andela|paystack|flutterwave|piggyvest|cowrywise|reliance\s*health|helium\s*health|seamlesshr)\b/i);
  if (quips.length < 2 && companyMatch) {
    const matchedCompany = companyMatch[0].charAt(0).toUpperCase() + companyMatch[0].slice(1);
    quips.push(`Direct target lock on ${matchedCompany}: High-conviction play. Connecting directly to their live employer feed. 🎯`);
  }

  // Fallback if no specific tag triggered
  if (quips.length === 0) {
    const generalQuips = [
      "Let's get you in front of teams that genuinely value top talent and ship meaningful work.",
      'Sifting through the noise to find real openings where your craftsmanship can shine.',
      'Career wingman locked and loaded — searching verified company pipelines with zero fluff.',
    ];
    quips.push(generalQuips[Math.abs(hashString(rawPrompt)) % generalQuips.length]);
  }

  return quips.slice(0, 2).join(' ');
}

/**
 * Natural, engaging commentary on the #1 best match instead of robotic formula text.
 */
function generateTopMatchCommentary(top: JobListing): string {
  const score = top.match_score || 85;
  let endorsement = '';
  if (score >= 90) {
    endorsement = `Absolute bullseye match (${score}% 🔥) — your profile aligns with their stack so tightly it's almost suspicious.`;
  } else if (score >= 80) {
    endorsement = `Prime contender (${score}% match ⚡) — heavy alignment here, and their team is actively hiring.`;
  } else {
    endorsement = `Solid prospect (${score}% match 🎯) — checks the key boxes and gives you immediate leverage.`;
  }

  const reasonText = top.match_reason
    ? top.match_reason.endsWith('.')
      ? top.match_reason
      : `${top.match_reason}.`
    : 'Strong alignment with your profile requirements.';

  return (
    `🥇 **Wingman's Top Pick:**\n` +
    `**${top.title}** at **${top.company}**\n` +
    `${endorsement} ${reasonText} Direct ATS portal is verified and primed.`
  );
}

/**
 * Humorous yet encouraging career coach energy for zero-result states.
 */
function generateZeroResultCoaching(
  parsed: ParsedQuery,
  rawPrompt: string,
  rejected: { offTopic: number; wrongLocation: number; wrongArrangement: number; stale: number }
): string {
  const tips: string[] = [];

  if (parsed.isRemote === false) {
    tips.push('• **Unlock Remote:** On-site roles can be regionally tight right now. Allowing remote opens up 4x more employer pipelines.');
  } else if (parsed.isRemote === true && rejected.wrongArrangement > 0) {
    tips.push('• **Hybrid / Regional Flex:** Several high-caliber local teams are hiring on-site or hybrid nearby if you are open to the occasional commute.');
  }

  if (parsed.location && (rejected.wrongLocation > 0 || !rejected.offTopic)) {
    tips.push(`• **Widen the Geography:** Broaden from ${parsed.location.label} to across Africa or global remote hubs.`);
  }

  if (parsed.skills.length > 2) {
    tips.push('• **Trim the Stack Filter:** Asking for 4+ niche technologies simultaneously narrows the net. Search by your primary title or core framework first.');
  } else {
    tips.push('• **Try an Adjacent Title:** Companies often title roles creatively (e.g. "Software Engineer" instead of "Fullstack Next.js Specialist").');
  }

  if (rejected.stale > 0) {
    tips.push('• **Fresh Bread Guarantee:** We discarded expired ghost requisitions so you do not waste effort. Mid-week sweeps catch fresh openings as team budgets unlock.');
  }

  return `🥊 **Career Coach Game Plan:**\n${tips.join('\n')}`;
}

/**
 * Natural-language job discovery.
 *
 * Charismatic, conversational career wingman voice with factual telemetry,
 * witty commentary, and encouraging zero-match coaching.
 */
export async function processChatQuery(
  userPrompt: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<ChatResponse> {
  const trimmed = (userPrompt || '').trim();
  const preParsed = parseQuery(trimmed);

  const preRoleWords = preParsed.terms.filter(
    (t) => !LEVEL_WORDS.has(t) && !preParsed.skills.some((s) => s.toLowerCase() === t)
  );

  const hasSearchIntent =
    preRoleWords.length > 0 ||
    preParsed.skills.length > 0 ||
    preParsed.location !== null ||
    preParsed.family !== null ||
    preParsed.isRemote !== undefined ||
    preParsed.seniority !== undefined ||
    preParsed.minSalary != null;

  // A bare greeting with no role words or filters in it is conversation, not a search.
  if (GREETING.test(trimmed) && !hasSearchIntent) {
    return {
      message:
        `Hey there! 👋 I'm **CareerBot**, your personal career wingman with zero chill and direct access to live employer pipelines.\n\n` +
        `No expired listings from 2022, no phantom recruiters, and zero corporate fluff. I sweep real company boards — from African tech powerhouses like FairMoney, Kuda, Renmoney, Interswitch, and Andela to global remote teams hiring worldwide.\n\n` +
        `Drop a target role, dream stack, desired location, or even that ambitious salary number into the chat (or upload your CV), and let's go hunt some offers! 🚀`,
      jobs: [],
      suggested_queries: [
        'Frontend developer roles in Lagos',
        'Remote data analyst roles open to Africa',
        'Entry level product designer in Nigeria',
        'Backend engineer, Python, remote',
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
  if (parsed.isRemote === false) understood.push(/\bhybrid\b/i.test(trimmed) ? 'hybrid' : 'on-site');
  if (parsed.minSalary != null) {
    const rawSalaryMatch =
      trimmed.match(/(?:[$₦£€]|usd|ngn|gbp|eur|kes|ghs|zar|cad|aud|n)\s*\d[\d,.]*\s*(?:k|m)?\s*(?:naira|ngn|usd|dollars?|pounds?|euros?|gbp|eur|kes|shillings?|ghs|cedis?|zar|rands?|cad|aud)?\b/i) ||
      trimmed.match(/\b\d[\d,.]*\s*(?:k|m)\s*(?:naira|ngn|usd|dollars?|pounds?|euros?|gbp|eur|kes|shillings?|ghs|cedis?|zar|rands?|cad|aud)?\b/i) ||
      trimmed.match(/\b\d[\d,]{3,}\s*(?:naira|ngn|usd|dollars?|pounds?|euros?|gbp|eur|kes|shillings?|ghs|cedis?|zar|rands?|cad|aud)\b/i);
    const salaryTag = rawSalaryMatch && rawSalaryMatch[0].trim() ? rawSalaryMatch[0].trim() : `${parsed.minSalary.toLocaleString()}+`;
    understood.push(salaryTag);
  }

  const extractedFilters: Partial<JobSearchQuery> = {
    query: parsed.terms.join(' ') || trimmed,
    skills: parsed.skills.length ? parsed.skills : undefined,
    location: parsed.location?.label,
    is_remote: parsed.isRemote,
    experience_level: parsed.seniority,
  };

  let message: string;
  const suggested: string[] = [];

  if (jobs.length > 0) {
    const top = jobs[0];
    const filteredOut =
      rejected.offTopic + rejected.wrongLocation + rejected.wrongArrangement + rejected.stale;

    const totalCount = Math.max(jobs.length, relevant);
    const displayCountNote =
      jobs.length < totalCount
        ? `Showing the top **${jobs.length}** best-matched roles below (out of ${plural(totalCount, 'active opening')}):`
        : `All **${jobs.length}** matching roles are laid out below:`;

    const wingmanNotes: string[] = [];

    if (related > 0) {
      wingmanNotes.push(
        `💡 *Field Expansion:* Exact titles were tight, so I added ${plural(related, 'adjacent role')} from your field (marked *Related field*) to give you high-yield options.`
      );
    }
    if (rejected.stale > 0) {
      wingmanNotes.push(
        `🧹 *Freshness Guarantee:* Purged ${plural(rejected.stale, 'stale posting')} older than 5 months into the digital bin. Fresh bread only!`
      );
    }

    const atsLinksNote = jobs.some((j) => ['Greenhouse', 'Lever', 'Workable', 'Ashby', 'Direct ATS'].includes(j.source))
      ? `Verified direct company links attached — cards open the official application form with zero aggregator spam.`
      : `Every card below links directly to the verified employer application page.`;

    const targetHeader = understood.length
      ? `🎯 **Radar Target:** ${understood.join(' · ')}`
      : parsed.isBrowse || !trimmed
        ? `🎯 **Radar Target:** Curated Top Openings Across the Ecosystem`
        : `🎯 **Radar Swept:** "${trimmed}"`;

    const commentary = generateWingmanCommentary(parsed, trimmed);
    const topPickHighlight = generateTopMatchCommentary(top);
    const sourceStat = `Scanned **${plural(sourcesQueried.length, 'live company board')}** across **${plural(fetched, 'raw posting')}**`;
    const filterStat = filteredOut > 0 ? ` (tossed out ${filteredOut} stale listings or mismatches so your feed stays pristine)` : '';
    const resultStat = `We struck gold on **${plural(totalCount, 'verified active opening')}**!`;

    message = [
      `${targetHeader}\n${commentary}`,
      `⚡ **The Sweep:**\n${sourceStat}${filterStat}. ${resultStat}`,
      topPickHighlight,
      wingmanNotes.length > 0 ? wingmanNotes.join('\n') : '',
      `🔗 **Verified Pipeline:** ${atsLinksNote} Tap **"Tailor Application"** on any card to whip up a bespoke pitch, cover letter, or recruiter DM!`,
      displayCountNote,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (parsed.location) suggested.push(`Remote ${roleWords[0] || 'roles'} open to ${parsed.location.label}`);
    if (parsed.isRemote) suggested.push(`Top-paying remote ${roleWords[0] || 'tech'} roles`);
    if (!parsed.seniority) suggested.push(`Entry level ${roleWords.slice(0, 2).join(' ') || 'roles'}`);
    suggested.push(`${roleWords.slice(0, 2).join(' ') || 'Jobs'} in Lagos`, 'Remote roles hiring across Africa');
  } else {
    // Explain the actual reason nothing came back with humorous yet encouraging career coach energy.
    const why: string[] = [];
    if (rejected.stale) why.push(`${plural(rejected.stale, 'posting')} were dinosaur relics older than five months`);
    if (rejected.wrongLocation) why.push(`${plural(rejected.wrongLocation, 'posting')} were located outside ${parsed.location?.label ?? 'your target zone'}`);
    if (rejected.wrongArrangement) why.push(`${plural(rejected.wrongArrangement, 'posting')} didn't support ${parsed.isRemote ? 'remote' : 'on-site'}`);
    if (rejected.offTopic) why.push(`${plural(rejected.offTopic, 'posting')} were completely different roles masquerading under your keywords`);

    const targetHeader = understood.length
      ? `🎯 **Radar Sweep for:** ${understood.join(' · ')}`
      : `🎯 **Radar Sweep for:** "${trimmed || 'General Search'}"`;

    const coachCommentary = generateZeroResultCoaching(parsed, trimmed, rejected);

    message = [
      targetHeader,
      `🔎 **Sweep Breakdown:**\nSearched ${plural(sourcesQueried.length, 'live board')} across ${plural(fetched, 'raw posting')}. And honestly? None of them made the cut${why.length ? ` — ${why.join(', ')}` : ''}.`,
      `🛡️ **Wingman's Honor:**\nI'd rather hand you a blank screen than pad your feed with 3-month-old ghost jobs or irrelevant roles you never asked for. Your time is too valuable to waste on low-probability applications!`,
      coachCommentary,
      `Try one of the curated pivots below, or drop the location filter to let the search run wild! 👇`,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (parsed.location) suggested.push(`${roleWords.slice(0, 2).join(' ') || 'Roles'} anywhere in Africa`);
    if (parsed.isRemote === true || parsed.isRemote === false) suggested.push(`Remote ${roleWords.slice(0, 2).join(' ') || 'roles'}`);
    suggested.push('Frontend developer jobs in Lagos', 'Remote data analyst roles', 'Product designer roles');
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

