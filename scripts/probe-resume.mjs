/**
 * Verifies /api/resume/extract against real files for each supported format,
 * then feeds the extracted text through /api/resume/upgrade.
 *
 * The PDF is generated here rather than committed as a binary so the test is
 * self-contained and reviewable.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = process.env.BASE || 'http://localhost:3210';

/** Builds a minimal but structurally valid single-page PDF with real text. */
function buildPdf(lines) {
  const text = lines
    .map((l, i) => `BT /F1 11 Tf 72 ${740 - i * 16} Td (${l.replace(/([()\\])/g, '\\$1')}) Tj ET`)
    .join('\n');

  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const CV_LINES = [
  'CHIDINMA OKAFOR - Product Designer',
  'Email: chidinma@example.com  Phone: +2348031234567',
  'linkedin.com/in/chidinma',
  '',
  'SUMMARY',
  'Product designer with 6 years across fintech and logistics.',
  '',
  'EXPERIENCE',
  'Redesigned onboarding in Figma, lifting completion 38% for 55k users.',
  'Responsible for the design system used by 4 squads.',
  'Ran usability testing with 60 participants across Lagos and Abuja.',
  '',
  'SKILLS',
  'Figma, prototyping, user research, wireframes, accessibility',
  '',
  'EDUCATION',
  'BSc Computer Science, University of Lagos, 2017',
];

async function post(url, body, isForm) {
  const res = await fetch(url, {
    method: 'POST',
    ...(isForm ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { parseError: true };
  }
  return { status: res.status, json };
}

async function extract(name, buf, type) {
  const form = new FormData();
  form.append('file', new Blob([buf], { type: type || 'application/octet-stream' }), name);
  return post(`${BASE}/api/resume/extract`, form, true);
}

const tmp = os.tmpdir();

async function main() {
  const results = [];

  // ---------------------------------------------------------------- TXT
  {
    const buf = Buffer.from(CV_LINES.join('\n'), 'utf-8');
    const { status, json } = await extract('cv.txt', buf, 'text/plain');
    results.push(['TXT', status, json.success, json.success ? `${json.text.length} chars` : json.error]);
  }

  // --------------------------------------------------------------- DOCX
  // Built here with real CV text: the mammoth fixtures are a single short
  // sentence, which the route correctly rejects as too thin to review.
  {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`
    );
    zip.folder('_rels').file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`
    );
    const paras = CV_LINES.map(
      (l) =>
        `<w:p><w:r><w:t xml:space="preserve">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`
    ).join('');
    zip.folder('word').file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${paras}</w:body></w:document>`
    );
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const { status, json } = await extract(
      'cv.docx', buf,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    results.push([
      'DOCX', status, json.success,
      json.success ? `${json.text.length} chars, ${json.text.split('\n').filter(Boolean).length} lines` : json.error,
    ]);
  }

  // ---------------------------------------------------------------- PDF
  let pdfText = null;
  {
    const buf = buildPdf(CV_LINES);
    fs.writeFileSync(path.join(tmp, 'cv-test.pdf'), buf);
    const { status, json } = await extract('cv.pdf', buf, 'application/pdf');
    if (json.success) pdfText = json.text;
    results.push([
      'PDF', status, json.success,
      json.success ? `${json.text.length} chars, ${json.text.split('\n').length} lines` : json.error,
    ]);
  }

  // ------------------------------------------------------- rejection paths
  {
    const { status, json } = await extract('cv.doc', Buffer.from('old word binary'), 'application/msword');
    results.push(['DOC (should reject)', status, json.success, json.error]);
  }
  {
    const { status, json } = await extract('tiny.txt', Buffer.from('hi'), 'text/plain');
    results.push(['Too-short (should reject)', status, json.success, json.error]);
  }

  console.log('FORMAT'.padEnd(26), 'HTTP'.padEnd(6), 'OK'.padEnd(7), 'DETAIL');
  for (const [fmt, status, ok, detail] of results) {
    console.log(String(fmt).padEnd(26), String(status).padEnd(6), String(ok).padEnd(7), detail);
  }

  // ------------------------------- end-to-end: PDF text -> review + parse
  if (pdfText) {
    console.log('\n--- PDF text extracted ---');
    console.log(pdfText.slice(0, 300));

    const up = await post(`${BASE}/api/resume/upgrade`, { text: pdfText });
    if (up.json.success) {
      const r = up.json.review;
      console.log('\n--- review of the PDF ---');
      console.log('score', r.score, '|', r.headline);
      r.sections.forEach((s) => console.log('  ', s.label.padEnd(20), s.score, s.status));
      console.log('  top priority:', r.top_priority);
      console.log('  ats warnings:', r.ats_warnings.length ? r.ats_warnings.join(' | ') : 'none');
      console.log('  rewrites:', r.improved_bullets.length);
      if (r.improved_bullets[0]) {
        console.log('   before:', r.improved_bullets[0].before);
        console.log('   after :', r.improved_bullets[0].after);
      }
    } else {
      console.log('review failed:', up.status, up.json.error);
    }

    const parsed = await post(`${BASE}/api/resume`, { text: pdfText });
    console.log('\n--- skill parse of the PDF ---');
    console.log(parsed.json.success ? JSON.stringify(parsed.json.profile) : parsed.json.error);
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
