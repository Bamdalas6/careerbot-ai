/**
 * Verification Suite for Resume Upload & Extraction Pipeline
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server.js';
import { POST } from '../src/app/api/resume/extract/route.ts';

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

console.log('\n--- RESUME UPLOAD & EXTRACTION PIPELINE TESTS ---\n');

// 1. Real PDF Resume Extraction
await test('Extracts text accurately from real resume PDF (Ayodele Babalola)', async () => {
  const filePath = 'c:/Users/ASUS/Desktop/Project/job-application-agent/Ayodele_Babalola_Master_Resume.pdf';
  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const file = new File([blob], 'Ayodele_Babalola_Master_Resume.pdf', { type: 'application/pdf' });
  
  const form = new FormData();
  form.append('file', file);
  const req = new NextRequest('http://localhost/api/resume/extract', { method: 'POST', body: form });

  const res = await POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.length > 2000, `Expected length > 2000, got ${data.length}`);
  assert.ok(data.text.includes('AYODELE BABALOLA'), 'Should contain candidate name');
  assert.ok(data.text.includes('Senior Product'), 'Should contain title');
  assert.ok(data.text.includes('PROFESSIONAL SUMMARY'), 'Should contain section heading');
});

// 2. Second Real PDF Resume Extraction
await test('Extracts text accurately from tailored PDF (Bitwarden)', async () => {
  const filePath = 'c:/Users/ASUS/Desktop/Project/job-application-agent/tailored_resumes/Babalola_Ayodele_Bitwarden_Senior_Product_Designer.pdf';
  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const file = new File([blob], 'Bitwarden_Resume.pdf', { type: 'application/pdf' });
  
  const form = new FormData();
  form.append('file', file);
  const req = new NextRequest('http://localhost/api/resume/extract', { method: 'POST', body: form });

  const res = await POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.length > 2000, `Expected length > 2000, got ${data.length}`);
  assert.ok(data.text.includes('Bitwarden'), 'Should contain Bitwarden targeting');
});

// 3. Plain Text File Extraction
await test('Extracts text accurately from plain text CV file', async () => {
  const txtContent = `JANE DOE
Staff Cloud Architect | Target: Google Cloud
jane@example.com  •  San Francisco, CA

PROFESSIONAL SUMMARY
Experienced infrastructure engineer with 10+ years architecting distributed systems.

TECHNICAL SKILLS
Languages: Go, Python, TypeScript
Cloud: GCP, AWS, Kubernetes, Terraform

EXPERIENCE
Principal Cloud Engineer — Acme Corp    2020 – Present
• Designed resilient multi-region Kubernetes clusters handling 50k QPS.`;

  const blob = new Blob([Buffer.from(txtContent, 'utf-8')], { type: 'text/plain' });
  const file = new File([blob], 'resume.txt', { type: 'text/plain' });
  
  const form = new FormData();
  form.append('file', file);
  const req = new NextRequest('http://localhost/api/resume/extract', { method: 'POST', body: form });

  const res = await POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.text.includes('JANE DOE'));
});

// 4. Empty File Rejection
await test('Rejects empty file with appropriate error', async () => {
  const blob = new Blob([Buffer.from('')], { type: 'application/pdf' });
  const file = new File([blob], 'empty.pdf', { type: 'application/pdf' });
  
  const form = new FormData();
  form.append('file', file);
  const req = new NextRequest('http://localhost/api/resume/extract', { method: 'POST', body: form });

  const res = await POST(req);
  assert.ok(res.status >= 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
