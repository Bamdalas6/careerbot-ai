import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';

/**
 * Server-side text extraction for uploaded CVs.
 *
 * Supports PDF (with coordinate-aware layout reconstruction and raw stream fallback),
 * DOCX (Word), TXT, and Markdown.
 * Uses spatial coordinate analysis so that headings, contact info lines,
 * dates, and bullet points maintain their precise document structure.
 */
export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB limit

interface RawPdfItem {
  str?: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[];
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
  if (/^(?:file|https?):\/\/[^\s]+(?:\s+\d+\/\d+)?$/i.test(t)) return true;
  if (/^\d+\/\d+$/.test(t)) return true;
  if (/^page\s+\d+\s+of\s+\d+$/i.test(t)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s+/i.test(t)) return true;
  return false;
}

/**
 * Pure Node.js fallback PDF stream extractor when worker-based pdfjs fails.
 */
function extractPdfStreams(buf: Buffer): string {
  try {
    const binary = buf.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    const chunks: string[] = [];
    let match;

    while ((match = streamRegex.exec(binary)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let textContent = '';

      try {
        const decompressed = zlib.inflateSync(rawStream);
        textContent = decompressed.toString('latin1');
      } catch {
        try {
          const decompressed = zlib.inflateRawSync(rawStream);
          textContent = decompressed.toString('latin1');
        } catch {
          textContent = rawStream.toString('latin1');
        }
      }

      // Extract text from (text) Tj or [(text) 10 (text)] TJ
      const tjMatches = textContent.match(/(?:\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ)/g) || [];
      for (const tj of tjMatches) {
        const innerTj = tj.match(/\((.*?)\)\s*Tj/);
        if (innerTj && innerTj[1]) {
          chunks.push(innerTj[1]);
        } else {
          const innerArray = tj.match(/\[(.*?)\]\s*TJ/);
          if (innerArray && innerArray[1]) {
            const parts = innerArray[1].match(/\((.*?)\)/g) || [];
            for (const p of parts) {
              chunks.push(p.replace(/^\(|\)$/g, ''));
            }
          }
        }
      }
    }

    const decoded = chunks
      .join(' ')
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([()\\])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    return decoded;
  } catch (err) {
    console.error('extractPdfStreams error:', err);
    return '';
  }
}

async function extractPdf(buf: Buffer): Promise<string> {
  // Tier 1: Try high-fidelity coordinate parser with pdfjs-dist
  try {
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

        items.push({ str: item.str, x, y, height, width });
      }

      if (items.length === 0) continue;

      items.sort((a, b) => b.y - a.y || a.x - b.x);

      const lines: { y: number; text: string; height: number }[] = [];
      let currentLineItems: PositionedItem[] = [];
      let currentY: number | null = null;
      let avgHeight = 12;
      const Y_TOLERANCE = 4.5;

      for (const item of items) {
        if (currentY === null || Math.abs(item.y - currentY) > Y_TOLERANCE) {
          if (currentLineItems.length > 0 && currentY !== null) {
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

      if (currentLineItems.length > 0 && currentY !== null) {
        currentLineItems.sort((a, b) => a.x - b.x);
        const lineStr = joinLineItems(currentLineItems);
        if (lineStr.trim() && !isPrintArtifact(lineStr)) {
          lines.push({ y: currentY, text: lineStr, height: avgHeight });
        }
      }

      const pageParagraphs: string[] = [];
      let prevY: number | null = null;
      let prevHeight = 12;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (prevY !== null) {
          const gap = prevY - line.y;
          if (gap > Math.max(prevHeight * 1.8, 20)) {
            pageParagraphs.push('');
          }
        }
        pageParagraphs.push(line.text);
        prevY = line.y;
        prevHeight = line.height;
      }

      pageTexts.push(pageParagraphs.join('\n'));
    }

    let fullText = pageTexts.join('\n\n');
    fullText = fullText
      .replace(/(\b[A-Za-z]+-)\n([A-Za-z]+\b)/g, '$1$2')
      .replace(/\s+·\s+/g, ' • ');

    if (fullText.trim().length >= 30) {
      return fullText;
    }
  } catch (pdfjsErr) {
    console.warn('pdfjs extraction failed, trying stream fallback:', pdfjsErr);
  }

  // Tier 2: Stream decompression fallback
  const fallbackText = extractPdfStreams(buf);
  if (fallbackText.trim().length >= 30) {
    return fallbackText;
  }

  throw new Error('Could not extract readable text from this PDF. Please save as Word (.docx) or copy and paste your CV text directly into the box.');
}

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
        { success: false, error: 'File exceeds 12 MB limit. Please upload a standard text-based CV.' },
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
      text = buf.toString('utf-8');
    }

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
        error: messageOf(error) || 'Failed to process this file. You can also paste your CV text directly into the box.',
      },
      { status: 500 }
    );
  }
}
