import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side text extraction for uploaded CVs.
 *
 * Supports PDF (with coordinate-aware layout reconstruction), DOCX (Word), TXT, and Markdown.
 * Uses spatial coordinate analysis (X/Y baselines) so that headings, contact info lines,
 * dates, and bullet points maintain their precise document structure.
 * Automatically filters browser print headers/footers (e.g. file:///... 1/2).
 */
export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB limit

interface RawPdfItem {
  str?: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[]; // [scaleX, skewY, skewX, scaleY, transX, transY]
  hasEOL?: boolean;
}

interface PdfPage {
  getTextContent(): Promise<{ items: RawPdfItem[] }>;
}

interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
}

interface PdfjsModule {
  getDocument(src: Record<string, unknown>): { promise: Promise<PdfDocument> };
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  height: number;
  width: number;
}

/** Checks if a line is an artifact from printing a web page to PDF */
function isPrintArtifact(line: string): boolean {
  const t = line.trim();
  // Chrome/Edge file:/// footer with page numbers e.g. file:///C:/Users/.../Resume.html 1/2
  if (/^(?:file|https?):\/\/[^\s]+(?:\s+\d+\/\d+)?$/i.test(t)) return true;
  if (/^\d+\/\d+$/.test(t)) return true;
  if (/^page\s+\d+\s+of\s+\d+$/i.test(t)) return true;
  // Browser print timestamp header e.g. 8/19/26, 8:46 AM Ayodele Babalola - Senior Product & UI/UX Designer Resume
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s+/i.test(t)) return true;
  return false;
}

async function extractPdf(buf: Buffer): Promise<string> {
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfjsModule;
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: PositionedItem[] = [];

    for (const item of content.items) {
      if (!item.str || typeof item.str !== 'string') continue;
      const trimmed = item.str.trim();
      if (!trimmed && !item.hasEOL) continue;

      const transform = item.transform || [12, 0, 0, 12, 0, 0];
      const x = transform[4] ?? 0;
      const y = transform[5] ?? 0;
      const height = item.height || Math.abs(transform[3]) || 12;
      const width = item.width || 0;

      items.push({
        str: item.str,
        x,
        y,
        height,
        width,
      });
    }

    if (items.length === 0) continue;

    // In PDF space, higher Y means higher on page (top-to-bottom = descending Y)
    // Sort primarily by Y descending, then X ascending
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: { y: number; text: string; height: number }[] = [];
    let currentLineItems: PositionedItem[] = [];
    let currentY: number | null = null;
    let avgHeight = 12;

    const Y_TOLERANCE = 4.5; // Baseline variation threshold

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) > Y_TOLERANCE) {
        if (currentLineItems.length > 0 && currentY !== null) {
          // Sort items in this line horizontally
          currentLineItems.sort((a, b) => a.x - b.x);
          const lineStr = joinLineItems(currentLineItems);
          if (lineStr.trim() && !isPrintArtifact(lineStr)) {
            lines.push({ y: currentY, text: lineStr, height: avgHeight });
          }
        }
        currentLineItems = [item];
        currentY = item.y;
        avgHeight = item.height || 12;
      } else {
        currentLineItems.push(item);
        avgHeight = Math.max(avgHeight, item.height || 12);
      }
    }

    // Flush last line
    if (currentLineItems.length > 0 && currentY !== null) {
      currentLineItems.sort((a, b) => a.x - b.x);
      const lineStr = joinLineItems(currentLineItems);
      if (lineStr.trim() && !isPrintArtifact(lineStr)) {
        lines.push({ y: currentY, text: lineStr, height: avgHeight });
      }
    }

    // Reconstruct page with paragraph spacing detection
    const pageParagraphs: string[] = [];
    let prevY: number | null = null;
    let prevHeight = 12;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (prevY !== null) {
        const gap = prevY - line.y; // Positive distance downwards
        // If vertical gap is noticeably larger than a single line height, add paragraph break
        if (gap > Math.max(prevHeight * 1.8, 20)) {
          pageParagraphs.push(''); // blank line separator
        }
      }
      pageParagraphs.push(line.text);
      prevY = line.y;
      prevHeight = line.height;
    }

    pageTexts.push(pageParagraphs.join('\n'));
  }

  let fullText = pageTexts.join('\n\n');

  // Fix soft hyphen word breaks (e.g. "Micro-\nInteractions" -> "Micro-Interactions")
  fullText = fullText
    .replace(/(\b[A-Za-z]+-)\n([A-Za-z]+\b)/g, '$1$2')
    .replace(/\s+·\s+/g, ' • ');

  return fullText;
}

/**
 * Merges text tokens on the same horizontal baseline, inserting spaces where tokens are separated.
 */
function joinLineItems(items: PositionedItem[]): string {
  let result = '';
  for (let i = 0; i < items.length; i++) {
    const curr = items[i];
    if (i === 0) {
      result = curr.str;
    } else {
      const prev = items[i - 1];
      const prevEnd = prev.x + (prev.width || prev.str.length * 6);
      const gap = curr.x - prevEnd;

      // If there is a noticeable gap and neither token already has trailing/leading whitespace, add a space
      if (gap > 2 && !prev.str.endsWith(' ') && !curr.str.startsWith(' ')) {
        result += ' ' + curr.str;
      } else {
        result += curr.str;
      }
    }
  }
  return result.trim();
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value || '';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const entry = form.get('file');

    if (!entry || typeof entry === 'string') {
      return NextResponse.json({ success: false, error: 'No file was uploaded. Please choose a CV document.' }, { status: 400 });
    }

    const file = entry as File;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 10 MB limit. Please upload a standard text-based CV.' },
        { status: 413 }
      );
    }

    const name = (file.name || '').toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      text = await extractPdf(buf);
    } else if (
      name.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await extractDocx(buf);
    } else if (name.endsWith('.doc')) {
      return NextResponse.json(
        { success: false, error: 'Legacy .doc format is not supported. Please save as .docx or .pdf and re-upload.' },
        { status: 415 }
      );
    } else {
      // .txt, .md, or UTF-8 plain text
      text = buf.toString('utf-8');
    }

    // Clean zero-width spaces and trailing whitespace per line
    text = text
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .trim();

    if (text.replace(/\s+/g, ' ').trim().length < 30) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract readable text from that file. If this is a scanned image or screenshot, please copy and paste the text directly.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, text, length: text.length });
  } catch (error: unknown) {
    console.error('API Error in /api/resume/extract:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process this file. You can also paste your CV text directly into the box.',
        message: messageOf(error),
      },
      { status: 500 }
    );
  }
}
