/**
 * Executive Resume Template & Structured Parser Engine
 *
 * Implements the executive resume design standard from job-application-agent:
 * - Clean Inter typography with modern system fallbacks
 * - Authoritative uppercase bold header with 2px solid dark accent border
 * - Distinctive primary blue (#2563eb) target subtitle
 * - Bulleted contact bar with interactive links and clean icons
 * - Subtle 1px #e5e7eb hairline section dividers with uppercase tracked titles
 * - Justified executive summary narrative
 * - Single-column structured skills grid with bold category prefixes
 * - Two-column experience headers (role/company left, dates/location right)
 * - Quantified achievement bullets with bold lead-ins and metric highlights
 * - Structured / compact education credentials
 * - Print-calibrated @page dimensions (letter, 12mm/14mm margins)
 */

export interface ContactChip {
  text: string;
  href?: string;
  icon?: string;
}

export interface SkillCategory {
  category: string;
  items: string;
}

export interface ExperienceEntry {
  role: string;
  company: string;
  dates: string;
  location?: string;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year?: string;
  details?: string;
}

export interface ProjectEntry {
  name: string;
  link?: string;
  description: string;
}

export interface ParsedResumeDocument {
  name: string;
  targetSubtitle?: string;
  contact: ContactChip[];
  summary?: string;
  skills: SkillCategory[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects?: ProjectEntry[];
}

export interface ExecutiveResumeOptions {
  title?: string;
  includeContainerOnly?: boolean;
}

// ---------------------------------------------------------------------------
// HTML Sanitization & Entity Escaping
// ---------------------------------------------------------------------------

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes URLs to prevent javascript: or malicious protocol injection.
 */
function sanitizeHref(url: string): string {
  const trimmed = url.trim();
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  if (/^\+?[\d\s()+-]{7,}$/.test(trimmed)) {
    return `tel:${trimmed.replace(/[^\d+]/g, '')}`;
  }
  return `https://${trimmed.replace(/^\/\//, '')}`;
}

// ---------------------------------------------------------------------------
// Metric and Lead-In Bolding Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an executive achievement bullet point:
 * - Converts markdown **bold** into <strong>bold</strong>
 * - Highlights prominent quantified metrics (e.g. 40%, 35+, 10x, $2.5M, etc.)
 * - Bolds strong action verb lead-ins if present and not already formatted
 * - Ensures safe HTML output with zero XSS risk
 */
export function formatExecutiveBullet(bullet: string): string {
  let text = (bullet || '').trim();
  if (!text) return '';

  // Remove leading bullet point symbol if present (preserve markdown **bold**)
  text = text.replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').trim();

  let formatted = '';

  // If text contains existing **bold** markdown, parse markdown tokens safely
  if (/\*\*[^*]+\*\*/.test(text)) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    formatted = parts
      .map((part) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          return `<strong>${escapeHtml(inner)}</strong>`;
        }
        return highlightMetrics(escapeHtml(part));
      })
      .join('');
  } else if (/<strong>.*?<\/strong>/i.test(text)) {
    // If text already has <strong> tags, sanitize inner content and escape the rest
    const parts = text.split(/(<strong>.*?<\/strong>)/gi);
    formatted = parts
      .map((part) => {
        const innerMatch = part.match(/^<strong>([\s\S]*?)<\/strong>$/i);
        if (innerMatch) {
          return `<strong>${escapeHtml(innerMatch[1])}</strong>`;
        }
        return highlightMetrics(escapeHtml(part));
      })
      .join('');
  } else {
    // Otherwise, escape and highlight metrics
    const escaped = escapeHtml(text);
    formatted = highlightMetrics(escaped);
  }

  // Apply action verb lead-in bolding
  return highlightActionVerbLeadIn(formatted);
}

/**
 * Highlights quantified metrics in escaped HTML text:
 * - Percentages (e.g. 40%, 35.5%)
 * - Currency amounts (e.g. $2.5M, $150K, ₦50M, €1.2M)
 * - Multipliers (e.g. 10x, 3x)
 * - Turnaround reductions (e.g. reducing feature turnaround time by 35%)
 * - Measurable counts (e.g. 36+ shipped, 60+ reusable components)
 * - Ahead of schedule phrases (e.g. 2 weeks ahead of schedule)
 */
function highlightMetrics(escapedText: string): string {
  // Protect existing <strong> blocks so we never double-wrap
  const placeholderMap: string[] = [];
  let masked = escapedText.replace(/<strong>.*?<\/strong>/gi, (match) => {
    placeholderMap.push(match);
    return `___STRONG_TAG_${placeholderMap.length - 1}___`;
  });

  const protect = (inner: string) => {
    placeholderMap.push(`<strong>${inner}</strong>`);
    return `___STRONG_TAG_${placeholderMap.length - 1}___`;
  };

  // 1. Turnaround / reductions: "reducing feature turnaround time by 35%"
  masked = masked.replace(
    /\b(reducing\s+[^.<]*?\s+by\s+\d+(?:\.\d+)?%)(?!\w)/gi,
    (_, m1) => protect(m1)
  );

  // 2. Percentages: 40%, 99.9%
  masked = masked.replace(
    /\b(\d+(?:\.\d+)?%)(?!\w)/g,
    (_, m1) => protect(m1)
  );

  // 3. Currencies: $100K, $2.5M, €500K, £10M, ₦25M, NGN 20M, USD 5M
  masked = masked.replace(
    /(?:^|(?<=\s|[([{"']))((?:[\$€£₦]|NGN\s*|USD\s*)\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|b|million|billion))?)(?!\w)/gi,
    (_, m1) => protect(m1)
  );

  // 4. Multipliers: 10x, 2.5x, 2x
  masked = masked.replace(
    /\b(\d+(?:\.\d+)?x)(?!\w)/gi,
    (_, m1) => protect(m1)
  );

  // 5. Ahead of schedule: "2 weeks ahead of schedule"
  masked = masked.replace(
    /\b(\d+\s*(?:weeks?|months?|days?)\s+ahead\s+of\s+schedule)\b/gi,
    (_, m1) => protect(m1)
  );

  // 6. Quantified counts with plus: 36+ shipped projects, 60+ reusable components
  masked = masked.replace(
    /\b(\d{2,}\+?\s*(?:shipped\s+multinational\s+projects|shipped\s+projects|reusable\s+components|multinational\s+projects|components|projects|features|clients|workflows))\b/gi,
    (_, m1) => protect(m1)
  );

  // Restore all protected strong tags (safe lookup preventing "undefined" injection)
  return masked.replace(/___STRONG_TAG_(\d+)___/g, (match, idx) => {
    const i = Number(idx);
    return i in placeholderMap ? placeholderMap[i] : match;
  });
}

/**
 * Bolds prominent lead-in active verbs at the start of a bullet.
 */
function highlightActionVerbLeadIn(text: string): string {
  if (text.startsWith('<strong>')) return text;

  // Match active verb opener e.g. Spearheaded, Built and scaled, Architected, etc.
  const leadInPattern =
    /^((?:Built\s+and\s+scaled|Conducted\s+extensive|Spearheaded|Architected|Directed|Led|Formulated|Engineered|Orchestrated|Transformed|Built|Scaled|Pioneered|Accelerated|Automated|Designed|Developed|Optimized|Implemented|Delivered|Established|Managed|Coordinated|Championed)\b)/i;

  const match = text.match(leadInPattern);
  if (match && match[1]) {
    const verb = match[1];
    return `<strong>${verb}</strong>${text.slice(verb.length)}`;
  }
  return text;
}

/**
 * Formats the executive summary paragraph:
 * Supports markdown bold **text** or existing <strong> tags with safe HTML escaping.
 */
export function formatExecutiveSummary(summary: string): string {
  let text = (summary || '').trim();
  if (!text) return '';

  if (/\*\*[^*]+\*\*/.test(text)) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts
      .map((part) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
        }
        return escapeHtml(part);
      })
      .join('');
  }

  if (/<strong>.*?<\/strong>/i.test(text)) {
    const parts = text.split(/(<strong>.*?<\/strong>)/gi);
    return parts
      .map((part) => {
        const innerMatch = part.match(/^<strong>([\s\S]*?)<\/strong>$/i);
        if (innerMatch) {
          return `<strong>${escapeHtml(innerMatch[1])}</strong>`;
        }
        return escapeHtml(part);
      })
      .join('');
  }

  return escapeHtml(text);
}

// ---------------------------------------------------------------------------
// Section Header Recognition & Canonical Aliases
// ---------------------------------------------------------------------------

type SectionBucket = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'unknown';

interface MatchedSection {
  bucket: SectionBucket;
  title: string;
}

function matchSectionHeading(line: string): MatchedSection | null {
  const clean = line
    .trim()
    .replace(/^#+\s*/, '') // Markdown headings ###
    .replace(/^[*_~`]+|[*_~`]+$/g, '')
    .replace(/[:•\-–—_]+$/, '')
    .replace(/^[:•\-–—_]+\s*/, '')
    .trim();

  if (!clean || clean.length > 65) return null;
  const wordCount = clean.split(/\s+/).length;
  if (wordCount > 7) return null;

  // A section heading must not be an inline key-value pair (e.g. "Category: item1, item2")
  // Section headings may end with a colon ("SKILLS:"), but not have substantive content after it.
  if (/^[^:]+:\s+\S+/.test(clean)) return null;

  // 1. Summary
  if (
    /^(?:professional\s+|executive\s+|career\s+)?(?:summary|profile|overview|objective|statement)(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^(?:professional\s+|career\s+)?background(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^about\s+me(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^summary\s+of\s+qualifications(?:\s*[:–—-]|\s*$)/i.test(clean)
  ) {
    return { bucket: 'summary', title: 'Professional Summary' };
  }

  // 2. Skills
  if (
    /\b(?:skills|competencies|expertise|proficiencies|technologies|tools|tech\s*stack)\b/i.test(clean) &&
    !/[.!?]$/.test(clean) &&
    !/\b(?:responsible|managed|assisted|worked|developed|led|history|education)\b/i.test(clean) &&
    (
      /^(?:core|technical|key|functional|professional|clinical|culinary|teaching|educational|administrative|operational|retail|store|logistics|supply\s+chain|specialized|primary|relevant)\b/i.test(clean) ||
      /^(?:skills|competencies|expertise|proficiencies|technologies|tools|tech\s*stack|areas\s+of\s+expertise)/i.test(clean) ||
      clean.toUpperCase() === clean
    )
  ) {
    return { bucket: 'skills', title: 'Core Competencies & Skills' };
  }
  if (
    /^(?:areas\s+of\s+expertise|technical\s+proficiencies|tools\s*(&|and)\s*technologies|technical\s+tools|core\s+strengths)(?:\s*[:–—-]|\s*$)/i.test(clean)
  ) {
    return { bucket: 'skills', title: 'Core Competencies & Skills' };
  }

  // 3. Experience
  if (
    /^(?:professional\s+|work\s+|career\s+|relevant\s+)?(?:experience|employment|work\s+history|career\s+history|employment\s+history)(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^(?:professional\s+|work\s+)background(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^career\s+highlights(?:\s*[:–—-]|\s*$)/i.test(clean)
  ) {
    return { bucket: 'experience', title: 'Professional Experience' };
  }

  // 4. Projects
  if (
    /^(?:key\s+|selected\s+|notable\s+|technical\s+|recent\s+|personal\s+|featured\s+)?projects(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^project\s+experience(?:\s*[:–—-]|\s*$)/i.test(clean)
  ) {
    return { bucket: 'projects', title: 'Featured Projects' };
  }

  // 5. Education
  if (
    /^(?:education|academic|qualifications|academic\s+background|academic\s+qualifications)(?:\s*(?:&|and)\s*(?:certifications|credentials|licenses|training))?(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^(?:certifications\s*(?:&|and)\s*licenses|certifications|education\s*(?:&|and)\s*training)(?:\s*[:–—-]|\s*$)/i.test(clean) ||
    /^degrees\s*(?:&|and)\s*certifications(?:\s*[:–—-]|\s*$)/i.test(clean)
  ) {
    return { bucket: 'education', title: 'Education & Certifications' };
  }

  // 6. Generic uppercase header (e.g. ALL CAPS <= 7 words)
  const lettersOnly = clean.replace(/[^A-Za-z]/g, '');
  if (lettersOnly.length >= 4 && lettersOnly === lettersOnly.toUpperCase() && wordCount <= 7) {
    if (/\b(?:SKILL|COMPETENC|TOOL|TECH)\b/i.test(clean)) {
      return { bucket: 'skills', title: 'Core Competencies & Skills' };
    }
    return { bucket: 'unknown', title: clean };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Contact Item Parsing
// ---------------------------------------------------------------------------

function parseContactChips(lines: string[]): ContactChip[] {
  const chips: ContactChip[] = [];
  const seenTexts = new Set<string>();

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#') || /^[-*_~]{3,}$/.test(trimmedLine)) {
      continue;
    }

    // Split by common delimiters: bullet (•, ·, |), multiple spaces
    const tokens = trimmedLine
      .split(/\s+[•▪◦·|]\s+|\s{3,}/)
      .map((t) => t.trim())
      .filter(Boolean);

    for (let token of tokens) {
      // Ignore markdown headers or horizontal lines
      if (token.startsWith('#') || /^[-*_~]{3,}$/.test(token)) continue;

      // Clean emoji prefixes if already present in text
      let cleanToken = token.replace(/^[📍📞📧🌐🔗💻]\s*/, '').trim();
      if (!cleanToken) continue;

      // Check if token contains markdown link: [text](url) optionally preceded by **Label:**
      // e.g. "**Portfolio:** [bamdalas.com](https://bamdalas.com)"
      // or "[hello@bamdalas.com](mailto:hello@bamdalas.com)"
      const mdLinkMatch = cleanToken.match(/^(?:\*\*([^*]+):\*\*\s*)?\[([^\]]+)\]\(([^)]+)\)$/);
      if (mdLinkMatch) {
        const label = (mdLinkMatch[1] || '').toLowerCase();
        const display = mdLinkMatch[2].replace(/[*_~`]/g, '').trim();
        const rawHref = mdLinkMatch[3].trim();
        const safeUrl = sanitizeHref(rawHref);

        let icon: string | undefined = '🌐';
        if (label.includes('email') || safeUrl.startsWith('mailto:')) {
          icon = '📧';
        } else if (label.includes('phone') || label.includes('tel') || safeUrl.startsWith('tel:')) {
          icon = '📞';
        } else if (label.includes('linkedin') || /linkedin\.com/i.test(safeUrl)) {
          icon = '🔗';
        } else if (label.includes('github') || /github\.com/i.test(safeUrl)) {
          icon = '💻';
        }

        if (!seenTexts.has(display.toLowerCase())) {
          chips.push({
            text: display,
            href: safeUrl,
            icon,
          });
          seenTexts.add(display.toLowerCase());
        }
        continue;
      }

      // Check if token is "**Label:** value" e.g. "**Phone:** +234 907 561 6876"
      const labelValueMatch = cleanToken.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
      if (labelValueMatch) {
        cleanToken = labelValueMatch[2].trim();
      }

      // Strip any lingering markdown bold/decorations
      cleanToken = cleanToken.replace(/^[*_~`]+|[*_~`]+$/g, '').trim();
      if (!cleanToken || seenTexts.has(cleanToken.toLowerCase())) continue;

      // 1. Email
      const emailMatch = cleanToken.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) {
        chips.push({
          text: emailMatch[0],
          href: `mailto:${emailMatch[0]}`,
          icon: '📧',
        });
        seenTexts.add(cleanToken.toLowerCase());
        continue;
      }

      // 2. Phone
      const phoneMatch = cleanToken.match(/^\+?[\d\s().-]{7,}$/);
      if (phoneMatch && /\d{3,}/.test(cleanToken)) {
        chips.push({
          text: cleanToken,
          href: `tel:${cleanToken.replace(/[^\d+]/g, '')}`,
          icon: '📞',
        });
        seenTexts.add(cleanToken.toLowerCase());
        continue;
      }

      // 3. LinkedIn
      if (/linkedin\.com/i.test(cleanToken)) {
        const url = cleanToken.startsWith('http') ? cleanToken : `https://${cleanToken}`;
        const display = cleanToken.replace(/^https?:\/\/(?:www\.)?/i, '');
        chips.push({
          text: display,
          href: url,
          icon: '🔗',
        });
        seenTexts.add(cleanToken.toLowerCase());
        continue;
      }

      // 4. GitHub
      if (/github\.com/i.test(cleanToken)) {
        const url = cleanToken.startsWith('http') ? cleanToken : `https://${cleanToken}`;
        const display = cleanToken.replace(/^https?:\/\/(?:www\.)?/i, '');
        chips.push({
          text: display,
          href: url,
          icon: '💻',
        });
        seenTexts.add(cleanToken.toLowerCase());
        continue;
      }

      // 5. Website / Portfolio
      if (
        /^https?:\/\//i.test(cleanToken) ||
        /[a-zA-Z0-9-]+\.(?:com|io|org|dev|net|me|co|app)\b/i.test(cleanToken)
      ) {
        const url = cleanToken.startsWith('http') ? cleanToken : `https://${cleanToken}`;
        const display = cleanToken.replace(/^https?:\/\/(?:www\.)?/i, '');
        chips.push({
          text: display,
          href: url,
          icon: '🌐',
        });
        seenTexts.add(cleanToken.toLowerCase());
        continue;
      }

      // 6. Location / Residence
      if (
        /(?:Nigeria|Remote|Worldwide|USA?|UK|Canada|Germany|France|Netherlands|Kenya|Ghana|Australia|[A-Z]{2}\b|\bCity\b|\bState\b)/i.test(
          cleanToken
        ) ||
        cleanToken.includes(',')
      ) {
        chips.push({
          text: cleanToken,
          icon: '📍',
        });
        seenTexts.add(cleanToken.toLowerCase());
        continue;
      }

      // 7. General fallback contact chip
      chips.push({
        text: cleanToken,
      });
      seenTexts.add(cleanToken.toLowerCase());
    }
  }

  return chips;
}

// ---------------------------------------------------------------------------
// Experience & Role Header Parsing
// ---------------------------------------------------------------------------

const DATE_REGEX =
  /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\b(?:1[789]|20)\d{2}\b\s*(?:[-–—~]|\s+to\s+)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\b(?:1[789]|20)\d{2}\b|Present|Current|Now)/i;

const STANDALONE_YEAR_REGEX = /\b(?:1[789]|20)\d{2}\b/;

function isLocationLine(line: string): boolean {
  const trimmed = line.replace(/[*_~`]/g, '').trim();
  if (!trimmed || trimmed.length > 80) return false;
  // Must NOT be a bullet
  if (/^[•▪◦·\-–—]\s*/.test(trimmed) || /^\*(?!\*)\s*/.test(trimmed)) return false;
  // Must NOT be a sentence with a period at the end
  if (trimmed.endsWith('.')) return false;
  // Must NOT start with common action verbs
  if (
    /^(?:Led|Built|Spearheaded|Architected|Directed|Developed|Managed|Designed|Engineered|Created|Optimized|Formulated|Delivered|Maintained|Facilitated|Partnered|Collaborated|Implemented)\b/i.test(
      trimmed
    )
  ) {
    return false;
  }
  // Must NOT contain dates
  if (DATE_REGEX.test(trimmed) || STANDALONE_YEAR_REGEX.test(trimmed)) {
    return false;
  }
  // Must match location indicators
  const hasLocationKeyword =
    /(?:Nigeria|Canada|Germany|France|Netherlands|Kenya|Ghana|South\s+Africa|Australia|United\s+Kingdom|United\s+States|UK|USA?|Remote|Worldwide|Hybrid|On-site)/i.test(
      trimmed
    );
  const hasCityState = /^[A-Za-z\s.'-]+,\s*(?:[A-Z]{2}\b|[A-Za-z\s.'-]+)/.test(trimmed);
  const hasRemoteParen = /\(Remote\b/i.test(trimmed);
  return hasLocationKeyword || hasCityState || hasRemoteParen;
}

function isRoleHeaderCandidate(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('•') || trimmed.startsWith('-') || /^\*(?!\*)/.test(trimmed)) {
    return false;
  }
  if (trimmed.length > 130) return false;
  const hasDate = DATE_REGEX.test(trimmed) || STANDALONE_YEAR_REGEX.test(trimmed);
  const hasSeparator = /\s[-–—|]\s/.test(trimmed) || /\s{3,}/.test(trimmed) || /,\s+[A-Z]/.test(trimmed);
  return hasDate && hasSeparator;
}

function isJobStart(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^[•▪◦·\-–—]\s*/.test(trimmed) || /^\*(?!\*)\s*/.test(trimmed)) {
    return false;
  }
  // A job header line never ends with a sentence period
  if (trimmed.endsWith('.') && !/\b(?:Inc|Ltd|Co|LLC)\.$/i.test(trimmed)) {
    return false;
  }
  // 1. Markdown h3 header (### **Role**)
  if (/^#{3,}\s+/.test(trimmed)) {
    return true;
  }
  // 2. Standard single-line header with date and separator
  if (isRoleHeaderCandidate(trimmed)) {
    return true;
  }
  // 3. Line with Role — Company / Role at Company
  if (/\s+[-–—]\s+|\s+at\s+/i.test(trimmed) && trimmed.length <= 130) {
    return true;
  }
  // 4. Line is bold role title, e.g. **Role**
  if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
    return true;
  }
  // 5. Line looks like a role title and next line has dates, company or location
  if (nextLine && trimmed.length <= 80) {
    if (trimmed.endsWith('.')) return false;
    const isRoleLike = /\b(Engineer|Developer|Designer|Architect|Lead|Manager|Director|Specialist|Consultant|Officer|Analyst|Intern|Administrator|Executive|Founder|Supervisor|Assistant|Cook|Chef|Nurse|Teacher|Representative|Associate|Head|VP)\b/i.test(trimmed);
    const nextTrimmed = nextLine.trim();
    if (
      isRoleLike &&
      (DATE_REGEX.test(nextTrimmed) || STANDALONE_YEAR_REGEX.test(nextTrimmed) || isLocationLine(nextTrimmed))
    ) {
      return true;
    }
  }
  return false;
}

function parseExperienceEntries(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let currentEntry: ExperienceEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check if line is a bullet
    const isBullet = /^[•▪◦·\-–—]\s*/.test(rawLine) || /^\*(?!\*)\s*/.test(rawLine);

    // If currentEntry is active and has NO bullets yet, check if this line is part of multi-line header
    if (currentEntry && currentEntry.bullets.length === 0 && !isBullet) {
      // Check if this line is purely dates or dates + location
      if (DATE_REGEX.test(rawLine) || STANDALONE_YEAR_REGEX.test(rawLine)) {
        if (!currentEntry.dates) {
          const dateMatch = rawLine.match(DATE_REGEX) || rawLine.match(STANDALONE_YEAR_REGEX);
          if (dateMatch && typeof dateMatch.index === 'number') {
            currentEntry.dates = dateMatch[0].trim();
            const afterDate = rawLine.slice(dateMatch.index + dateMatch[0].length).trim();
            if (/^[-–—|•·]/.test(afterDate)) {
              currentEntry.location = afterDate.replace(/^[-–—|•·]\s*/, '').replace(/[*_~`]/g, '').trim();
            }
          }
          continue;
        }
      }

      // Check if this line has company or company + location
      if (!currentEntry.company) {
        const cleanLine = rawLine.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim();
        if (cleanLine.includes(' • ') || cleanLine.includes(' · ') || cleanLine.includes(' | ')) {
          const parts = cleanLine.split(/\s+[•·|]\s+/);
          currentEntry.company = parts[0].trim();
          if (!currentEntry.location && parts.length > 1) {
            currentEntry.location = parts.slice(1).join(' | ').trim();
          }
        } else {
          currentEntry.company = cleanLine;
        }
        continue;
      }

      // Check if this line is location
      if (!currentEntry.location && isLocationLine(rawLine)) {
        currentEntry.location = rawLine.replace(/^[-–—|•·]\s*/, '').replace(/[*_~`]/g, '').trim();
        continue;
      }
    }

    // Check if this line starts a new job entry
    const nextLine = i + 1 < lines.length ? lines[i + 1] : undefined;
    if (isJobStart(rawLine, nextLine) || (!currentEntry && !isBullet)) {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }

      let role = '';
      let company = '';
      let dates = '';
      let location = '';

      let remaining = rawLine
        .replace(/^#{3,}\s*/, '') // strip markdown ###
        .replace(/^[*_~`]+|[*_~`]+$/g, '') // strip markdown bold
        .trim();

      // 1. Extract date pattern if present
      const dateMatch = remaining.match(DATE_REGEX) || remaining.match(STANDALONE_YEAR_REGEX);
      if (dateMatch && typeof dateMatch.index === 'number') {
        dates = dateMatch[0].trim();
        const beforeDate = remaining.slice(0, dateMatch.index).trim();
        const afterDate = remaining.slice(dateMatch.index + dateMatch[0].length).trim();

        if (/^[-–—|•·]/.test(afterDate)) {
          location = afterDate.replace(/^[-–—|•·]\s*/, '').trim();
        }

        remaining = beforeDate;
      }

      // 2. Extract Role and Company
      const compMatch = remaining.match(/\s+[-–—|]\s+|\s+at\s+/i);
      if (compMatch && typeof compMatch.index === 'number') {
        const part0 = remaining.slice(0, compMatch.index).replace(/[*_~`]/g, '').trim();
        const part1 = remaining.slice(compMatch.index + compMatch[0].length).replace(/[*_~`]/g, '').trim();

        // Detect if company is part0 and role is part1 (e.g. "Darlington Software Company — Software Engineer")
        const roleWords = /\b(Engineer|Developer|Designer|Architect|Lead|Manager|Director|Specialist|Consultant|Officer|Analyst|Intern|Administrator|Executive|Founder)\b/i;
        if (roleWords.test(part1) && !roleWords.test(part0)) {
          role = part1;
          company = part0;
        } else {
          role = part0;
          company = part1;
        }
      } else {
        const spaceMatch = remaining.match(/\s{3,}/);
        if (spaceMatch && typeof spaceMatch.index === 'number') {
          role = remaining.slice(0, spaceMatch.index).replace(/[*_~`]/g, '').trim();
          company = remaining.slice(spaceMatch.index + spaceMatch[0].length).replace(/[*_~`]/g, '').trim();
        } else {
          role = remaining.replace(/[*_~`]/g, '').trim();
        }
      }

      // Check next line for standalone location if not found yet
      if (!location && i + 1 < lines.length) {
        const potentialLoc = lines[i + 1].trim();
        if (isLocationLine(potentialLoc)) {
          location = potentialLoc.replace(/^[-–—|•·]\s*/, '').replace(/[*_~`]/g, '').trim();
          i++; // Consume location line
        }
      }

      currentEntry = {
        role: role || 'Professional Role',
        company: company || '',
        dates: dates || '',
        location: location || undefined,
        bullets: [],
      };
      continue;
    }

    // Bullet point or description line
    if (currentEntry) {
      const isExplicitBullet = /^[•▪◦·\-–—]\s*/.test(rawLine) || /^\*(?!\*)\s*/.test(rawLine);
      const cleanBullet = rawLine.replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').trim();
      if (cleanBullet) {
        if (isExplicitBullet || currentEntry.bullets.length === 0) {
          currentEntry.bullets.push(cleanBullet);
        } else {
          const lastIdx = currentEntry.bullets.length - 1;
          const prevBullet = currentEntry.bullets[lastIdx];
          const prevEndsSentence = /[.!?]$/.test(prevBullet);
          const startsLower = /^[a-z]/.test(cleanBullet);
          const startsConjunction = /^(?:and|or|with|for|to|of|in|by|across|on|at|including|such\s+as)\b/i.test(cleanBullet);

          // Continuation if previous line didn't end with a period, or this line starts with lowercase/conjunction
          const isContinuation = !prevEndsSentence || startsLower || startsConjunction;

          if (isContinuation) {
            currentEntry.bullets[lastIdx] = `${prevBullet} ${cleanBullet}`.replace(/\s+/g, ' ').trim();
          } else {
            currentEntry.bullets.push(cleanBullet);
          }
        }
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Skills Parsing
// ---------------------------------------------------------------------------

function parseSkillsGrid(lines: string[]): SkillCategory[] {
  const categories: SkillCategory[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Pattern 1: Category: items, items... (all on one line)
    const colonMatch = rawLine.match(/^(?:[•▪◦·\-–—]\s*|\*(?!\*)\s*)?([^:]+):\s+(.+)$/);
    if (colonMatch) {
      const category = colonMatch[1].replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').replace(/[*_~`]/g, '').trim();
      const items = colonMatch[2].replace(/[*_~`]/g, '').trim();
      categories.push({ category, items });
      continue;
    }

    // Pattern 2: Category: (on its own line, items on next line)
    const categoryOnlyMatch = rawLine.match(/^(?:[•▪◦·\-–—]\s*|\*(?!\*)\s*)?([^:]+):\s*$/);
    if (categoryOnlyMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && !nextLine.endsWith(':')) {
        const category = categoryOnlyMatch[1].replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').replace(/[*_~`]/g, '').trim();
        const items = nextLine.replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').replace(/[*_~`]/g, '').trim();
        categories.push({ category, items });
        i++; // Consume next line
        continue;
      }
    }

    // Non-colon line: continuation of skills
    const clean = rawLine.replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').replace(/^,\s*/, '').trim();
    if (clean) {
      if (categories.length > 0) {
        const prevItems = categories[categories.length - 1].items.replace(/,\s*$/, '').trim();
        categories[categories.length - 1].items = prevItems ? `${prevItems}, ${clean}` : clean;
      } else {
        categories.push({ category: 'Core Competencies', items: clean });
      }
    }
  }

  for (const cat of categories) {
    cat.items = cat.items
      .replace(/,\s*,+/g, ',')
      .replace(/Google,\s*Workspace/gi, 'Google Workspace')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return categories;
}

// ---------------------------------------------------------------------------
// Education Parsing
// ---------------------------------------------------------------------------

function parseEducationEntries(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // If this line is just a standalone year, attach to previous entry if missing year
    if (
      entries.length > 0 &&
      !entries[entries.length - 1].year &&
      /^\(?(?:19|20)\d{2}(?:\s*[-–—]\s*(?:(?:19|20)\d{2}|Present))?\)?$/.test(line)
    ) {
      entries[entries.length - 1].year = line.replace(/[()]/g, '').trim();
      continue;
    }

    // If line has multiple credentials separated by bullet ' • '
    if (line.includes(' • ') || line.includes(' · ')) {
      const subEntries = line.split(/\s+[•·]\s+/).map((s) => s.trim()).filter(Boolean);
      for (const sub of subEntries) {
        entries.push(parseSingleEducationLine(sub));
      }
      continue;
    }

    entries.push(parseSingleEducationLine(line));
  }

  return entries;
}

function parseSingleEducationLine(line: string): EducationEntry {
  const clean = line.replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').trim();

  // Extract year e.g. (2023) or 2022 – 2024 or 2024
  let year: string | undefined;
  let remaining = clean;

  const parenYear = remaining.match(/\(((?:19|20)\d{2}(?:\s*[-–—]\s*(?:(?:19|20)\d{2}|Present))?)\)/);
  if (parenYear && typeof parenYear.index === 'number') {
    year = parenYear[1].trim();
    remaining = (remaining.slice(0, parenYear.index) + ' ' + remaining.slice(parenYear.index + parenYear[0].length)).trim();
  } else {
    const trailingYear = remaining.match(/\b((?:19|20)\d{2}(?:\s*[-–—]\s*(?:(?:19|20)\d{2}|Present))?)\s*$/);
    if (trailingYear && typeof trailingYear.index === 'number') {
      year = trailingYear[1].trim();
      remaining = remaining.slice(0, trailingYear.index).trim();
    }
  }

  // Extract details if present in parentheses e.g. (6 Specializations) or (Civil Engineering)
  let details: string | undefined;
  const detailsMatch = remaining.match(/\(([^)]+)\)/);
  if (detailsMatch && typeof detailsMatch.index === 'number') {
    details = detailsMatch[1].trim();
    remaining = (remaining.slice(0, detailsMatch.index) + ' ' + remaining.slice(detailsMatch.index + detailsMatch[0].length)).trim();
  }

  // Split degree and institution by — , – , - , | , or at
  let degree = remaining;
  let institution = '';

  const sepMatch = remaining.match(/\s+[-–—|]\s+|\s+at\s+/i);
  if (sepMatch && typeof sepMatch.index === 'number') {
    degree = remaining.slice(0, sepMatch.index).trim();
    institution = remaining.slice(sepMatch.index + sepMatch[0].length).trim();
  }

  return {
    degree: degree || '',
    institution: institution || '',
    year,
    details,
  };
}

// ---------------------------------------------------------------------------
// Projects Parsing
// ---------------------------------------------------------------------------

function parseProjectEntries(lines: string[]): ProjectEntry[] {
  const entries: ProjectEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const clean = line.replace(/^[•▪◦·\-–—]\s*|^\*(?!\*)\s*/, '').trim();

    let name = '';
    let link: string | undefined;
    let description = '';

    // Look for separator colon that is NOT part of http:// or https://
    const colonMatch = clean.match(/^(.*?)(?<!https?):\s+(.*)$/i);
    if (colonMatch) {
      const headerPart = colonMatch[1].trim();
      description = colonMatch[2].trim();

      // Check for link in parentheses e.g. "Brainiark Shop (shop.brainiark.com)"
      const linkMatch = headerPart.match(/\(([^)]+)\)/);
      if (linkMatch && typeof linkMatch.index === 'number') {
        link = linkMatch[1].trim();
        name = headerPart.slice(0, linkMatch.index).trim();
      } else {
        name = headerPart;
      }
    } else {
      const dashMatch = clean.match(/^(.*?)\s+[-–—]\s+(.*)$/);
      if (dashMatch) {
        const headerPart = dashMatch[1].trim();
        description = dashMatch[2].trim();

        const linkMatch = headerPart.match(/\(([^)]+)\)/);
        if (linkMatch && typeof linkMatch.index === 'number') {
          link = linkMatch[1].trim();
          name = headerPart.slice(0, linkMatch.index).trim();
        } else {
          name = headerPart;
        }
      } else {
        name = clean;
      }
    }

    entries.push({
      name: name.replace(/^[*_~`]+|[*_~`]+$/g, '').trim(),
      link,
      description,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Core Structured Parser
// ---------------------------------------------------------------------------

/**
 * Strips HTML styles, scripts, and layout markup, converting standard HTML resumes
 * into clean semantic text lines suitable for structured parsing.
 */
function htmlToPlainText(html: string): string {
  let text = html;

  // 1. Remove doctype, head, style, script, and HTML comments
  text = text.replace(/<!DOCTYPE[^>]*>/gi, '');
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Convert links with URLs: <a href="url">text</a> -> [text](url)
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, content) => {
    const cleanContent = content.replace(/<[^>]+>/g, '').trim();
    return `[${cleanContent}](${href})`;
  });

  // 3. Convert headers into markdown headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n');

  // 4. Standalone subtitle / title-sub divs
  text = text.replace(/<div\s+[^>]*class=["'][^"']*(?:title-sub|subtitle)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // 5. Contact bar divs
  text = text.replace(/<div\s+[^>]*class=["'][^"']*contact-bar[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // 6. List items to bullet points
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1\n');

  // 7. Line breaks and paragraph tags
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '\n');

  // 8. Skills rows, job entries, job headers, job locations
  text = text.replace(/<div\s+[^>]*class=["'][^"']*(?:skills-row|skill-category|skill-row)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, (_, content) => {
    const singleLine = content.replace(/\s+/g, ' ').trim();
    return `\n${singleLine}\n`;
  });
  text = text.replace(/<div\s+[^>]*class=["'][^"']*(?:job-entry|job-item)[^"']*["'][^>]*>/gi, '\n\n');
  text = text.replace(/<div\s+[^>]*class=["'][^"']*job-header[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, (_, content) => {
    const spaced = content.replace(/<\/span>\s*<span/gi, '</span>    <span');
    return `\n${spaced}\n`;
  });
  text = text.replace(/<div\s+[^>]*class=["'][^"']*job-location[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // 9. Education entries
  text = text.replace(/<div\s+[^>]*class=["'][^"']*(?:edu-entry|edu-item)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, (_, content) => {
    const spaced = content.replace(/<\/span>\s*<span/gi, '</span>    <span');
    return `\n${spaced}\n`;
  });

  // 10. Block closing tags
  text = text.replace(/<\/section>/gi, '\n\n');
  text = text.replace(/<\/header>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');

  // 11. Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 12. Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 13. Clean up multiple newlines and spaces
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Robustly parses multi-line plain text CV documents into a typed ParsedResumeDocument.
 * Handles inputs generated by cv-review.ts, standard plaintext resumes, HTML exports, and edited texts.
 */
export function parseResumeDocument(rawText: string): ParsedResumeDocument {
  const isHtml = /<!DOCTYPE\b|<html\b|<body\b|<head\b|<div\s+class=["'][^"']*resume-container/i.test(rawText || '');
  const text = isHtml ? htmlToPlainText(rawText || '') : (rawText || '').trim();
  const rawLines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));

  const headerLines: string[] = [];
  interface RawSection {
    bucket: SectionBucket;
    title: string;
    lines: string[];
  }
  const sections: RawSection[] = [];
  let currentSection: RawSection | null = null;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = matchSectionHeading(line);
    if (heading && heading.bucket !== 'unknown') {
      currentSection = { bucket: heading.bucket, title: heading.title, lines: [] };
      sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  // 1. Candidate Name
  let name = 'CANDIDATE NAME';
  let targetSubtitle: string | undefined;

  const nonContactHeaderLines = headerLines.filter((l) => {
    return !/[\w.+-]+@[\w-]+\.[\w.]+/.test(l) && !/^\+?[\d\s().-]{8,}$/.test(l);
  });

  if (nonContactHeaderLines.length > 0) {
    const firstLine = nonContactHeaderLines[0];

    // Check if name and subtitle are on line 0 separated by | or —
    if (firstLine.includes('|') || firstLine.includes(' — ') || firstLine.includes(' – ')) {
      const parts = firstLine.split(/\s+[|—–]\s+/);
      name = parts[0]
        .replace(/^#+\s*/, '')
        .replace(/[*_~`]/g, '')
        .replace(/[^\p{L}\p{M}\s.'-]/gu, '')
        .trim()
        .toUpperCase() || 'CANDIDATE NAME';
      targetSubtitle = parts.slice(1).join(' | ').replace(/[*_~`]/g, '').trim();
    } else {
      name = firstLine
        .replace(/^#+\s*/, '')
        .replace(/[*_~`]/g, '')
        .replace(/[^\p{L}\p{M}\s.'-]/gu, '')
        .trim()
        .toUpperCase() || 'CANDIDATE NAME';
    }

    // If subtitle wasn't on line 0, check line 1
    if (!targetSubtitle && nonContactHeaderLines.length > 1) {
      const secondLine = nonContactHeaderLines[1].replace(/^[*_~`]+|[*_~`]+$/g, '').trim();
      const hasContactIndicator =
        /(?:https?:\/\/|mailto:|tel:|📍|📞|📧|🌐|🔗|💻)/i.test(secondLine) ||
        /[a-zA-Z0-9-]+\.(?:com|io|org|dev|net|me|co|app)\b/i.test(secondLine);
      const isPureLocation =
        /^\d+\s+[A-Za-z]/.test(secondLine) ||
        (/^[A-Za-z\s.'-]+,\s*[A-Za-z\s.'-]+$/.test(secondLine) &&
          !/\b(?:Engineer|Developer|Designer|Architect|Lead|Manager|Specialist|Director|Officer|Analyst|Consultant|Executive|Full-Stack|Backend|Frontend|Product)\b/i.test(secondLine));

      if (secondLine.length <= 160 && !hasContactIndicator && !isPureLocation) {
        targetSubtitle = secondLine;
      }
    }
  }

  // 2. Contact Bar: filter out lines that are purely name or subtitle or horizontal rules
  const contactLines = headerLines.filter((l) => {
    const clean = l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim();
    if (/^[-*_~]{3,}$/.test(clean)) return false;
    if (
      clean.toUpperCase() === name.toUpperCase() &&
      !clean.includes('@') &&
      !clean.includes('•') &&
      !clean.includes('|')
    ) {
      return false;
    }
    if (
      targetSubtitle &&
      clean === targetSubtitle &&
      !clean.includes('@') &&
      !clean.includes('•') &&
      !clean.includes('|')
    ) {
      return false;
    }
    return true;
  });
  const contact = parseContactChips(contactLines);

  // 3. Summary Section — with defensive sanitization to prevent leaked headings or skills
  const summarySec = sections.find((s) => s.bucket === 'summary');
  if (summarySec) {
    const cleanSummaryLines: string[] = [];
    const leakedSkillsLines: string[] = [];
    let encounteredSkillsBlock = false;

    for (const rawLine of summarySec.lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const heading = matchSectionHeading(line);
      if (heading && heading.bucket === 'skills') {
        encounteredSkillsBlock = true;
        continue;
      }
      if (heading && heading.bucket !== 'summary') {
        continue;
      }
      if (
        encounteredSkillsBlock ||
        /^[A-Za-z0-9\s/&+-]{2,45}:\s*.+/.test(line) ||
        /^(?:core\s+|technical\s+|key\s+|functional\s+)?[a-z\s/&+-]{3,35}(?:skills|competencies|proficiencies)/i.test(line)
      ) {
        leakedSkillsLines.push(line);
      } else {
        cleanSummaryLines.push(line);
      }
    }

    summarySec.lines = cleanSummaryLines;

    if (leakedSkillsLines.length > 0) {
      let sSec = sections.find((s) => s.bucket === 'skills');
      if (!sSec) {
        sSec = { bucket: 'skills', title: 'Core Competencies & Skills', lines: [] };
        sections.push(sSec);
      }
      sSec.lines.push(...leakedSkillsLines);
    }
  }
  const summary = summarySec && summarySec.lines.length > 0
    ? summarySec.lines.join(' ').replace(/\s+/g, ' ').trim()
    : undefined;

  // 4. Skills Section
  const skillsSec = sections.find((s) => s.bucket === 'skills');
  const skills = skillsSec ? parseSkillsGrid(skillsSec.lines) : [];

  // 5. Experience Section
  const expSec = sections.find((s) => s.bucket === 'experience');
  const experience = expSec ? parseExperienceEntries(expSec.lines) : [];

  // 6. Education Section
  const eduSec = sections.find((s) => s.bucket === 'education');
  const education = eduSec ? parseEducationEntries(eduSec.lines) : [];

  // 7. Projects Section
  const projSec = sections.find((s) => s.bucket === 'projects');
  const projects = projSec ? parseProjectEntries(projSec.lines) : undefined;

  return {
    name,
    targetSubtitle: targetSubtitle || undefined,
    contact,
    summary,
    skills,
    experience,
    education,
    projects: projects && projects.length > 0 ? projects : undefined,
  };
}

// ---------------------------------------------------------------------------
// Executive HTML Template Renderer
// ---------------------------------------------------------------------------

/**
 * Generates the complete standalone HTML document with embedded Executive styling
 * identical to job-application-agent/scripts/cv-tailor.mjs.
 */
export function renderExecutiveResumeHtml(
  doc: ParsedResumeDocument | string,
  options?: ExecutiveResumeOptions
): string {
  const parsed = typeof doc === 'string' ? parseResumeDocument(doc) : doc;

  const pageTitle =
    options?.title ||
    (parsed.targetSubtitle
      ? `${parsed.name} - ${parsed.targetSubtitle} Resume`
      : `${parsed.name} - Executive Resume`);

  const bodyContent = renderExecutiveResumeBody(parsed);

  if (options?.includeContainerOnly) {
    return bodyContent;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.45;
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }
    .resume-container {
      max-width: 850px;
      margin: 0 auto;
      padding: 32px 40px;
      background: #ffffff;
    }
    header {
      border-bottom: 2px solid #111827;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      margin-bottom: 3px;
      line-height: 1.2;
    }
    .title-sub {
      font-size: 14px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .contact-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #4b5563;
      align-items: center;
    }
    .contact-bar a {
      color: #111827;
      text-decoration: none;
      font-weight: 500;
    }
    .contact-bar a:hover {
      text-decoration: underline;
      color: #2563eb;
    }
    section {
      margin-bottom: 14px;
    }
    h2 {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    p {
      color: #374151;
      text-align: justify;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px;
      font-size: 12.5px;
    }
    .skill-row {
      line-height: 1.45;
      color: #374151;
    }
    .skill-row strong {
      color: #111827;
      font-weight: 600;
    }
    .job-entry {
      margin-bottom: 11px;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .job-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
    }
    .job-meta {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
      text-align: right;
      white-space: nowrap;
      margin-left: 16px;
    }
    ul {
      list-style-type: disc;
      margin-left: 18px;
      margin-top: 2px;
    }
    li {
      margin-bottom: 2px;
      color: #374151;
      font-size: 12.5px;
      line-height: 1.4;
    }
    li strong {
      color: #111827;
    }
    .edu-entry {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      font-size: 12.5px;
    }
    .edu-entry strong {
      color: #111827;
      font-weight: 600;
    }
    .edu-inline {
      font-size: 12px;
      color: #4b5563;
      line-height: 1.5;
    }
    .edu-inline strong {
      color: #111827;
      font-weight: 600;
    }
    .project-entry {
      font-size: 12.5px;
      color: #374151;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .project-entry strong {
      color: #111827;
      font-weight: 600;
    }
    .project-entry a {
      color: #2563eb;
      text-decoration: none;
    }
    .project-entry a:hover {
      text-decoration: underline;
    }
    @page {
      size: letter;
      margin: 12mm 14mm 12mm 14mm;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .resume-container {
        padding: 0;
        box-shadow: none;
        max-width: 100%;
      }
      a {
        text-decoration: none;
        color: #111827;
      }
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Renders the inner HTML container element (.resume-container) for React preview or embedded view.
 */
export function renderExecutiveResumeBody(doc: ParsedResumeDocument | string): string {
  const parsed = typeof doc === 'string' ? parseResumeDocument(doc) : doc;

  // 1. Header Contact HTML
  const contactChipsHtml: string[] = [];
  for (let i = 0; i < parsed.contact.length; i++) {
    const chip = parsed.contact[i];
    const iconPrefix = chip.icon ? `${escapeHtml(chip.icon)} ` : '';
    let itemHtml = '';
    if (chip.href) {
      const safeHref = sanitizeHref(chip.href);
      const isExternal = /^https?:\/\//i.test(safeHref);
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      itemHtml = `<span>${iconPrefix}<a href="${escapeHtml(safeHref)}"${targetAttr}>${escapeHtml(chip.text)}</a></span>`;
    } else {
      itemHtml = `<span>${iconPrefix}${escapeHtml(chip.text)}</span>`;
    }

    contactChipsHtml.push(itemHtml);
    if (i < parsed.contact.length - 1) {
      contactChipsHtml.push('<span>•</span>');
    }
  }

  // 2. Summary HTML
  let summarySectionHtml = '';
  if (parsed.summary) {
    summarySectionHtml = `    <section>
      <h2>Professional Summary</h2>
      <p>
        ${formatExecutiveSummary(parsed.summary)}
      </p>
    </section>`;
  }

  // 3. Skills HTML
  let skillsSectionHtml = '';
  if (parsed.skills && parsed.skills.length > 0) {
    const rowsHtml = parsed.skills
      .map((cat) => {
        const cleanCat = cat.category.replace(/:$/, '').trim();
        return `        <div class="skill-row"><strong>${escapeHtml(cleanCat)}:</strong> ${escapeHtml(cat.items)}</div>`;
      })
      .join('\n');

    skillsSectionHtml = `    <section>
      <h2>Core Competencies & Technical Skills</h2>
      <div class="skills-grid">
${rowsHtml}
      </div>
    </section>`;
  }

  // 4. Experience HTML
  let experienceSectionHtml = '';
  if (parsed.experience && parsed.experience.length > 0) {
    const entriesHtml = parsed.experience
      .map((entry) => {
        const titleText = entry.company
          ? `${escapeHtml(entry.role)} — ${escapeHtml(entry.company)}`
          : escapeHtml(entry.role);

        const metaParts = [entry.dates, entry.location].filter(Boolean);
        const metaText = escapeHtml(metaParts.join(' | '));

        const bulletsHtml = entry.bullets
          .map((b) => `          <li>${formatExecutiveBullet(b)}</li>`)
          .join('\n');

        return `      <div class="job-entry">
        <div class="job-header">
          <span class="job-title">${titleText}</span>
          <span class="job-meta">${metaText}</span>
        </div>
        <ul>
${bulletsHtml}
        </ul>
      </div>`;
      })
      .join('\n\n');

    experienceSectionHtml = `    <section>
      <h2>Professional Experience</h2>

${entriesHtml}
    </section>`;
  }

  // 5. Featured Projects HTML (optional)
  let projectsSectionHtml = '';
  if (parsed.projects && parsed.projects.length > 0) {
    const projectRows = parsed.projects
      .map((proj) => {
        const linkHtml = proj.link
          ? ` (<a href="${escapeHtml(sanitizeHref(proj.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              proj.link.replace(/^https?:\/\//i, '')
            )}</a>)`
          : '';
        return `      <div class="project-entry">
        <strong>• ${escapeHtml(proj.name)}</strong>${linkHtml}: ${escapeHtml(proj.description)}
      </div>`;
      })
      .join('\n');

    projectsSectionHtml = `    <section>
      <h2>Featured Projects</h2>
${projectRows}
    </section>`;
  }

  // 6. Education HTML
  let educationSectionHtml = '';
  if (parsed.education && parsed.education.length > 0) {
    const eduEntriesHtml = parsed.education
      .map((edu) => {
        const degreeWithDetails = edu.details && !edu.degree.includes(`(${edu.details})`)
          ? `${escapeHtml(edu.degree)} (${escapeHtml(edu.details)})`
          : escapeHtml(edu.degree);

        const titleAndInst = edu.institution
          ? `<span><strong>${degreeWithDetails}</strong> — ${escapeHtml(edu.institution)}</span>`
          : `<span><strong>${degreeWithDetails}</strong></span>`;

        const yearHtml = edu.year ? `<span class="job-meta">${escapeHtml(edu.year)}</span>` : '';

        return `      <div class="edu-entry">
        ${titleAndInst}
        ${yearHtml}
      </div>`;
      })
      .join('\n');

    educationSectionHtml = `    <section>
      <h2>Education & Certifications</h2>
${eduEntriesHtml}
    </section>`;
  }

  // Subtitle markup
  const subtitleHtml = parsed.targetSubtitle
    ? `\n      <div class="title-sub">${escapeHtml(parsed.targetSubtitle)}</div>`
    : '';

  const contactBarHtml =
    contactChipsHtml.length > 0
      ? `\n      <div class="contact-bar">\n        ${contactChipsHtml.join('\n        ')}\n      </div>`
      : '';

  return `  <div class="resume-container">
    <header>
      <h1>${escapeHtml(parsed.name)}</h1>${subtitleHtml}${contactBarHtml}
    </header>

${[summarySectionHtml, skillsSectionHtml, experienceSectionHtml, projectsSectionHtml, educationSectionHtml]
  .filter(Boolean)
  .join('\n\n')}
  </div>`;
}
