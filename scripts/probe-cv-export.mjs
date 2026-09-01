/**
 * Verifies /api/resume/export returns real, openable files.
 *
 * Checks the magic bytes (%PDF- / PK zip header), a non-trivial size, the
 * filename in Content-Disposition, and — the case that would otherwise throw —
 * a document containing the Naira sign, which pdf-lib's WinAnsi standard fonts
 * cannot encode.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import JSZip from 'jszip';

const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = 'tmp/export-probe';
mkdirSync(OUT, { recursive: true });

const CV = `CHIDINMA OKAFOR
Product Designer
chidinma@example.com  ·  +2348031234567  ·  linkedin.com/in/chidinma

PROFESSIONAL SUMMARY
Product designer with 6 years across fintech and logistics.
[ADD YOUR STRONGEST RESULT: one sentence, with the single number you would want a hiring manager to remember.]

CORE SKILLS
Wireframing  ·  Rapid Prototyping  ·  User Journey Mapping  ·  Information Architecture

EXPERIENCE
Senior Product Designer, Paystack — 2021 to present
• Redesigned onboarding in Figma, lifting completion 38% for 55k users.
• Owned the design system used by 4 squads [ADD FIGURE: % / ₦ or $ / volume / time saved]
• Recovered ₦12.4m in abandoned checkouts by reworking the payment step.
• Ran a very long single token to force character-level wrapping: https://example.com/a/very/long/portfolio/url/that/will/not/fit/on/one/line/at/all/ever

EDUCATION
BSc Computer Science, University of Lagos, 2017`;

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

for (const format of ['pdf', 'docx']) {
  const res = await fetch(`${BASE}/api/resume/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: CV, format }),
  });

  console.log('\n' + '='.repeat(64));
  console.log(`${format.toUpperCase()}  HTTP ${res.status}  ${res.headers.get('content-type')}`);
  console.log('='.repeat(64));

  if (!res.ok) {
    check(`${format} responded 200`, false, await res.text());
    continue;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const path = `${OUT}/probe.${format}`;
  writeFileSync(path, buf);

  const disposition = res.headers.get('content-disposition') || '';
  check(`${format} filename`, /chidinma-okafor-cv\./.test(disposition), disposition);
  check(`${format} size is non-trivial`, buf.length > 1500, `${buf.length} bytes`);

  if (format === 'pdf') {
    check('pdf magic bytes', buf.subarray(0, 5).toString() === '%PDF-', buf.subarray(0, 8).toString());
    check('pdf has EOF marker', buf.subarray(-1024).includes('%%EOF'));
    // pdf-lib compresses object streams, so the structure has to be parsed
    // rather than grepped, and the text extracted the way a reader would.
    const { PDFDocument } = await import('pdf-lib');
    const parsed = await PDFDocument.load(buf);
    check('pdf parses and has pages', parsed.getPageCount() >= 1, `${parsed.getPageCount()} page(s)`);

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
    let text = '';
    for (let p = 1; p <= doc.numPages; p += 1) {
      const content = await (await doc.getPage(p)).getTextContent();
      text += content.items.map((i) => i.str).join(' ') + '\n';
    }
    check('pdf text carries the name', /CHIDINMA\s*OKAFOR/.test(text));
    check('pdf text carries a bullet', /Redesigned onboarding/.test(text));
    check('pdf substitutes ₦ for NGN', text.includes('NGN12.4m'), text.match(/NGN[\d.]+m/)?.[0] || 'not found');
    check('pdf has no unencodable ₦', !text.includes('₦'));
    check('pdf wrapped the long URL', /portfolio/.test(text));
  } else {
    check('docx zip magic bytes', buf[0] === 0x50 && buf[1] === 0x4b, `${buf[0]} ${buf[1]}`);
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files);
    check('docx contains document.xml', names.includes('word/document.xml'));
    check('docx contains [Content_Types].xml', names.includes('[Content_Types].xml'));
    const xml = await zip.file('word/document.xml').async('string');
    check('docx keeps the Naira sign', xml.includes('₦'));
    check('docx carries the name', xml.includes('CHIDINMA OKAFOR'));
    check('docx bullet content survived', xml.includes('Redesigned onboarding'));
    check('docx strips bullet glyph', !xml.includes('>•'), 'literal • should be a list, not text');
  }
  console.log(`  written: ${path}`);
}

// The sanitisation path: PDF must not throw on ₦, and must substitute it.
{
  const res = await fetch(`${BASE}/api/resume/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'A B\n\nEXPERIENCE\nRecovered ₦12.4m and cut costs 30% → done.', format: 'pdf' }),
  });
  console.log('\n' + '='.repeat(64));
  check('pdf with ₦ and → does not 500', res.status === 200, `HTTP ${res.status}`);
}

// Guard rails.
for (const [label, body, expected] of [
  ['empty text rejected', { text: '   ', format: 'pdf' }, 400],
  ['bad format rejected', { text: CV, format: 'rtf' }, 400],
]) {
  const res = await fetch(`${BASE}/api/resume/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  check(label, res.status === expected, `HTTP ${res.status}`);
}

console.log(`\n${failures ? `${failures} FAILURE(S)` : 'all checks passed'}`);
process.exit(failures ? 1 : 0);
