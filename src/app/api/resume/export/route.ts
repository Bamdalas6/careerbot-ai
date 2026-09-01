import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

export const runtime = 'nodejs';

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 46;
const BODY_SIZE = 9.5;
const LINE_GAP = 3.8;

type LineKind = 'name' | 'title' | 'contact' | 'heading' | 'role_header' | 'location' | 'category_skill' | 'bullet' | 'body';

function classifyLine(line: string, index: number): LineKind {
  const t = line.trim();
  if (index === 0) return 'name';
  if (index === 1 && !t.includes('@') && !t.includes('•')) return 'title';
  if (index <= 3 && (t.includes('@') || t.includes('+234') || t.includes('linkedin') || t.includes('•'))) return 'contact';

  const letters = t.replace(/[^A-Za-z]/g, '');
  const isUpper = letters.length > 2 && letters === letters.toUpperCase();
  if (isUpper && t.split(/\s+/).length <= 6 && !t.includes('—') && !t.startsWith('•')) {
    return 'heading';
  }

  if (t.startsWith('•') || t.startsWith('-')) return 'bullet';

  if (/\s[-–—]\s/.test(t) && (/\b(19|20)\d{2}\b/.test(t) || /\b(present|current)\b/i.test(t))) {
    return 'role_header';
  }

  if (/^[A-Za-z\s]+,\s*(?:Nigeria|Remote|Worldwide|\([^)]+\))/i.test(t) && t.length < 55) {
    return 'location';
  }

  if (/^[A-Za-z0-9\s/&+-]+:\s*.+/.test(t)) {
    return 'category_skill';
  }

  return 'body';
}

function sanitizeForPdf(s: string): string {
  return s
    .replace(/₦/g, 'NGN')
    .replace(/[–—]/g, '—')
    .replace(/[•▪◦]/g, '•')
    .replace(/→/g, '->')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\xFF\u2014\u2022]/g, '');
}

/** Greedy word wrap against real glyph widths */
function wrapText(text: string, size: number, maxWidth: number, font: { widthOfTextAtSize: (t: string, s: number) => number }): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

async function buildPdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const contentWidth = A4.width - MARGIN * 2;

  let page = doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  const newPage = () => {
    page = doc.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN;
  };

  const drawWrapped = (
    str: string,
    { size, font, color, indent = 0, gapBefore = 0 }: { size: number; font: typeof regular; color: ReturnType<typeof rgb>; indent?: number; gapBefore?: number }
  ) => {
    y -= gapBefore;
    const rows = wrapText(str, size, contentWidth - indent, font);
    for (const row of rows) {
      if (y - size < MARGIN) newPage();
      page.drawText(row, { x: MARGIN + indent, y: y - size, size, font, color });
      y -= size + LINE_GAP;
    }
  };

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
      drawWrapped(line, { size: 19, font: bold, color: rgb(0.06, 0.09, 0.16) });
      continue;
    }

    if (kind === 'title') {
      drawWrapped(line, { size: 11.5, font: regular, color: rgb(0.15, 0.39, 0.92), gapBefore: 1 });
      continue;
    }

    if (kind === 'contact') {
      drawWrapped(line, { size: 8.5, font: regular, color: rgb(0.3, 0.35, 0.42), gapBefore: 2 });
      // Solid header underline
      y -= 6;
      if (y > MARGIN) {
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: A4.width - MARGIN, y },
          thickness: 1.2,
          color: rgb(0.1, 0.12, 0.18),
        });
      }
      y -= 6;
      continue;
    }

    if (kind === 'heading') {
      if (y - 25 < MARGIN) newPage();
      drawWrapped(line, { size: 10, font: bold, color: rgb(0.06, 0.09, 0.16), gapBefore: 8 });
      // Hairline under section title
      if (y > MARGIN) {
        page.drawLine({
          start: { x: MARGIN, y: y + 2 },
          end: { x: A4.width - MARGIN, y: y + 2 },
          thickness: 0.5,
          color: rgb(0.8, 0.83, 0.88),
        });
      }
      y -= 3;
      continue;
    }

    if (kind === 'role_header') {
      if (y - 18 < MARGIN) newPage();
      // Parse Role/Company and Date
      const dateMatch = line.match(/\s{2,}(\d{4}\s*[-–—]\s*(?:Present|\d{4})|\d{4})$/i);
      if (dateMatch) {
        const leftText = line.slice(0, dateMatch.index).trim();
        const dateText = dateMatch[1].trim();

        // Draw left side bold
        page.drawText(leftText, { x: MARGIN, y: y - 10, size: 10, font: bold, color: rgb(0.06, 0.09, 0.16) });
        // Draw date right-aligned
        const dateWidth = regular.widthOfTextAtSize(dateText, 9.5);
        page.drawText(dateText, { x: A4.width - MARGIN - dateWidth, y: y - 10, size: 9.5, font: regular, color: rgb(0.3, 0.35, 0.42) });
        y -= 10 + LINE_GAP;
      } else {
        drawWrapped(line, { size: 10, font: bold, color: rgb(0.06, 0.09, 0.16), gapBefore: 4 });
      }
      continue;
    }

    if (kind === 'location') {
      drawWrapped(line, { size: 8.5, font: italic, color: rgb(0.4, 0.45, 0.52), gapBefore: 0 });
      continue;
    }

    if (kind === 'category_skill') {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const prefix = line.slice(0, colonIdx + 1);
        const rest = line.slice(colonIdx + 1).trim();

        // Prefix in bold, rest in regular
        const prefixWidth = bold.widthOfTextAtSize(prefix + ' ', BODY_SIZE);
        const rows = wrapText(rest, BODY_SIZE, contentWidth - prefixWidth, regular);

        if (y - BODY_SIZE < MARGIN) newPage();
        page.drawText(prefix, { x: MARGIN, y: y - BODY_SIZE, size: BODY_SIZE, font: bold, color: rgb(0.06, 0.09, 0.16) });

        if (rows.length > 0) {
          page.drawText(rows[0], { x: MARGIN + prefixWidth, y: y - BODY_SIZE, size: BODY_SIZE, font: regular, color: rgb(0.18, 0.22, 0.28) });
          y -= BODY_SIZE + LINE_GAP;

          for (let r = 1; r < rows.length; r++) {
            if (y - BODY_SIZE < MARGIN) newPage();
            page.drawText(rows[r], { x: MARGIN, y: y - BODY_SIZE, size: BODY_SIZE, font: regular, color: rgb(0.18, 0.22, 0.28) });
            y -= BODY_SIZE + LINE_GAP;
          }
        }
      } else {
        drawWrapped(line, { size: BODY_SIZE, font: regular, color: rgb(0.18, 0.22, 0.28) });
      }
      continue;
    }

    if (kind === 'bullet') {
      const cleanBullet = line.replace(/^[•▪◦·*\-–—]\s*/, '');
      if (y - BODY_SIZE < MARGIN) newPage();
      // Draw clean round bullet dot
      page.drawCircle({ x: MARGIN + 4, y: y - BODY_SIZE + 3, size: 1.6, color: rgb(0.15, 0.2, 0.3) });
      drawWrapped(cleanBullet, { size: BODY_SIZE, font: regular, color: rgb(0.18, 0.22, 0.28), indent: 13 });
      continue;
    }

    drawWrapped(line, { size: BODY_SIZE, font: regular, color: rgb(0.18, 0.22, 0.28) });
  }

  return doc.save();
}

async function buildDocx(text: string): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];
  const rawLines = text.split('\n');

  rawLines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const kind = classifyLine(line, i);

    if (kind === 'name') {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: line, bold: true, size: 36, color: '0F172A' })],
          spacing: { after: 40 },
        })
      );
      return;
    }

    if (kind === 'title') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 23, color: '2563EB', bold: true })],
          spacing: { after: 40 },
        })
      );
      return;
    }

    if (kind === 'contact') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 18, color: '475569' })],
          border: { bottom: { style: 'single', size: 12, color: '0F172A', space: 4 } },
          spacing: { after: 180 },
        })
      );
      return;
    }

    if (kind === 'heading') {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line, bold: true, size: 21, color: '0F172A' })],
          border: { bottom: { style: 'single', size: 4, color: 'CBD5E1', space: 2 } },
          spacing: { before: 200, after: 80 },
        })
      );
      return;
    }

    if (kind === 'role_header') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: 20, color: '0F172A' })],
          spacing: { before: 120, after: 30 },
        })
      );
      return;
    }

    if (kind === 'location') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, italics: true, size: 18, color: '64748B' })],
          spacing: { after: 60 },
        })
      );
      return;
    }

    if (kind === 'bullet') {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: line.replace(/^[•▪◦·*\-–—]\s*/, ''), size: 19, color: '1E293B' })],
          spacing: { after: 40 },
        })
      );
      return;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 19, color: '1E293B' })],
        spacing: { after: 50 },
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: paragraphs,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function fileStem(text: string): string {
  const first = text.split('\n').find((l) => l.trim())?.trim() ?? 'cv';
  const slug = first
    .replace(/\[[^\]]*\]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${slug}-cv` : 'upgraded-cv';
}

export async function POST(request: NextRequest) {
  try {
    const { text, format } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Nothing to export.' }, { status: 400 });
    }
    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ success: false, error: 'Unsupported format.' }, { status: 400 });
    }

    const stem = fileStem(text);
    const body = format === 'pdf' ? await buildPdf(text) : await buildDocx(text);

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type':
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
