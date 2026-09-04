/**
 * Query understanding.
 *
 * The chat box gets prose ("find me remote react jobs in lagos that pay well"),
 * but every downstream decision — which boards to hit, what to send to the
 * upstream search params, whether a posting is actually relevant — needs
 * structure. This module is the single place that turns one into the other.
 *
 * The important property is that `terms` contains ONLY words that carry search
 * signal. If filler like "find", "jobs", "me" or "remote" leaks into `terms`,
 * relevance scoring degenerates: nearly every posting contains one of them, so
 * everything scores as a match and the results look random.
 */

export type Seniority = 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive';

export interface LocationIntent {
  /** Human label to show back to the user, e.g. "Lagos, Nigeria". */
  label: string;
  /** ISO-ish country code used to match against board regions. */
  country?: string;
  /** Lowercase strings that, if present in a job location, count as a hit. */
  tokens: string[];
  /** True for continent-level asks ("africa") — matches any African country. */
  isRegion: boolean;
}

export interface ParsedQuery {
  raw: string;
  /** Meaningful, de-duplicated, lowercased search terms. May be empty. */
  terms: string[];
  /** Recognised technology/skill names, properly cased for display. */
  skills: string[];
  /** Recognised occupation family, used to reject cross-domain matches. */
  family: string | null;
  location: LocationIntent | null;
  isRemote?: boolean;
  seniority?: Seniority;
  /** Annual figure in the currency the user implied; used as a soft signal. */
  minSalary?: number;
  /** True when the user gave no real constraints — show a curated browse list. */
  isBrowse: boolean;
}

/**
 * Words that appear in almost every posting or carry no search signal.
 * Anything here is stripped before scoring — see the module docstring for why
 * that matters so much.
 */
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'by', 'for',
  'with', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this',
  'these', 'those', 'it', 'its', 'my', 'me', 'i', 'you', 'your', 'we', 'our', 'us', 'they',
  'find', 'finding', 'search', 'searching', 'show', 'showing', 'get', 'getting', 'give',
  'want', 'wants', 'wanted', 'need', 'needs', 'looking', 'look', 'seek', 'seeking',
  'please', 'can', 'could', 'would', 'should', 'help', 'am', 'do', 'does', 'any', 'some',
  'all', 'more', 'most', 'best', 'top', 'good', 'great', 'nice', 'new', 'latest', 'current',
  'available', 'open', 'openings', 'opening', 'opportunity', 'opportunities', 'vacancy',
  'vacancies', 'job', 'jobs', 'role', 'roles', 'position', 'positions', 'posting',
  'postings', 'hiring', 'hire', 'hires', 'apply', 'application', 'career', 'careers',
  'work', 'working', 'employment', 'list', 'near', 'around', 'about', 'like', 'kind',
  'type', 'well', 'pay', 'paying', 'pays', 'salary', 'paid', 'level', 'years', 'year',
  'experience', 'exp', 'company', 'companies', 'startup', 'startups', 'who', 'what',
  'where', 'which', 'how', 'there', 'here', 'now', 'today', 'please', 'thanks',
  'hi', 'hii', 'hey', 'hello', 'yo', 'sup', 'howdy', 'greetings', 'morning', 'afternoon', 'evening',
  'naira', 'ngn', 'usd', 'dollar', 'dollars', 'gbp', 'pound', 'pounds', 'eur', 'euro', 'euros',
  'kes', 'shilling', 'shillings', 'ghs', 'cedi', 'cedis', 'zar', 'rand', 'rands', 'cad', 'aud',
]);

/**
 * Skill vocabulary. Keys are matched case-insensitively as whole words; the
 * value is the display casing. Multi-word entries are matched as phrases.
 */
const SKILLS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', 'react.js': 'React',
  reactjs: 'React', 'next.js': 'Next.js', nextjs: 'Next.js', 'node.js': 'Node.js',
  nodejs: 'Node.js', node: 'Node.js', vue: 'Vue.js', 'vue.js': 'Vue.js', angular: 'Angular',
  svelte: 'Svelte', python: 'Python', django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
  java: 'Java', kotlin: 'Kotlin', swift: 'Swift', golang: 'Go', 'c++': 'C++', 'cplusplus': 'C++',
  'c#': 'C#', csharp: 'C#', '.net': '.NET', dotnet: '.NET',
  rust: 'Rust', php: 'PHP', laravel: 'Laravel', ruby: 'Ruby', rails: 'Rails',
  aws: 'AWS', azure: 'Azure', gcp: 'GCP', docker: 'Docker', kubernetes: 'Kubernetes',
  terraform: 'Terraform', devops: 'DevOps', 'ci/cd': 'CI/CD', linux: 'Linux', git: 'Git',
  sql: 'SQL', postgresql: 'PostgreSQL', postgres: 'PostgreSQL', mysql: 'MySQL',
  mongodb: 'MongoDB', redis: 'Redis', graphql: 'GraphQL', rest: 'REST', grpc: 'gRPC',
  'machine learning': 'Machine Learning', ml: 'Machine Learning', ai: 'AI',
  pytorch: 'PyTorch', tensorflow: 'TensorFlow', llm: 'LLM', nlp: 'NLP',
  'data science': 'Data Science', pandas: 'Pandas', spark: 'Spark', airflow: 'Airflow',
  kafka: 'Kafka', snowflake: 'Snowflake', tableau: 'Tableau', 'power bi': 'Power BI',
  excel: 'Excel', figma: 'Figma', sketch: 'Sketch', 'ui/ux': 'UI/UX', ux: 'UX', ui: 'UI',
  tailwind: 'Tailwind CSS', css: 'CSS', html: 'HTML', flutter: 'Flutter',
  'react native': 'React Native', android: 'Android', ios: 'iOS', salesforce: 'Salesforce',
  sap: 'SAP', seo: 'SEO', accounting: 'Accounting', ifrs: 'IFRS', acca: 'ACCA',
};

/**
 * Occupation families. A posting from a different family is rejected outright —
 * this is what stops a "product designer" search from returning
 * "Business Relationship Manager". Each family lists words that identify it.
 */
const FAMILIES: Record<string, string[]> = {
  engineering: [
    'engineer', 'engineering', 'developer', 'dev', 'programmer', 'swe', 'software',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full-stack', 'mobile',
    'android', 'ios', 'devops', 'sre', 'platform', 'infrastructure', 'architect', 'qa',
    'sdet', 'tester', 'security', 'cloud', 'embedded', 'firmware', 'blockchain',
  ],
  data: [
    'data', 'analyst', 'analytics', 'scientist', 'science', 'machine', 'learning', 'ml',
    'ai', 'bi', 'statistician', 'quant', 'research',
  ],
  design: [
    'design', 'designer', 'ux', 'ui', 'creative', 'graphic', 'brand', 'illustrator',
    'motion', 'visual',
  ],
  product: ['product', 'pm', 'owner', 'scrum', 'agile', 'program', 'project', 'delivery'],
  sales: [
    'sales', 'account', 'business', 'development', 'partnership', 'growth', 'revenue',
    'relationship', 'commercial', 'merchant', 'retail', 'trade',
  ],
  marketing: [
    'marketing', 'marketer', 'content', 'social', 'seo', 'communications', 'copywriter',
    'pr', 'campaign', 'community',
  ],
  finance: [
    'finance', 'financial', 'accountant', 'accounting', 'audit', 'auditor', 'treasury',
    'tax', 'controller', 'credit', 'risk', 'underwriting', 'actuarial', 'investment',
  ],
  operations: [
    'operations', 'operational', 'logistics', 'supply', 'chain', 'warehouse', 'fleet',
    'procurement', 'facility', 'admin', 'administrative', 'coordinator',
  ],
  people: [
    'hr', 'human', 'resources', 'recruiter', 'recruitment', 'talent', 'people', 'training',
    'learning', 'culture',
  ],
  support: [
    'support', 'customer', 'success', 'service', 'helpdesk', 'care', 'agent',
    'representative', 'call',
  ],
  health: [
    'nurse', 'nursing', 'doctor', 'physician', 'clinical', 'medical', 'health',
    'healthcare', 'pharmacist', 'lab', 'laboratory',
  ],
  legal: ['legal', 'lawyer', 'counsel', 'attorney', 'compliance', 'regulatory', 'paralegal'],
};

/** Reverse index: word -> family, built once at module load. */
const FAMILY_OF: Record<string, string> = {};
for (const [family, words] of Object.entries(FAMILIES)) {
  for (const w of words) if (!(w in FAMILY_OF)) FAMILY_OF[w] = family;
}

/**
 * Location vocabulary, weighted toward Africa because that is where the
 * previous version had no coverage at all. `tokens` are what we look for
 * inside a posting's location string.
 */
const LOCATIONS: LocationIntent[] = [
  // --- Nigeria (city-level first so "lagos" wins over the country entry) ---
  { label: 'Lagos, Nigeria', country: 'NG', tokens: ['lagos', 'ikeja', 'lekki', 'yaba', 'victoria island'], isRegion: false },
  { label: 'Abuja, Nigeria', country: 'NG', tokens: ['abuja', 'fct', 'federal capital'], isRegion: false },
  { label: 'Port Harcourt, Nigeria', country: 'NG', tokens: ['port harcourt', 'rivers state'], isRegion: false },
  { label: 'Ibadan, Nigeria', country: 'NG', tokens: ['ibadan', 'oyo'], isRegion: false },
  { label: 'Kano, Nigeria', country: 'NG', tokens: ['kano'], isRegion: false },
  { label: 'Nigeria', country: 'NG', tokens: ['nigeria', 'nigerian', 'naija'], isRegion: false },

  // --- Rest of Africa ---
  { label: 'Nairobi, Kenya', country: 'KE', tokens: ['nairobi'], isRegion: false },
  { label: 'Kenya', country: 'KE', tokens: ['kenya', 'kenyan', 'mombasa', 'kisumu'], isRegion: false },
  { label: 'Accra, Ghana', country: 'GH', tokens: ['accra'], isRegion: false },
  { label: 'Ghana', country: 'GH', tokens: ['ghana', 'ghanaian', 'kumasi'], isRegion: false },
  { label: 'South Africa', country: 'ZA', tokens: ['south africa', 'johannesburg', 'cape town', 'durban', 'pretoria', 'sandton'], isRegion: false },
  { label: 'Egypt', country: 'EG', tokens: ['egypt', 'cairo', 'alexandria', 'giza'], isRegion: false },
  { label: 'Rwanda', country: 'RW', tokens: ['rwanda', 'kigali'], isRegion: false },
  { label: 'Uganda', country: 'UG', tokens: ['uganda', 'kampala'], isRegion: false },
  { label: 'Tanzania', country: 'TZ', tokens: ['tanzania', 'dar es salaam'], isRegion: false },
  { label: 'Ethiopia', country: 'ET', tokens: ['ethiopia', 'addis ababa'], isRegion: false },
  { label: 'Senegal', country: 'SN', tokens: ['senegal', 'dakar'], isRegion: false },
  { label: "Côte d'Ivoire", country: 'CI', tokens: ['ivory coast', "côte d'ivoire", 'cote d\'ivoire', 'abidjan'], isRegion: false },
  { label: 'Zambia', country: 'ZM', tokens: ['zambia', 'lusaka'], isRegion: false },
  { label: 'Morocco', country: 'MA', tokens: ['morocco', 'casablanca', 'rabat'], isRegion: false },
  { label: 'Africa', country: 'AFRICA', tokens: ['africa', 'african', 'emea', 'sub-saharan', 'west africa', 'east africa'], isRegion: true },

  // --- Elsewhere ---
  { label: 'United Kingdom', country: 'UK', tokens: ['united kingdom', 'uk', 'london', 'britain', 'england', 'manchester'], isRegion: false },
  { label: 'United States', country: 'US', tokens: ['united states', 'usa', 'u.s.', 'america', 'new york', 'san francisco', 'seattle', 'austin', 'boston'], isRegion: false },
  { label: 'Canada', country: 'CA', tokens: ['canada', 'toronto', 'vancouver', 'montreal'], isRegion: false },
  { label: 'Germany', country: 'DE', tokens: ['germany', 'berlin', 'munich', 'hamburg', 'deutschland'], isRegion: false },
  { label: 'Europe', country: 'EU', tokens: ['europe', 'european', 'eu', 'emea'], isRegion: true },
  { label: 'India', country: 'IN', tokens: ['india', 'bangalore', 'bengaluru', 'mumbai', 'delhi'], isRegion: false },
  { label: 'United Arab Emirates', country: 'AE', tokens: ['uae', 'dubai', 'abu dhabi'], isRegion: false },
];

/** Countries treated as "in Africa" when the user asks for the continent. */
export const AFRICAN_COUNTRIES = new Set([
  'NG', 'KE', 'GH', 'ZA', 'EG', 'RW', 'UG', 'TZ', 'ET', 'SN', 'CI', 'ZM', 'MA', 'AFRICA',
]);

function hasWord(haystack: string, needle: string): boolean {
  if (needle.includes(' ')) return haystack.includes(needle);
  // Escape regex metacharacters — skills like "c++" and "c#" are in the vocabulary.
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(haystack);
}

export function parseQuery(raw: string): ParsedQuery {
  const text = (raw || '').toLowerCase().trim();

  // --- remote / onsite ---
  let isRemote: boolean | undefined;
  if (/\b(remote|wfh|work from home|anywhere|distributed)\b/.test(text)) isRemote = true;
  else if (/\b(on[- ]?site|onsite|in[- ]?office|hybrid|in person)\b/.test(text)) isRemote = false;

  // --- seniority ---
  let seniority: Seniority | undefined;
  if (/\b(intern|internship|graduate|entry|junior|jr|trainee|nysc|fresher|no experience)\b/.test(text)) seniority = 'Entry';
  else if (/\b(head of|director|vp|vice president|chief|c-level|cto|ceo|cfo)\b/.test(text)) seniority = 'Executive';
  else if (/\b(lead|principal|staff|manager)\b/.test(text)) seniority = 'Lead';
  else if (/\b(senior|sr\.?|experienced)\b/.test(text)) seniority = 'Senior';
  else if (/\b(mid|intermediate)\b/.test(text)) seniority = 'Mid';

  // --- salary: "$120k", "120k", "5m naira", "2.5m naira", "500000 naira", "N500,000", "£80k", "€90k", "500k kes", "80k zar", "500,000 kes" ---
  let minSalary: number | undefined;
  const kmMatch = text.match(/(?:[$₦£€]|usd|ngn|gbp|eur|kes|ghs|zar|cad|aud|naira|dollars?|pounds?|euros?|shillings?|cedis?|rands?|n)?\s*(\d[\d,.]*)\s*(k|m)\b/i);
  if (kmMatch) {
    const n = parseFloat(kmMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(n)) {
      minSalary = kmMatch[2].toLowerCase() === 'm' ? n * 1_000_000 : n * 1_000;
    }
  } else {
    const fullMatch =
      text.match(/(?:[$₦£€]|usd|ngn|gbp|eur|kes|ghs|zar|cad|aud|n)\s*(\d[\d,]{4,})/i) ||
      text.match(/(\d[\d,]{4,})\s*(?:usd|ngn|gbp|eur|kes|ghs|zar|cad|aud|naira|dollars?|pounds?|euros?|shillings?|cedis?|rands?)/i);
    if (fullMatch) {
      const n = parseFloat(fullMatch[1].replace(/,/g, ''));
      if (!Number.isNaN(n)) minSalary = n;
    }
  }

  // --- location: longest token wins, so "south africa" beats "africa" ---
  let location: LocationIntent | null = null;
  let bestTokenLength = 0;
  for (const loc of LOCATIONS) {
    for (const token of loc.tokens) {
      if (hasWord(text, token) && token.length > bestTokenLength) {
        location = loc;
        bestTokenLength = token.length;
      }
    }
  }

  // --- skills ---
  const skills: string[] = [];
  for (const [key, display] of Object.entries(SKILLS)) {
    if (hasWord(text, key) && !skills.includes(display)) skills.push(display);
  }

  // --- meaningful terms ---
  // Everything already captured as location, remote or salary is removed so it
  // cannot double-count during scoring.
  const locationTokens = new Set(location ? location.tokens.flatMap((t) => t.split(' ')) : []);
  const terms: string[] = [];
  for (const word of text.split(/[^a-z0-9+#./-]+/)) {
    const w = word.replace(/^[-.]+|[-.]+$/g, '');
    if (w.length < 2) continue;
    if (STOPWORDS.has(w)) continue;
    if (locationTokens.has(w)) continue;
    if (/^\d+(\.\d+)?[km]?$/.test(w)) continue;
    if (/^(remote|wfh|onsite|hybrid)$/.test(w)) continue;
    if (!terms.includes(w)) terms.push(w);
  }

  // --- occupation family ---
  let family: string | null = null;
  const familyVotes: Record<string, number> = {};
  for (const t of terms) {
    const f = FAMILY_OF[t];
    if (f) familyVotes[f] = (familyVotes[f] || 0) + 1;
  }
  const ranked = Object.entries(familyVotes).sort((a, b) => b[1] - a[1]);
  if (ranked.length) family = ranked[0][0];
  // A skill on its own implies engineering even without a role word ("react jobs").
  if (!family && skills.length) family = 'engineering';

  const isBrowse = terms.length === 0 && skills.length === 0 && !location;

  return { raw, terms, skills, family, location, isRemote, seniority, minSalary, isBrowse };
}

/**
 * The string handed to upstream search APIs. Providers do far better with two
 * or three keywords than with a full sentence, so we send only the strongest.
 */
export function toSearchTerm(q: ParsedQuery): string {
  const roleWords = q.terms.filter((t) => FAMILY_OF[t]);
  const skillWords = q.skills.map((s) => s.toLowerCase());
  const rest = q.terms.filter((t) => !FAMILY_OF[t] && !skillWords.includes(t));
  const picked = [...skillWords.slice(0, 2), ...roleWords.slice(0, 2), ...rest.slice(0, 1)];
  return (picked.length ? picked : q.terms).slice(0, 4).join(' ').trim();
}

/** Family a posting belongs to, inferred from its title. */
export function familyOfTitle(title: string): string | null {
  const words = (title || '').toLowerCase().split(/[^a-z0-9+#]+/);
  const votes: Record<string, number> = {};
  for (const w of words) {
    const f = FAMILY_OF[w];
    if (f) votes[f] = (votes[f] || 0) + 1;
  }
  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  return ranked.length ? ranked[0][0] : null;
}

/** Africa-inclusive region words. "EMEA" covers Africa; "Europe" does not. */
const AFRICA_WORDS = /(^|[^a-z])(africa|african|emea|sub-saharan|middle east and africa)([^a-z]|$)/;

/** True when a posting's location text satisfies the user's location intent. */
export function locationMatches(jobLocation: string, intent: LocationIntent): boolean {
  const loc = (jobLocation || '').toLowerCase();
  if (!loc) return false;
  if (intent.tokens.some((t) => hasWord(loc, t))) return true;
  // Continent asks match any listed country in that continent.
  if (intent.isRegion && intent.country === 'AFRICA') {
    for (const entry of LOCATIONS) {
      if (entry.country && AFRICAN_COUNTRIES.has(entry.country) && entry.tokens.some((t) => hasWord(loc, t))) {
        return true;
      }
    }
  }
  // "Worldwide" / "anywhere" postings are open to everyone, so they qualify.
  return /(^|[^a-z])(worldwide|anywhere|global|any location|all locations)([^a-z]|$)/.test(loc);
}

/**
 * Whether a REMOTE posting is actually open to someone in `intent`.
 *
 * This is the difference between a useful result and noise. "Remote — Europe,
 * USA, UK, Canada" is remote, but a candidate in Lagos cannot take it, so
 * treating every remote role as location-agnostic is what made searches for
 * "frontend developer in Lagos" fill up with US-only listings. A posting is
 * admitted only if it names the user's geography, names nothing at all, or is
 * explicitly open worldwide.
 */
export function locationAllowsRemote(jobLocation: string, intent: LocationIntent): boolean {
  const loc = (jobLocation || '').toLowerCase();
  if (!loc) return true;
  if (locationMatches(loc, intent)) return true;
  // EMEA / Africa-wide postings admit any African location.
  if (intent.country && AFRICAN_COUNTRIES.has(intent.country) && AFRICA_WORDS.test(loc)) return true;

  // Does the posting name some OTHER geography? Then it is restricted to it.
  // Entries in the same country are compatible: a "Remote, Nigeria" role is
  // open to a candidate searching Lagos.
  for (const entry of LOCATIONS) {
    if (entry.country && intent.country && entry.country === intent.country) continue;
    if (intent.isRegion && intent.country === 'AFRICA' && entry.country && AFRICAN_COUNTRIES.has(entry.country)) continue;
    if (entry.tokens.some((t) => hasWord(loc, t))) return false;
  }
  // Nothing recognisable named — e.g. plain "Remote". Give it the benefit of the doubt.
  return true;
}

export { FAMILY_OF, SKILLS, LOCATIONS };
