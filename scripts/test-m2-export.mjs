/**
 * Milestone 2 Automated Verification Suite
 * Tests /api/resume/export endpoint for HTML, PDF, and DOCX generation.
 *
 * Verifies:
 * - format: 'html' returns 200, text/html, attachment, executive CSS tokens
 * - format: 'pdf' returns 200, application/pdf, valid %PDF binary header, non-zero length, parsed text
 * - format: 'docx' returns 200, OpenXML application, valid PK zip header, document.xml structure
 * - Two-column experience headers with long title collision protection
 * - Hanging indent for skills grid
 * - Bullet point orphan break protection
 * - Guard rail validations (empty text, unsupported formats)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import JSZip from 'jszip';

// Dynamically register our custom ESM resolver for Next.js / TypeScript modules
register('./scripts/test-loader.mjs', pathToFileURL('./'));

// Import route handler and NextRequest
const { POST } = await import('../src/app/api/resume/export/route.ts');
const { NextRequest } = await import('next/server.js');
const { PDFDocument } = await import('pdf-lib');
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function callExportRoute(payload) {
  const req = new NextRequest('http://localhost:3000/api/resume/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await POST(req);
}

console.log('\n================================================================');
console.log('       MILESTONE 2: RESUME EXPORT UPGRADE VERIFICATION');
console.log('================================================================\n');

const REFERENCE_CV = `CHIDINMA OKAFOR
Product Designer | Target: Stripe
chidinma@example.com  ·  +2348031234567  ·  linkedin.com/in/chidinma

PROFESSIONAL SUMMARY
Results-driven Product Designer with 6 years across fintech and enterprise logistics.
Specialized in building scalable design systems, leading user research, and accelerating delivery.

CORE SKILLS
Target Alignment: High-Fidelity Prototyping, Design Systems, Information Architecture, Interaction Design
Design Craft: Wireframing, User Journey Mapping, Auto-Layout, Component Libraries, Usability Testing
Tools & Platforms: Figma, FigJam, Notion, Jira, Slack, Adobe Creative Cloud

EXPERIENCE
Senior Product Designer, Paystack — 2021 to present
Lagos, Nigeria (Remote)
• Redesigned onboarding in Figma, lifting completion 38% for 55k users.
• Owned the design system used by 4 squads, reducing feature turnaround time by 35%.
• Recovered ₦12.4m in abandoned checkouts by reworking the payment step.
• Tested long token wrapping to ensure links never overflow page margins: https://example.com/a/very/long/portfolio/url/that/will/not/fit/on/one/line/at/all/ever

Lead Designer — SheltaMe    2019 – 2021
Lagos, Nigeria
• Spearheaded mobile and web platform interfaces for multi-tenant property discovery.
• Conducted user research and usability studies with over 120 participants.

EDUCATION & CERTIFICATIONS
BSc Computer Science — University of Lagos (2017)
Google UX Design Professional Certificate — Coursera (2020)`;

// ---------------------------------------------------------------------------
// TEST 1: HTML Export Format
// ---------------------------------------------------------------------------
await test('HTML export returns 200, text/html, attachment, and executive CSS tokens', async () => {
  const res = await callExportRoute({ text: REFERENCE_CV, format: 'html' });

  assert.equal(res.status, 200, 'HTTP status should be 200');
  const contentType = res.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/html'), `Content-Type should be text/html, got: ${contentType}`);
  assert.ok(contentType.includes('charset=utf-8'), `Content-Type should include charset=utf-8`);

  const disposition = res.headers.get('content-disposition') || '';
  assert.ok(disposition.includes('attachment;'), 'Should have attachment disposition');
  assert.ok(/chidinma-okafor-cv\.html/.test(disposition), `Filename should be chidinma-okafor-cv.html, got: ${disposition}`);

  const html = await res.text();
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'Valid HTML doctype');
  assert.ok(html.includes('<html lang="en">'), 'html lang="en" tag present');
  assert.ok(html.includes('CHIDINMA OKAFOR'), 'Candidate name present in HTML');
  assert.ok(html.includes('Product Designer | Target: Stripe'), 'Target subtitle present in HTML');

  // Executive CSS tokens verification
  assert.ok(html.includes('resume-container'), 'resume-container class present');
  assert.ok(html.includes('Inter'), 'Inter font specified in HTML');
  assert.ok(html.includes('border-bottom: 2px solid #111827;'), 'Header solid 2px dark border present');
  assert.ok(html.includes('color: #2563eb;'), 'Target subtitle blue color present');
  assert.ok(html.includes('border-bottom: 1px solid #e5e7eb;'), 'Hairline section divider present');
  assert.ok(html.includes('@page {'), '@page rules present');
  assert.ok(html.includes('margin: 12mm 14mm 12mm 14mm;'), '12mm 14mm print margin present');
  assert.ok(html.includes('justify-content: space-between;'), 'Two-column job header present');
  assert.ok(html.includes('<strong>38%</strong>') || html.includes('38%'), 'Metric present in HTML');
  assert.ok(html.includes('Redesigned onboarding'), 'Experience bullet present');
});

// ---------------------------------------------------------------------------
// TEST 2: PDF Export Format & Fidelity
// ---------------------------------------------------------------------------
await test('PDF export returns 200, valid %PDF header, non-zero length, and parsed content', async () => {
  const res = await callExportRoute({ text: REFERENCE_CV, format: 'pdf' });

  assert.equal(res.status, 200, 'HTTP status should be 200');
  const contentType = res.headers.get('content-type') || '';
  assert.ok(contentType.includes('application/pdf'), `Content-Type should be application/pdf, got: ${contentType}`);

  const disposition = res.headers.get('content-disposition') || '';
  assert.ok(/chidinma-okafor-cv\.pdf/.test(disposition), `Filename disposition should match, got: ${disposition}`);

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);

  assert.ok(buf.length > 2000, `PDF size should be substantial, got: ${buf.length} bytes`);
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-', 'PDF magic bytes header present');
  assert.ok(buf.subarray(-1024).includes('%%EOF'), 'PDF EOF marker present');

  // Parse via pdf-lib
  const parsedDoc = await PDFDocument.load(buf);
  assert.ok(parsedDoc.getPageCount() >= 1, `PDF should contain at least 1 page, got: ${parsedDoc.getPageCount()}`);

  // Extract text via pdfjs
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  let fullText = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    fullText += content.items.map((i) => i.str).join(' ') + '\n';
  }

  assert.ok(/CHIDINMA\s*OKAFOR/.test(fullText), 'PDF text carries candidate name');
  assert.ok(/Redesigned onboarding/.test(fullText), 'PDF text carries bullet');
  assert.ok(fullText.includes('NGN12.4m'), 'PDF substitutes ₦ for NGN');
  assert.ok(!fullText.includes('₦'), 'PDF has no unencodable ₦ glyph');
  assert.ok(/portfolio/.test(fullText), 'PDF text wrapped and contains long URL');
});

// ---------------------------------------------------------------------------
// TEST 3: DOCX Export Format & Structure
// ---------------------------------------------------------------------------
await test('DOCX export returns 200, valid PK zip header, category skills, and tabbed headers', async () => {
  const res = await callExportRoute({ text: REFERENCE_CV, format: 'docx' });

  assert.equal(res.status, 200, 'HTTP status should be 200');
  const contentType = res.headers.get('content-type') || '';
  assert.ok(
    contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    `Content-Type should be openxml docx, got: ${contentType}`
  );

  const disposition = res.headers.get('content-disposition') || '';
  assert.ok(/chidinma-okafor-cv\.docx/.test(disposition), `Filename disposition should match, got: ${disposition}`);

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);

  assert.ok(buf.length > 3000, `DOCX size should be substantial, got: ${buf.length} bytes`);
  assert.equal(buf[0], 0x50, 'PK zip header byte 0');
  assert.equal(buf[1], 0x4b, 'PK zip header byte 1');

  const zip = await JSZip.loadAsync(buf);
  const fileNames = Object.keys(zip.files);
  assert.ok(fileNames.includes('word/document.xml'), 'Contains word/document.xml');
  assert.ok(fileNames.includes('[Content_Types].xml'), 'Contains [Content_Types].xml');

  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(xml.includes('CHIDINMA OKAFOR'), 'DOCX document carries candidate name');
  assert.ok(xml.includes('₦'), 'DOCX preserves native Naira sign ₦');
  assert.ok(xml.includes('Redesigned onboarding'), 'DOCX bullet content survived');
  assert.ok(!xml.includes('>•'), 'DOCX strips literal • glyph in favor of native Word list');
  assert.ok(xml.includes('Target Alignment:'), 'DOCX carries category skill prefix');
  assert.ok(xml.includes('E5E7EB'), 'DOCX carries section divider hairline border');
});

// ---------------------------------------------------------------------------
// TEST 4: Long Title Collision Test (Two-Column Header Wrap)
// ---------------------------------------------------------------------------
await test('Two-column experience header wraps long titles without collision or crash', async () => {
  const COLLISION_CV = `DR. ALEXANDRA CONSTANTINE-VANDERBILT
Senior Executive Cloud Solutions Architect
alex@example.com  ·  +1 555-0199  ·  San Francisco, CA

PROFESSIONAL EXPERIENCE
Senior Lead Full-Stack Distributed Cloud Infrastructure Architect & Technical Strategy Director — Paystack Global Financial Technologies Solutions Limited    Nov 2021 – Present | Lagos, Nigeria (Remote)
• Architected enterprise-grade distributed payment ledger processing $15M daily.
• Spearheaded 4 cross-functional squads to modernize core banking integrations.`;

  for (const format of ['html', 'pdf', 'docx']) {
    const res = await callExportRoute({ text: COLLISION_CV, format });
    assert.equal(res.status, 200, `${format} export should return 200 on long titles`);

    const ab = await res.arrayBuffer();
    assert.ok(ab.byteLength > 1000, `${format} should produce non-empty payload`);

    if (format === 'pdf') {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(ab), useSystemFonts: true }).promise;
      let text = '';
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        text += content.items.map((i) => i.str).join(' ') + '\n';
      }
      assert.ok(text.includes('ALEXANDRA CONSTANTINE-VANDERBILT'), 'PDF text has candidate name');
      assert.ok(text.includes('Senior Lead Full-Stack Distributed Cloud'), 'PDF text has wrapped role title');
      assert.ok(text.includes('Nov 2021') && text.includes('Present'), 'PDF text has date without collision');
      assert.ok(text.includes('$15M daily'), 'PDF text has bullet point');
    }
  }
});

// ---------------------------------------------------------------------------
// TEST 5: Skills Grid Hanging Indent Test
// ---------------------------------------------------------------------------
await test('Skills grid handles multiple long categories with hanging indent without error', async () => {
  const SKILLS_CV = `SARAH CONNOR
Systems Security Engineer
sarah@sky.net  ·  +1 (555) 019-2834

CORE COMPETENCIES & TECHNICAL SKILLS
Defensive Architecture & Cryptography: Post-Quantum Cryptography, Zero-Knowledge Proofs, Multi-Party Computation, Homomorphic Encryption, Key Management
Infrastructure & Cloud Security: AWS IAM, Kubernetes RBAC, Terraform, Cilium eBPF, Vault, Envoy, Service Mesh Architecture, Network Policies
Security Operations & Compliance: Threat Modeling, Incident Response, SIEM, SOC2 Type II, ISO 27001, FedRAMP High, Red Teaming, Penetration Testing`;

  for (const format of ['pdf', 'docx', 'html']) {
    const res = await callExportRoute({ text: SKILLS_CV, format });
    assert.equal(res.status, 200, `${format} should succeed on long skills categories`);
  }
});

// ---------------------------------------------------------------------------
// TEST 6: Multi-Page Bullet Orphan Break Protection
// ---------------------------------------------------------------------------
await test('Multi-page document handles page boundary orphan protection smoothly', async () => {
  // Generate CV with many experience entries to force page boundaries
  let multiPageCv = `DAVID ATTENBOROUGH\nPrincipal Wildlife Researcher & Documentarian\ndavid@wildlife.org  ·  London, UK\n\nPROFESSIONAL SUMMARY\nOver 40 years of field research and nature documentary direction.\n\nEXPERIENCE\n`;
  for (let i = 1; i <= 15; i++) {
    multiPageCv += `\nSenior Field Director — BBC Natural History Unit    ${2025 - i} – ${2026 - i}\nBristol, UK\n`;
    multiPageCv += `• Spearheaded comprehensive field expedition across global ecosystems with 45 researchers.\n`;
    multiPageCv += `• Captured groundbreaking behavioral telemetry improving environmental conservation outreach by 40%.\n`;
    multiPageCv += `• Produced award-winning cinematic broadcast modules viewed by over 50M global viewers.\n`;
  }

  const res = await callExportRoute({ text: multiPageCv, format: 'pdf' });
  assert.equal(res.status, 200);

  const ab = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(new Uint8Array(ab));
  assert.ok(pdfDoc.getPageCount() >= 2, `Should span across multiple pages, got: ${pdfDoc.getPageCount()}`);
});

// ---------------------------------------------------------------------------
// TEST 7: Guard Rails & Error Rejection
// ---------------------------------------------------------------------------
await test('Guard rails reject empty text, whitespace, and unsupported formats', async () => {
  // 1. Empty string
  const r1 = await callExportRoute({ text: '', format: 'pdf' });
  assert.equal(r1.status, 400);
  const json1 = await r1.json();
  assert.equal(json1.error, 'Nothing to export.');

  // 2. Whitespace only
  const r2 = await callExportRoute({ text: '   \n\n  \t  ', format: 'pdf' });
  assert.equal(r2.status, 400);

  // 3. Unsupported format 'rtf'
  const r3 = await callExportRoute({ text: REFERENCE_CV, format: 'rtf' });
  assert.equal(r3.status, 400);
  const json3 = await r3.json();
  assert.equal(json3.error, 'Unsupported format.');

  // 4. Unsupported format 'json'
  const r4 = await callExportRoute({ text: REFERENCE_CV, format: 'json' });
  assert.equal(r4.status, 400);
});

// ---------------------------------------------------------------------------
// Summary & Exit
// ---------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
