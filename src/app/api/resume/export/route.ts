import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';
import {
  parseResumeDocument,
  renderExecutiveResumeHtml,
  type ParsedResumeDocument,
  type ContactChip,
  type ProjectEntry,
} from '@/lib/resume-template';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Layout Dimensions & Executive Theme Palette
// ---------------------------------------------------------------------------

const A4 = { width: 595.28, height: 841.89 };
const MARGIN_LEFT = 39.685; // ~14mm
const MARGIN_RIGHT = 39.685; // ~14mm
const MARGIN_TOP = 34.016; // ~12mm
const MARGIN_BOTTOM = 34.016; // ~12mm
const CONTENT_WIDTH = A4.width - MARGIN_LEFT - MARGIN_RIGHT; // ~515.91pt

const BODY_SIZE = 9.5;
const LINE_GAP = 3.5;

// Executive Design Token Colors
const COLOR_TEXT_PRIMARY = rgb(0.067, 0.094, 0.153); // #111827
const COLOR_PRIMARY_BLUE = rgb(0.145, 0.388, 0.922); // #2563EB
const COLOR_TEXT_MUTED = rgb(0.42, 0.45, 0.5); // #6B7280
const COLOR_TEXT_BODY = rgb(0.216, 0.255, 0.318); // #374151
const COLOR_DIVIDER_HAIRLINE = rgb(0.898, 0.906, 0.922); // #E5E7EB
const COLOR_HEADER_ACCENT = rgb(0.067, 0.094, 0.153); // #111827
const COLOR_BULLET_CIRCLE = rgb(0.2, 0.25, 0.35);

type LineKind =
  | 'name'
  | 'title'
  | 'contact'
  | 'heading'
  | 'role_header'
  | 'location'
  | 'category_skill'
  | 'bullet'
  | 'body';

function classifyLine(line: string, index: number): LineKind {
  const t = line.trim();
  if (!t) return 'body';

  if (index === 0) return 'name';
  if (index === 1 && !t.includes('@') && !t.includes('•') && !t.includes('·') && !t.includes('|')) return 'title';
  if (index <= 3 && (t.includes('@') || t.includes('+') || t.includes('linkedin') || t.includes('•') || t.includes('·'))) {
    return 'contact';
  }

  const letters = t.replace(/[^A-Za-z]/g, '');
  const isUpper = letters.length > 2 && letters === letters.toUpperCase();
  if (isUpper && t.split(/\s+/).length <= 6 && !t.includes('—') && !t.startsWith('•') && !t.startsWith('-')) {
    return 'heading';
  }

  if (t.startsWith('•') || t.startsWith('-') || t.startsWith('*')) return 'bullet';

  if (
    (/\s[-–—|]\s/.test(t) || /,\s+[A-Z]/.test(t)) &&
    (/\b(19|20)\d{2}\b/.test(t) || /\b(present|current|now)\b/i.test(t))
  ) {
    return 'role_header';
  }

  if (/^[A-Za-z\s.'-]+,\s*(?:Nigeria|Remote|Worldwide|USA?|UK|Canada|Germany|Ghana|Kenya|\([^)]+\))/i.test(t) && t.length < 65) {
    return 'location';
  }

  if (/^[A-Za-z0-9\s/&+-]+:\s*.+/.test(t)) {
    return 'category_skill';
  }

  return 'body';
}

/**
 * Sanitizes characters for pdf-lib WinAnsi standard font encoding.
 * Converts currency symbols (₦ -> NGN), arrows, clean dashes, and strips unencodable characters.
 */
function sanitizeForPdf(s: string): string {
  if (!s) return '';
  return s
    .replace(/₦/g, 'NGN')
    .replace(/[\u20B5\u20A6]/g, 'GHS ')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/[–—]/g, '—')
    .replace(/[•▪◦·]/g, '•')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\xFF\u2013\u2014\u2022]/g, '');
}

/**
 * Robust word & character-level wrapping against exact glyph widths.
 * Automatically slices tokens/URLs that exceed maxWidth so text never overflows margins.
 */
function wrapText(
  text: string,
  size: number,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number }
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const wordWidth = font.widthOfTextAtSize(word, size);
    if (wordWidth > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      let remaining = word;
      while (remaining.length > 0) {
        let len = remaining.length;
        while (len > 0 && font.widthOfTextAtSize(remaining.slice(0, len), size) > maxWidth) {
          len--;
        }
        if (len === 0) len = 1;
        const chunk = remaining.slice(0, len);
        remaining = remaining.slice(len);
        if (remaining.length > 0) {
          lines.push(chunk);
        } else {
          currentLine = chunk;
        }
      }
      continue;
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ---------------------------------------------------------------------------
// High-Fidelity PDF Generation
// ---------------------------------------------------------------------------

async function buildPdf(text: string, parsedDoc?: ParsedResumeDocument): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page: PDFPage = doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN_TOP;

  const newPage = () => {
    page = doc.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN_TOP;
  };

  const resume = parsedDoc || parseResumeDocument(text);
  const hasStructuredSections =
    resume.skills.length > 0 ||
    resume.experience.length > 0 ||
    resume.education.length > 0 ||
    Boolean(resume.summary) ||
    Boolean(resume.projects && resume.projects.length > 0);

  // Helper: Section Heading with hairline underline & orphan protection
  const drawSectionHeading = (title: string) => {
    if (y - 50 < MARGIN_BOTTOM) {
      newPage();
    }
    y -= 10;
    if (y - 10 < MARGIN_BOTTOM) {
      newPage();
    }

    const cleanTitle = sanitizeForPdf(title).toUpperCase();
    page.drawText(cleanTitle, {
      x: MARGIN_LEFT,
      y: y - 10,
      size: 10,
      font: bold,
      color: COLOR_TEXT_PRIMARY,
    });

    page.drawLine({
      start: { x: MARGIN_LEFT, y: y - 13 },
      end: { x: A4.width - MARGIN_RIGHT, y: y - 13 },
      thickness: 0.75,
      color: COLOR_DIVIDER_HAIRLINE,
    });

    y -= 20;
  };

  // Helper: Two-column experience/role header with collision check
  const drawTwoColumnHeader = (leftTitle: string, rightMeta: string) => {
    const cleanLeft = sanitizeForPdf(leftTitle);
    const cleanMeta = sanitizeForPdf(rightMeta);

    const meta = cleanMeta.trim();
    const metaWidth = meta ? regular.widthOfTextAtSize(meta, 9.5) : 0;
    const availableFirstLineWidth = meta ? CONTENT_WIDTH - metaWidth - 14 : CONTENT_WIDTH;

    const title = cleanLeft.trim();
    const titleWidth = bold.widthOfTextAtSize(title, 10);

    // Orphan check: ensure room for header
    if (y - 45 < MARGIN_BOTTOM) {
      newPage();
    }

    if (meta && titleWidth > availableFirstLineWidth) {
      // Collision detected! Wrap left title so it never collides or overlaps right meta
      const words = title.split(/\s+/).filter(Boolean);
      let topTitle = '';
      const remainingWords: string[] = [];

      for (const word of words) {
        if (remainingWords.length === 0) {
          const cand = topTitle ? `${topTitle} ${word}` : word;
          if (bold.widthOfTextAtSize(cand, 10) <= availableFirstLineWidth) {
            topTitle = cand;
          } else {
            remainingWords.push(word);
          }
        } else {
          remainingWords.push(word);
        }
      }

      // Draw top line: role part on left, dates right-aligned
      page.drawText(topTitle, {
        x: MARGIN_LEFT,
        y: y - 10,
        size: 10,
        font: bold,
        color: COLOR_TEXT_PRIMARY,
      });
      page.drawText(meta, {
        x: A4.width - MARGIN_RIGHT - metaWidth,
        y: y - 10,
        size: 9.5,
        font: regular,
        color: COLOR_TEXT_MUTED,
      });

      // Draw remaining words across full width on subsequent lines
      if (remainingWords.length > 0) {
        const restRows = wrapText(remainingWords.join(' '), 10, CONTENT_WIDTH, bold);
        for (const row of restRows) {
          y -= 10 + 2;
          if (y - 10 < MARGIN_BOTTOM) newPage();
          page.drawText(row, {
            x: MARGIN_LEFT,
            y: y - 10,
            size: 10,
            font: bold,
            color: COLOR_TEXT_PRIMARY,
          });
        }
      }
      y -= 10 + 4;
    } else {
      // No collision: single line
      page.drawText(title, {
        x: MARGIN_LEFT,
        y: y - 10,
        size: 10,
        font: bold,
        color: COLOR_TEXT_PRIMARY,
      });
      if (meta) {
        page.drawText(meta, {
          x: A4.width - MARGIN_RIGHT - metaWidth,
          y: y - 10,
          size: 9.5,
          font: regular,
          color: COLOR_TEXT_MUTED,
        });
      }
      y -= 10 + 4;
    }
  };

  // Helper: Skill category with hanging indent alignment
  const drawSkillCategory = (category: string, items: string) => {
    const cleanCategory = sanitizeForPdf(category.replace(/:$/, '').trim());
    const prefix = cleanCategory ? `${cleanCategory}: ` : '';
    const cleanItems = sanitizeForPdf(items.trim());

    if (y - 20 < MARGIN_BOTTOM) {
      newPage();
    }

    const prefixWidth = prefix ? bold.widthOfTextAtSize(prefix, 9.5) : 0;
    if (prefixWidth > 0 && prefixWidth < CONTENT_WIDTH * 0.4) {
      const itemsWidth = CONTENT_WIDTH - prefixWidth;
      const rows = wrapText(cleanItems, 9.5, itemsWidth, regular);

      // Draw prefix
      page.drawText(prefix, {
        x: MARGIN_LEFT,
        y: y - 9.5,
        size: 9.5,
        font: bold,
        color: COLOR_TEXT_PRIMARY,
      });

      if (rows.length > 0) {
        // Row 0
        page.drawText(rows[0], {
          x: MARGIN_LEFT + prefixWidth,
          y: y - 9.5,
          size: 9.5,
          font: regular,
          color: COLOR_TEXT_BODY,
        });

        // Rows 1+ with proper hanging indent
        for (let r = 1; r < rows.length; r++) {
          y -= 9.5 + LINE_GAP;
          if (y - 9.5 < MARGIN_BOTTOM) newPage();
          page.drawText(rows[r], {
            x: MARGIN_LEFT + prefixWidth,
            y: y - 9.5,
            size: 9.5,
            font: regular,
            color: COLOR_TEXT_BODY,
          });
        }
      }
      y -= 9.5 + 4;
    } else {
      if (prefix) {
        page.drawText(prefix, {
          x: MARGIN_LEFT,
          y: y - 9.5,
          size: 9.5,
          font: bold,
          color: COLOR_TEXT_PRIMARY,
        });
        y -= 9.5 + 2;
      }
      const rows = wrapText(cleanItems, 9.5, CONTENT_WIDTH - 14, regular);
      for (const row of rows) {
        if (y - 9.5 < MARGIN_BOTTOM) newPage();
        page.drawText(row, {
          x: MARGIN_LEFT + 14,
          y: y - 9.5,
          size: 9.5,
          font: regular,
          color: COLOR_TEXT_BODY,
        });
        y -= 9.5 + LINE_GAP;
      }
      y -= 4;
    }
  };

  // Helper: Bullet point with orphan dot protection
  const drawBullet = (bulletText: string) => {
    const rawClean = bulletText.replace(/^[•▪◦·*\-–—]\s*/, '').trim();
    const clean = sanitizeForPdf(rawClean);
    if (!clean) return;

    const rows = wrapText(clean, BODY_SIZE, CONTENT_WIDTH - 14, regular);
    if (!rows.length) return;

    // Orphan protection: never draw circle if line requires a new page
    if (y - BODY_SIZE < MARGIN_BOTTOM) {
      newPage();
    }

    page.drawCircle({
      x: MARGIN_LEFT + 4,
      y: y - BODY_SIZE + 3.2,
      size: 1.5,
      color: COLOR_BULLET_CIRCLE,
    });

    page.drawText(rows[0], {
      x: MARGIN_LEFT + 14,
      y: y - BODY_SIZE,
      size: BODY_SIZE,
      font: regular,
      color: COLOR_TEXT_BODY,
    });
    y -= BODY_SIZE + LINE_GAP;

    for (let r = 1; r < rows.length; r++) {
      if (y - BODY_SIZE < MARGIN_BOTTOM) {
        newPage();
      }
      page.drawText(rows[r], {
        x: MARGIN_LEFT + 14,
        y: y - BODY_SIZE,
        size: BODY_SIZE,
        font: regular,
        color: COLOR_TEXT_BODY,
      });
      y -= BODY_SIZE + LINE_GAP;
    }
    y -= 2;
  };

  // Helper: Header solid divider
  const drawHeaderDivider = () => {
    y -= 4;
    if (y > MARGIN_BOTTOM) {
      page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: A4.width - MARGIN_RIGHT, y },
        thickness: 1.8,
        color: COLOR_HEADER_ACCENT,
      });
    }
    y -= 10;
  };

  if (hasStructuredSections) {
    // 1. Candidate Name (23pt bold uppercase)
    const nameText = sanitizeForPdf(resume.name || 'CANDIDATE NAME').toUpperCase();
    const nameRows = wrapText(nameText, 23, CONTENT_WIDTH, bold);
    for (const row of nameRows) {
      if (y - 23 < MARGIN_BOTTOM) newPage();
      page.drawText(row, {
        x: MARGIN_LEFT,
        y: y - 23,
        size: 23,
        font: bold,
        color: COLOR_TEXT_PRIMARY,
      });
      y -= 23 + 3;
    }
    y -= 1;

    // 2. Target Subtitle (13.5pt primary blue)
    if (resume.targetSubtitle) {
      const subText = sanitizeForPdf(resume.targetSubtitle);
      const subRows = wrapText(subText, 13.5, CONTENT_WIDTH, bold);
      for (const row of subRows) {
        if (y - 13.5 < MARGIN_BOTTOM) newPage();
        page.drawText(row, {
          x: MARGIN_LEFT,
          y: y - 13.5,
          size: 13.5,
          font: bold,
          color: COLOR_PRIMARY_BLUE,
        });
        y -= 13.5 + 3;
      }
      y -= 2;
    }

    // 3. Contact Chips
    if (resume.contact && resume.contact.length > 0) {
      const contactStr = sanitizeForPdf(resume.contact.map((c: ContactChip) => c.text).join('   •   '));
      const contactRows = wrapText(contactStr, 9, CONTENT_WIDTH, regular);
      for (const row of contactRows) {
        if (y - 9 < MARGIN_BOTTOM) newPage();
        page.drawText(row, {
          x: MARGIN_LEFT,
          y: y - 9,
          size: 9,
          font: regular,
          color: rgb(0.294, 0.333, 0.388),
        });
        y -= 9 + 3;
      }
    }

    // 4. Header Solid 2pt Accent Divider
    drawHeaderDivider();

    // 5. Professional Summary
    if (resume.summary) {
      drawSectionHeading('PROFESSIONAL SUMMARY');
      const summaryText = sanitizeForPdf(resume.summary);
      const summaryRows = wrapText(summaryText, BODY_SIZE, CONTENT_WIDTH, regular);
      for (const row of summaryRows) {
        if (y - BODY_SIZE < MARGIN_BOTTOM) newPage();
        page.drawText(row, {
          x: MARGIN_LEFT,
          y: y - BODY_SIZE,
          size: BODY_SIZE,
          font: regular,
          color: COLOR_TEXT_BODY,
        });
        y -= BODY_SIZE + LINE_GAP;
      }
      y -= 4;
    }

    // 6. Skills Grid with Hanging Indent
    if (resume.skills && resume.skills.length > 0) {
      drawSectionHeading('CORE COMPETENCIES & TECHNICAL SKILLS');
      for (const cat of resume.skills) {
        drawSkillCategory(cat.category, cat.items);
      }
    }

    // 7. Work Experience
    if (resume.experience && resume.experience.length > 0) {
      drawSectionHeading('PROFESSIONAL EXPERIENCE');
      for (const exp of resume.experience) {
        const roleClean = exp.role.replace(/[\s—–-]+$/, '').trim();
        const title = exp.company ? `${roleClean} — ${exp.company.trim()}` : roleClean;
        const metaParts = [exp.dates, exp.location].filter(Boolean);
        const meta = metaParts.join(' | ');

        drawTwoColumnHeader(title, meta);

        for (const bullet of exp.bullets) {
          drawBullet(bullet);
        }
        y -= 4;
      }
    }

    // 8. Featured Projects (optional)
    if (resume.projects && resume.projects.length > 0) {
      drawSectionHeading('FEATURED PROJECTS');
      for (const proj of resume.projects) {
        if (y - 25 < MARGIN_BOTTOM) newPage();
        page.drawCircle({
          x: MARGIN_LEFT + 4,
          y: y - BODY_SIZE + 3.2,
          size: 1.5,
          color: COLOR_BULLET_CIRCLE,
        });
        const prefix = sanitizeForPdf(proj.name + (proj.link ? ` (${proj.link})` : '') + ': ');
        const prefixWidth = bold.widthOfTextAtSize(prefix, BODY_SIZE);
        const desc = sanitizeForPdf(proj.description);

        if (prefixWidth < CONTENT_WIDTH * 0.45) {
          const rows = wrapText(desc, BODY_SIZE, CONTENT_WIDTH - 14 - prefixWidth, regular);
          page.drawText(prefix, {
            x: MARGIN_LEFT + 14,
            y: y - BODY_SIZE,
            size: BODY_SIZE,
            font: bold,
            color: COLOR_TEXT_PRIMARY,
          });
          if (rows.length > 0) {
            page.drawText(rows[0], {
              x: MARGIN_LEFT + 14 + prefixWidth,
              y: y - BODY_SIZE,
              size: BODY_SIZE,
              font: regular,
              color: COLOR_TEXT_BODY,
            });
            for (let r = 1; r < rows.length; r++) {
              y -= BODY_SIZE + LINE_GAP;
              if (y - BODY_SIZE < MARGIN_BOTTOM) newPage();
              page.drawText(rows[r], {
                x: MARGIN_LEFT + 14 + prefixWidth,
                y: y - BODY_SIZE,
                size: BODY_SIZE,
                font: regular,
                color: COLOR_TEXT_BODY,
              });
            }
          }
          y -= BODY_SIZE + LINE_GAP + 2;
        } else {
          page.drawText(prefix, {
            x: MARGIN_LEFT + 14,
            y: y - BODY_SIZE,
            size: BODY_SIZE,
            font: bold,
            color: COLOR_TEXT_PRIMARY,
          });
          y -= BODY_SIZE + 2;
          const rows = wrapText(desc, BODY_SIZE, CONTENT_WIDTH - 14, regular);
          for (const row of rows) {
            if (y - BODY_SIZE < MARGIN_BOTTOM) newPage();
            page.drawText(row, {
              x: MARGIN_LEFT + 14,
              y: y - BODY_SIZE,
              size: BODY_SIZE,
              font: regular,
              color: COLOR_TEXT_BODY,
            });
            y -= BODY_SIZE + LINE_GAP;
          }
          y -= 2;
        }
      }
    }

    // 9. Education & Certifications
    if (resume.education && resume.education.length > 0) {
      drawSectionHeading('EDUCATION & CERTIFICATIONS');
      for (const edu of resume.education) {
        const degreeClean = edu.degree.replace(/[\s,–—-]+$/, '').trim();
        const degreeText = edu.institution ? `${degreeClean} — ${edu.institution.trim()}` : degreeClean;
        drawTwoColumnHeader(degreeText, edu.year || '');
      }
    }
  } else {
    // Unstructured text fallback mode
    const rawLines = text.split('\n');
    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i].trim();
      if (!raw) {
        y -= 4;
        continue;
      }

      const kind = classifyLine(raw, i);
      const line = sanitizeForPdf(raw);

      if (kind === 'name') {
        const rows = wrapText(line.toUpperCase(), 23, CONTENT_WIDTH, bold);
        for (const row of rows) {
          if (y - 23 < MARGIN_BOTTOM) newPage();
          page.drawText(row, { x: MARGIN_LEFT, y: y - 23, size: 23, font: bold, color: COLOR_TEXT_PRIMARY });
          y -= 23 + 3;
        }
        continue;
      }

      if (kind === 'title') {
        const rows = wrapText(line, 13.5, CONTENT_WIDTH, bold);
        for (const row of rows) {
          if (y - 13.5 < MARGIN_BOTTOM) newPage();
          page.drawText(row, { x: MARGIN_LEFT, y: y - 13.5, size: 13.5, font: bold, color: COLOR_PRIMARY_BLUE });
          y -= 13.5 + 3;
        }
        continue;
      }

      if (kind === 'contact') {
        const rows = wrapText(line, 9, CONTENT_WIDTH, regular);
        for (const row of rows) {
          if (y - 9 < MARGIN_BOTTOM) newPage();
          page.drawText(row, { x: MARGIN_LEFT, y: y - 9, size: 9, font: regular, color: rgb(0.294, 0.333, 0.388) });
          y -= 9 + 3;
        }
        drawHeaderDivider();
        continue;
      }

      if (kind === 'heading') {
        drawSectionHeading(line);
        continue;
      }

      if (kind === 'role_header') {
        const dateMatch =
          line.match(/\s{2,}(\d{4}\s*[-–—]\s*(?:Present|\d{4})|\d{4})$/i) ||
          line.match(/\s+[-–—]\s*(\b(?:19|20)\d{2}\b.*)$/i);
        if (dateMatch && typeof dateMatch.index === 'number') {
          const leftText = line.slice(0, dateMatch.index).trim();
          const dateText = dateMatch[1].trim();
          drawTwoColumnHeader(leftText, dateText);
        } else {
          drawTwoColumnHeader(line, '');
        }
        continue;
      }

      if (kind === 'location') {
        const rows = wrapText(line, 8.5, CONTENT_WIDTH, italic);
        for (const row of rows) {
          if (y - 8.5 < MARGIN_BOTTOM) newPage();
          page.drawText(row, { x: MARGIN_LEFT, y: y - 8.5, size: 8.5, font: italic, color: COLOR_TEXT_MUTED });
          y -= 8.5 + 2;
        }
        continue;
      }

      if (kind === 'category_skill') {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          drawSkillCategory(line.slice(0, colonIdx), line.slice(colonIdx + 1));
        } else {
          const rows = wrapText(line, BODY_SIZE, CONTENT_WIDTH, regular);
          for (const row of rows) {
            if (y - BODY_SIZE < MARGIN_BOTTOM) newPage();
            page.drawText(row, { x: MARGIN_LEFT, y: y - BODY_SIZE, size: BODY_SIZE, font: regular, color: COLOR_TEXT_BODY });
            y -= BODY_SIZE + LINE_GAP;
          }
        }
        continue;
      }

      if (kind === 'bullet') {
        drawBullet(line);
        continue;
      }

      // Generic body text
      const rows = wrapText(line, BODY_SIZE, CONTENT_WIDTH, regular);
      for (const row of rows) {
        if (y - BODY_SIZE < MARGIN_BOTTOM) newPage();
        page.drawText(row, { x: MARGIN_LEFT, y: y - BODY_SIZE, size: BODY_SIZE, font: regular, color: COLOR_TEXT_BODY });
        y -= BODY_SIZE + LINE_GAP;
      }
    }
  }

  return doc.save();
}

// ---------------------------------------------------------------------------
// Structured DOCX Generation
// ---------------------------------------------------------------------------

function createDocxHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 21,
        color: '0F172A',
        font: 'Inter',
      }),
    ],
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: 'E5E7EB',
        space: 3,
      },
    },
    spacing: { before: 200, after: 80 },
  });
}

function createDocxJobHeader(leftText: string, rightText: string): Paragraph {
  if (rightText) {
    return new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 10400 }],
      children: [
        new TextRun({
          text: leftText,
          bold: true,
          size: 20,
          color: '0F172A',
          font: 'Inter',
        }),
        new TextRun('\t'),
        new TextRun({
          text: rightText,
          size: 19,
          color: '64748B',
          font: 'Inter',
        }),
      ],
      spacing: { before: 120, after: 30 },
    });
  }
  return new Paragraph({
    children: [
      new TextRun({
        text: leftText,
        bold: true,
        size: 20,
        color: '0F172A',
        font: 'Inter',
      }),
    ],
    spacing: { before: 120, after: 30 },
  });
}

function createDocxCategorySkill(category: string, items: string): Paragraph {
  const cleanCat = category.replace(/:$/, '').trim();
  return new Paragraph({
    children: [
      new TextRun({
        text: `${cleanCat}: `,
        bold: true,
        size: 19,
        color: '0F172A',
        font: 'Inter',
      }),
      new TextRun({
        text: items.trim(),
        size: 19,
        color: '334155',
        font: 'Inter',
      }),
    ],
    spacing: { after: 50 },
  });
}

function createDocxBullet(bulletText: string): Paragraph {
  const clean = bulletText.replace(/^[•▪◦·*\-–—]\s*/, '').trim();

  // Highlight bold markdown or lead-in
  const boldMatch = clean.match(/^(\*\*[^*]+\*\*|<strong>[\s\S]*?<\/strong>)([\s\S]*)$/);
  if (boldMatch) {
    const boldPart = boldMatch[1].replace(/\*\*|<strong>|<\/strong>/g, '');
    return new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({ text: boldPart, bold: true, size: 19, color: '1E293B', font: 'Inter' }),
        new TextRun({ text: boldMatch[2], size: 19, color: '1E293B', font: 'Inter' }),
      ],
      spacing: { after: 30 },
    });
  }

  const leadMatch = clean.match(
    /^((?:Built\s+and\s+scaled|Conducted\s+extensive|Spearheaded|Architected|Directed|Led|Formulated|Engineered|Orchestrated|Transformed|Built|Scaled|Pioneered|Accelerated|Automated|Designed|Developed|Optimized|Implemented|Delivered|Established|Managed|Coordinated|Championed)\b)(.*)$/i
  );
  if (leadMatch) {
    return new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({ text: leadMatch[1], bold: true, size: 19, color: '1E293B', font: 'Inter' }),
        new TextRun({ text: leadMatch[2], size: 19, color: '1E293B', font: 'Inter' }),
      ],
      spacing: { after: 30 },
    });
  }

  return new Paragraph({
    bullet: { level: 0 },
    children: [new TextRun({ text: clean, size: 19, color: '1E293B', font: 'Inter' })],
    spacing: { after: 30 },
  });
}

async function buildDocx(text: string, parsedDoc?: ParsedResumeDocument): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];
  const resume = parsedDoc || parseResumeDocument(text);
  const hasStructuredSections =
    resume.skills.length > 0 ||
    resume.experience.length > 0 ||
    resume.education.length > 0 ||
    Boolean(resume.summary) ||
    Boolean(resume.projects && resume.projects.length > 0);

  if (hasStructuredSections) {
    // 1. Candidate Name
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: (resume.name || 'CANDIDATE NAME').toUpperCase(),
            bold: true,
            size: 36,
            color: '0F172A',
            font: 'Inter',
          }),
        ],
        spacing: { after: resume.targetSubtitle ? 30 : 60 },
      })
    );

    // 2. Target Subtitle
    if (resume.targetSubtitle) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resume.targetSubtitle,
              size: 23,
              color: '2563EB',
              bold: true,
              font: 'Inter',
            }),
          ],
          spacing: { after: 50 },
        })
      );
    }

    // 3. Contact Info
    if (resume.contact && resume.contact.length > 0) {
      const contactStr = resume.contact.map((c: ContactChip) => c.text).join('   •   ');
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactStr,
              size: 18,
              color: '475569',
              font: 'Inter',
            }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '0F172A', space: 5 } },
          spacing: { after: 180 },
        })
      );
    }

    // 4. Summary
    if (resume.summary) {
      paragraphs.push(createDocxHeading('PROFESSIONAL SUMMARY'));
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resume.summary,
              size: 19,
              color: '334155',
              font: 'Inter',
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    // 5. Skills Grid
    if (resume.skills && resume.skills.length > 0) {
      paragraphs.push(createDocxHeading('CORE COMPETENCIES & TECHNICAL SKILLS'));
      for (const skill of resume.skills) {
        paragraphs.push(createDocxCategorySkill(skill.category, skill.items));
      }
    }

    // 6. Experience
    if (resume.experience && resume.experience.length > 0) {
      paragraphs.push(createDocxHeading('PROFESSIONAL EXPERIENCE'));
      for (const exp of resume.experience) {
        const roleClean = exp.role.replace(/[\s—–-]+$/, '').trim();
        const leftTitle = exp.company ? `${roleClean} — ${exp.company.trim()}` : roleClean;
        const rightMeta = [exp.dates, exp.location].filter(Boolean).join(' | ');

        paragraphs.push(createDocxJobHeader(leftTitle, rightMeta));

        for (const b of exp.bullets) {
          paragraphs.push(createDocxBullet(b));
        }
      }
    }

    // 7. Projects
    if (resume.projects && resume.projects.length > 0) {
      paragraphs.push(createDocxHeading('FEATURED PROJECTS'));
      for (const p of resume.projects) {
        const linkPart = p.link ? ` (${p.link})` : '';
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: `${p.name}${linkPart}: `, bold: true, size: 19, color: '0F172A', font: 'Inter' }),
              new TextRun({ text: p.description, size: 19, color: '334155', font: 'Inter' }),
            ],
            spacing: { after: 30 },
          })
        );
      }
    }

    // 8. Education
    if (resume.education && resume.education.length > 0) {
      paragraphs.push(createDocxHeading('EDUCATION & CERTIFICATIONS'));
      for (const edu of resume.education) {
        const degreeClean = edu.degree.replace(/[\s,–—-]+$/, '').trim();
        const degreeText = edu.institution ? `${degreeClean} — ${edu.institution.trim()}` : degreeClean;
        paragraphs.push(createDocxJobHeader(degreeText, edu.year || ''));
      }
    }
  } else {
    // Unstructured text fallback mode
    const rawLines = text.split('\n');
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;
      const kind = classifyLine(line, i);

      if (kind === 'name') {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: line.toUpperCase(), bold: true, size: 36, color: '0F172A', font: 'Inter' })],
            spacing: { after: 40 },
          })
        );
        continue;
      }

      if (kind === 'title') {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 23, color: '2563EB', bold: true, font: 'Inter' })],
            spacing: { after: 40 },
          })
        );
        continue;
      }

      if (kind === 'contact') {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 18, color: '475569', font: 'Inter' })],
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '0F172A', space: 4 } },
            spacing: { after: 180 },
          })
        );
        continue;
      }

      if (kind === 'heading') {
        paragraphs.push(createDocxHeading(line));
        continue;
      }

      if (kind === 'role_header') {
        const dateMatch =
          line.match(/\s{2,}(\d{4}\s*[-–—]\s*(?:Present|\d{4})|\d{4})$/i) ||
          line.match(/\s+[-–—]\s*(\b(?:19|20)\d{2}\b.*)$/i);
        if (dateMatch && typeof dateMatch.index === 'number') {
          const leftText = line.slice(0, dateMatch.index).trim();
          const dateText = dateMatch[1].trim();
          paragraphs.push(createDocxJobHeader(leftText, dateText));
        } else {
          paragraphs.push(createDocxJobHeader(line, ''));
        }
        continue;
      }

      if (kind === 'location') {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, italics: true, size: 18, color: '64748B', font: 'Inter' })],
            spacing: { after: 60 },
          })
        );
        continue;
      }

      if (kind === 'category_skill') {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          paragraphs.push(createDocxCategorySkill(line.slice(0, colonIdx), line.slice(colonIdx + 1)));
        } else {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 19, color: '334155', font: 'Inter' })],
              spacing: { after: 50 },
            })
          );
        }
        continue;
      }

      if (kind === 'bullet') {
        paragraphs.push(createDocxBullet(line));
        continue;
      }

      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 19, color: '334155', font: 'Inter' })],
          spacing: { after: 50 },
        })
      );
    }
  }

  const docxDocument = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 680,
              bottom: 680,
              left: 794,
              right: 794,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(docxDocument);
}

// ---------------------------------------------------------------------------
// HTML Generation
// ---------------------------------------------------------------------------

function buildHtml(text: string, parsedDoc?: ParsedResumeDocument): string {
  return renderExecutiveResumeHtml(parsedDoc || text);
}

// ---------------------------------------------------------------------------
// Filename Stem
// ---------------------------------------------------------------------------

function fileStem(nameOrText: string): string {
  const first = nameOrText.split('\n').find((l) => l.trim())?.trim() ?? 'cv';
  const slug = first
    .replace(/\[[^\]]*\]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${slug}-cv` : 'upgraded-cv';
}

// ---------------------------------------------------------------------------
// HTTP POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { text, format } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Nothing to export.' }, { status: 400 });
    }
    if (format !== 'pdf' && format !== 'docx' && format !== 'html') {
      return NextResponse.json({ success: false, error: 'Unsupported format.' }, { status: 400 });
    }

    const doc = parseResumeDocument(text);
    const stem = fileStem(doc.name || text);

    if (format === 'html') {
      const htmlContent = buildHtml(text, doc);
      const body = Buffer.from(htmlContent, 'utf-8');
      return new NextResponse(new Uint8Array(body), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${stem}.html"`,
          'Content-Length': String(body.length),
          'Cache-Control': 'no-store',
        },
      });
    }

    const body = format === 'pdf' ? await buildPdf(text, doc) : await buildDocx(text, doc);
    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${stem}.${format}"`,
        'Content-Length': String(body.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CV export error:', message);
    return NextResponse.json({ success: false, error: 'Could not generate that file.' }, { status: 500 });
  }
}
