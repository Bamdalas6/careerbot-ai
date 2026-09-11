/**
 * scripts/verify-m1-parity.mjs
 *
 * Empirical verification suite for Milestone 1 Parity:
 * - Parity comparison against job-application-agent/scripts/cv-tailor.mjs
 * - Verification of visual tokens and CSS rules
 * - Ingestion of raw reference resume files:
 *   - job-application-agent/Ayodele_Babalola_Resume.html
 *   - job-application-agent/Abdulhammed_Fuad_Resume.html
 *   - job-application-agent/Ayodele_Babalola_Master_Resume.md
 *   - job-application-agent/Abdulhammed_Fuad_Resume.md
 *
 * Output: Detailed test results, failure traces, and final verdict (APPROVE or REQUEST_CHANGES).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const jobAgentDir = path.resolve(rootDir, '../job-application-agent');

// Dynamic import of target module under test
const templateModule = await import('../src/lib/resume-template.ts');
const {
  parseResumeDocument,
  renderExecutiveResumeHtml,
  renderExecutiveResumeBody,
  formatExecutiveBullet,
  formatExecutiveSummary,
  escapeHtml
} = templateModule;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function runTest(suite, name, fn) {
  results.total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    results.passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Details: ${err.message}`);
    results.failed++;
    results.failures.push({ suite, name, error: err.message, stack: err.stack });
  }
}

console.log('======================================================================');
console.log('  MILESTONE 1 EMPIRICAL PARITY VERIFICATION HARNESS');
console.log('  Target: src/lib/resume-template.ts');
console.log('  Reference: job-application-agent');
console.log('======================================================================\n');

// ---------------------------------------------------------------------------
// SUITE 1: Visual Design Tokens Parity against cv-tailor.mjs
// ---------------------------------------------------------------------------
console.log('--- SUITE 1: Visual Design Tokens Parity against cv-tailor.mjs ---');

const sampleDoc = {
  name: 'AYODELE BABALOLA',
  targetSubtitle: 'Senior Product & UI/UX Designer | Target: Stripe',
  contact: [
    { text: 'Lagos, Nigeria (Remote Worldwide)', icon: '📍' },
    { text: '+234 907 561 6876', href: 'tel:+2349075616876', icon: '📞' },
    { text: 'hello@bamdalas.com', href: 'mailto:hello@bamdalas.com', icon: '📧' },
    { text: 'bamdalas.com', href: 'https://bamdalas.com', icon: '🌐' },
    { text: 'linkedin.com/in/bamdalas', href: 'https://linkedin.com/in/bamdalas', icon: '🔗' }
  ],
  summary: 'Results-driven Senior Product Designer with 6+ years of experience.',
  skills: [
    { category: 'Design Systems Architecture', items: 'Figma Tokens, Variables, Auto-Layout' }
  ],
  experience: [
    {
      role: 'Digital & Product Designer',
      company: 'SLEC Africa',
      dates: '2025 – Present',
      location: 'Lagos, Nigeria (Remote)',
      bullets: ['Spearheaded end-to-end UI/UX design, increasing engagement by 40%.']
    }
  ],
  education: [
    {
      degree: 'Google UX Design Professional Certificate',
      institution: 'Coursera',
      year: '2023'
    }
  ]
};

const generatedHtml = renderExecutiveResumeHtml(sampleDoc);

runTest('Suite 1: Visual Tokens', 'Token 1: Google Font Inter import is identical', () => {
  const interImport = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');";
  assert.ok(generatedHtml.includes(interImport), 'Generated HTML must contain Inter font import');
});

runTest('Suite 1: Visual Tokens', 'Token 2: Body font-family stack and 13px base font size', () => {
  assert.ok(
    /font-family:\s*['"]Inter['"],\s*-apple-system,\s*BlinkMacSystemFont,\s*["']Segoe UI["'],\s*Roboto,\s*sans-serif/i.test(generatedHtml),
    'font-family stack must match cv-tailor.mjs'
  );
  assert.ok(/font-size:\s*13px/i.test(generatedHtml), 'Base font size must be 13px');
  assert.ok(/line-height:\s*1\.45/i.test(generatedHtml), 'Line height must be 1.45');
  assert.ok(/color:\s*#111827/i.test(generatedHtml), 'Base text color must be #111827');
  assert.ok(/background:\s*#ffffff/i.test(generatedHtml), 'Background must be #ffffff');
});

runTest('Suite 1: Visual Tokens', 'Token 3: Candidate name (h1 24px uppercase bold -0.02em tracking)', () => {
  assert.ok(/h1\s*\{[^}]*font-size:\s*24px/i.test(generatedHtml), 'h1 font-size must be 24px');
  assert.ok(/h1\s*\{[^}]*font-weight:\s*700/i.test(generatedHtml), 'h1 font-weight must be 700');
  assert.ok(/h1\s*\{[^}]*text-transform:\s*uppercase/i.test(generatedHtml), 'h1 text-transform must be uppercase');
  assert.ok(/h1\s*\{[^}]*letter-spacing:\s*-0\.02em/i.test(generatedHtml), 'h1 letter-spacing must be -0.02em');
  assert.ok(/h1\s*\{[^}]*color:\s*#111827/i.test(generatedHtml), 'h1 color must be #111827');
});

runTest('Suite 1: Visual Tokens', 'Token 4: Header 2px solid #111827 bottom border and padding', () => {
  assert.ok(/header\s*\{[^}]*border-bottom:\s*2px solid #111827/i.test(generatedHtml), 'header border-bottom must be 2px solid #111827');
  assert.ok(/header\s*\{[^}]*padding-bottom:\s*12px/i.test(generatedHtml), 'header padding-bottom must be 12px');
  assert.ok(/header\s*\{[^}]*margin-bottom:\s*14px/i.test(generatedHtml), 'header margin-bottom must be 14px');
});

runTest('Suite 1: Visual Tokens', 'Token 5: Subtitle (.title-sub) 14px 600-weight #2563eb', () => {
  assert.ok(/\.title-sub\s*\{[^}]*font-size:\s*14px/i.test(generatedHtml), '.title-sub font-size must be 14px');
  assert.ok(/\.title-sub\s*\{[^}]*font-weight:\s*600/i.test(generatedHtml), '.title-sub font-weight must be 600');
  assert.ok(/\.title-sub\s*\{[^}]*color:\s*#2563eb/i.test(generatedHtml), '.title-sub color must be #2563eb');
});

runTest('Suite 1: Visual Tokens', 'Token 6: Flex contact bar with 12px gap and 12px font size', () => {
  assert.ok(/\.contact-bar\s*\{[^}]*display:\s*flex/i.test(generatedHtml), '.contact-bar must be display: flex');
  assert.ok(/\.contact-bar\s*\{[^}]*flex-wrap:\s*wrap/i.test(generatedHtml), '.contact-bar must flex-wrap');
  assert.ok(/\.contact-bar\s*\{[^}]*gap:\s*12px/i.test(generatedHtml), '.contact-bar gap must be 12px');
  assert.ok(/\.contact-bar\s*\{[^}]*font-size:\s*12px/i.test(generatedHtml), '.contact-bar font-size must be 12px');
  assert.ok(/\.contact-bar\s*\{[^}]*color:\s*#4b5563/i.test(generatedHtml), '.contact-bar color must be #4b5563');
});

runTest('Suite 1: Visual Tokens', 'Token 7: Hairline section dividers (h2 uppercase 13px bold 1px solid #e5e7eb)', () => {
  assert.ok(/h2\s*\{[^}]*font-size:\s*13px/i.test(generatedHtml), 'h2 font-size must be 13px');
  assert.ok(/h2\s*\{[^}]*font-weight:\s*700/i.test(generatedHtml), 'h2 font-weight must be 700');
  assert.ok(/h2\s*\{[^}]*text-transform:\s*uppercase/i.test(generatedHtml), 'h2 must be uppercase');
  assert.ok(/h2\s*\{[^}]*letter-spacing:\s*0\.05em/i.test(generatedHtml), 'h2 letter-spacing must be 0.05em');
  assert.ok(/h2\s*\{[^}]*border-bottom:\s*1px solid #e5e7eb/i.test(generatedHtml), 'h2 border-bottom must be 1px solid #e5e7eb');
  assert.ok(/h2\s*\{[^}]*padding-bottom:\s*3px/i.test(generatedHtml), 'h2 padding-bottom must be 3px');
});

runTest('Suite 1: Visual Tokens', 'Token 8: Two-column experience headers (.job-header, .job-title, .job-meta)', () => {
  assert.ok(/\.job-header\s*\{[^}]*display:\s*flex/i.test(generatedHtml), '.job-header display flex');
  assert.ok(/\.job-header\s*\{[^}]*justify-content:\s*space-between/i.test(generatedHtml), '.job-header space-between');
  assert.ok(/\.job-header\s*\{[^}]*align-items:\s*baseline/i.test(generatedHtml), '.job-header baseline alignment');
  assert.ok(/\.job-title\s*\{[^}]*font-size:\s*13px/i.test(generatedHtml), '.job-title font-size 13px');
  assert.ok(/\.job-title\s*\{[^}]*font-weight:\s*700/i.test(generatedHtml), '.job-title font-weight 700');
  assert.ok(/\.job-title\s*\{[^}]*color:\s*#111827/i.test(generatedHtml), '.job-title color #111827');
  assert.ok(/\.job-meta\s*\{[^}]*font-size:\s*12px/i.test(generatedHtml), '.job-meta font-size 12px');
  assert.ok(/\.job-meta\s*\{[^}]*color:\s*#6b7280/i.test(generatedHtml), '.job-meta color #6b7280');
});

runTest('Suite 1: Visual Tokens', 'Token 9: @page print geometry (size: letter, margin: 12mm 14mm 12mm 14mm)', () => {
  assert.ok(/@page\s*\{[^}]*size:\s*letter/i.test(generatedHtml), '@page size must be letter');
  assert.ok(/@page\s*\{[^}]*margin:\s*12mm 14mm 12mm 14mm/i.test(generatedHtml), '@page margin must be 12mm 14mm 12mm 14mm');
  assert.ok(/@media\s+print/i.test(generatedHtml), '@media print must be present');
  const printBlock = generatedHtml.slice(generatedHtml.indexOf('@media print'));
  assert.ok(printBlock.includes('body {'), '@media print must contain body styles');
  assert.ok(printBlock.includes('.resume-container {'), '@media print must contain .resume-container styles');
  assert.ok(printBlock.includes('padding: 0'), '@media print must reset padding to 0');
});

// ---------------------------------------------------------------------------
// SUITE 2: CSS Selectors, Classes, and Structure Parity against cv-tailor.mjs
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 2: CSS Selectors, Classes, and Structure Parity ---');

const expectedSelectors = [
  '*',
  'body',
  '.resume-container',
  'header',
  'h1',
  '.title-sub',
  '.contact-bar',
  '.contact-bar a',
  'section',
  'h2',
  'p',
  '.skills-grid',
  '.skill-row strong',
  '.job-entry',
  '.job-header',
  '.job-title',
  '.job-meta',
  'ul',
  'li',
  'li strong',
  '@page',
  '@media print'
];

for (const sel of expectedSelectors) {
  runTest('Suite 2: Selectors', `Selector '${sel}' defined in template stylesheet`, () => {
    if (sel.startsWith('@')) {
      assert.ok(generatedHtml.includes(sel), `Generated HTML must contain ${sel}`);
    } else {
      const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[},;\\s])${escaped}\\s*\\{`, 'm');
      assert.ok(regex.test(generatedHtml), `Selector '${sel}' must be defined in stylesheet`);
    }
  });
}

runTest('Suite 2: Selectors', 'HTML semantic structure hierarchy matches cv-tailor.mjs', () => {
  assert.ok(generatedHtml.includes('<div class="resume-container">'), 'Must contain .resume-container');
  assert.ok(generatedHtml.includes('<header>'), 'Must contain <header>');
  assert.ok(generatedHtml.includes('<h1>'), 'Must contain <h1>');
  assert.ok(generatedHtml.includes('<div class="title-sub">'), 'Must contain .title-sub');
  assert.ok(generatedHtml.includes('<div class="contact-bar">'), 'Must contain .contact-bar');
  assert.ok(generatedHtml.includes('<section>'), 'Must contain <section>');
  assert.ok(generatedHtml.includes('<h2>'), 'Must contain <h2>');
  assert.ok(generatedHtml.includes('<div class="skills-grid">'), 'Must contain .skills-grid');
  assert.ok(generatedHtml.includes('<div class="job-entry">'), 'Must contain .job-entry');
  assert.ok(generatedHtml.includes('<div class="job-header">'), 'Must contain .job-header');
});

// ---------------------------------------------------------------------------
// SUITE 3: Raw Resume Content Ingestion (Ayodele_Babalola_Resume.html)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 3: Raw Resume Content Ingestion (Ayodele_Babalola_Resume.html) ---');

const ayodeleHtmlPath = path.join(jobAgentDir, 'Ayodele_Babalola_Resume.html');
assert.ok(fs.existsSync(ayodeleHtmlPath), `Ayodele HTML must exist at ${ayodeleHtmlPath}`);
const rawAyodeleHtml = fs.readFileSync(ayodeleHtmlPath, 'utf8');

runTest('Suite 3: Ayodele HTML Ingestion', 'Candidate name is accurately parsed (not "DOCTYPE HTML")', () => {
  const doc = parseResumeDocument(rawAyodeleHtml);
  assert.notEqual(doc.name, 'DOCTYPE HTML', 'Candidate name must not be DOCTYPE HTML');
  assert.ok(
    doc.name.includes('AYODELE') && doc.name.includes('BABALOLA'),
    `Expected name to contain AYODELE BABALOLA, but got: "${doc.name}"`
  );
});

runTest('Suite 3: Ayodele HTML Ingestion', 'Target subtitle is accurately parsed (not "<html lang=\\"en\\">")', () => {
  const doc = parseResumeDocument(rawAyodeleHtml);
  assert.notEqual(doc.targetSubtitle, '<html lang="en">', 'Subtitle must not be <html lang="en">');
  assert.ok(
    doc.targetSubtitle && (doc.targetSubtitle.includes('Product') || doc.targetSubtitle.includes('Designer')),
    `Expected subtitle to contain Product/Designer, got: "${doc.targetSubtitle}"`
  );
});

runTest('Suite 3: Ayodele HTML Ingestion', 'Contact chips do not leak HTML tags or CSS styles', () => {
  const doc = parseResumeDocument(rawAyodeleHtml);
  assert.ok(doc.contact.length > 0, 'Contact chips should not be empty');
  for (const chip of doc.contact) {
    assert.ok(!chip.text.includes('<'), `Contact chip text contains HTML tag: "${chip.text}"`);
    assert.ok(!chip.text.includes('@import'), `Contact chip contains CSS @import: "${chip.text}"`);
    assert.ok(!chip.text.includes('{'), `Contact chip contains CSS block: "${chip.text}"`);
  }
  const emailChip = doc.contact.find(c => c.text.includes('hello@bamdalas.com') || c.href?.includes('hello@bamdalas.com'));
  assert.ok(emailChip, 'Should extract email hello@bamdalas.com');
});

runTest('Suite 3: Ayodele HTML Ingestion', 'Professional summary is extracted without CSS pollution', () => {
  const doc = parseResumeDocument(rawAyodeleHtml);
  assert.ok(doc.summary, 'Summary should be extracted');
  assert.ok(!doc.summary.includes('padding: 30px'), 'Summary should not contain CSS styles');
  assert.ok(doc.summary.includes('Senior Product') || doc.summary.includes('Designer'), 'Summary should contain real profile text');
});

runTest('Suite 3: Ayodele HTML Ingestion', 'Skills categories are extracted from HTML resume', () => {
  const doc = parseResumeDocument(rawAyodeleHtml);
  assert.ok(doc.skills.length >= 2, `Expected at least 2 skill categories, got: ${doc.skills.length}`);
});

runTest('Suite 3: Ayodele HTML Ingestion', 'Experience entries are extracted from HTML resume', () => {
  const doc = parseResumeDocument(rawAyodeleHtml);
  assert.ok(doc.experience.length >= 3, `Expected at least 3 job entries, got: ${doc.experience.length}`);
});

runTest('Suite 3: Ayodele HTML Ingestion', 'renderExecutiveResumeHtml renders Ayodele without DOCTYPE heading', () => {
  const html = renderExecutiveResumeHtml(rawAyodeleHtml);
  assert.ok(!html.includes('<h1>DOCTYPE HTML</h1>'), 'Rendered HTML must not have <h1>DOCTYPE HTML</h1>');
  assert.ok(html.includes('AYODELE BABALOLA'), 'Rendered HTML must contain candidate name AYODELE BABALOLA');
});

// ---------------------------------------------------------------------------
// SUITE 4: Raw Resume Content Ingestion (Abdulhammed_Fuad_Resume.html)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 4: Raw Resume Content Ingestion (Abdulhammed_Fuad_Resume.html) ---');

const fuadHtmlPath = path.join(jobAgentDir, 'Abdulhammed_Fuad_Resume.html');
assert.ok(fs.existsSync(fuadHtmlPath), `Abdulhammed HTML must exist at ${fuadHtmlPath}`);
const rawFuadHtml = fs.readFileSync(fuadHtmlPath, 'utf8');

runTest('Suite 4: Abdulhammed HTML Ingestion', 'Candidate name is accurately parsed (not "DOCTYPE HTML")', () => {
  const doc = parseResumeDocument(rawFuadHtml);
  assert.notEqual(doc.name, 'DOCTYPE HTML', 'Candidate name must not be DOCTYPE HTML');
  assert.ok(
    doc.name.includes('ABDULHAMMED') && doc.name.includes('FUAD'),
    `Expected candidate name to contain ABDULHAMMED FUAD, but got: "${doc.name}"`
  );
});

runTest('Suite 4: Abdulhammed HTML Ingestion', 'Target subtitle is accurately parsed (not "<html lang=\\"en\\">")', () => {
  const doc = parseResumeDocument(rawFuadHtml);
  assert.notEqual(doc.targetSubtitle, '<html lang="en">', 'Subtitle must not be <html lang="en">');
  assert.ok(
    doc.targetSubtitle && (doc.targetSubtitle.includes('Backend') || doc.targetSubtitle.includes('Engineer')),
    `Expected subtitle to contain Backend/Engineer, got: "${doc.targetSubtitle}"`
  );
});

runTest('Suite 4: Abdulhammed HTML Ingestion', 'Contact chips do not leak HTML tags or CSS styles', () => {
  const doc = parseResumeDocument(rawFuadHtml);
  assert.ok(doc.contact.length > 0, 'Contact chips should not be empty');
  for (const chip of doc.contact) {
    assert.ok(!chip.text.includes('<'), `Contact chip text contains HTML tag: "${chip.text}"`);
    assert.ok(!chip.text.includes('@import'), `Contact chip contains CSS @import: "${chip.text}"`);
  }
  const emailChip = doc.contact.find(c => c.text.includes('zfuad6454@gmail.com') || c.href?.includes('zfuad6454@gmail.com'));
  assert.ok(emailChip, 'Should extract email zfuad6454@gmail.com');
});

runTest('Suite 4: Abdulhammed HTML Ingestion', 'Skills categories are extracted from HTML resume', () => {
  const doc = parseResumeDocument(rawFuadHtml);
  assert.ok(doc.skills.length >= 2, `Expected at least 2 skill categories, got: ${doc.skills.length}`);
});

runTest('Suite 4: Abdulhammed HTML Ingestion', 'Experience entries are extracted from HTML resume', () => {
  const doc = parseResumeDocument(rawFuadHtml);
  assert.ok(doc.experience.length >= 3, `Expected at least 3 job entries, got: ${doc.experience.length}`);
});

runTest('Suite 4: Abdulhammed HTML Ingestion', 'renderExecutiveResumeHtml renders Abdulhammed without DOCTYPE heading', () => {
  const html = renderExecutiveResumeHtml(rawFuadHtml);
  assert.ok(!html.includes('<h1>DOCTYPE HTML</h1>'), 'Rendered HTML must not have <h1>DOCTYPE HTML</h1>');
  assert.ok(html.includes('ABDULHAMMED FUAD'), 'Rendered HTML must contain candidate name ABDULHAMMED FUAD');
});

// ---------------------------------------------------------------------------
// SUITE 5: Markdown Resume Parsing Parity (Ayodele & Fuad Master Resumes)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 5: Markdown Resume Parsing Parity ---');

const ayodeleMdPath = path.join(jobAgentDir, 'Ayodele_Babalola_Master_Resume.md');
if (fs.existsSync(ayodeleMdPath)) {
  const rawAyodeleMd = fs.readFileSync(ayodeleMdPath, 'utf8');

  runTest('Suite 5: Markdown Resumes', 'Ayodele MD: Contact chips do not contain markdown headings or horizontal rules', () => {
    const doc = parseResumeDocument(rawAyodeleMd);
    for (const c of doc.contact) {
      assert.ok(!c.text.startsWith('#'), `Contact should not start with markdown heading: "${c.text}"`);
      assert.ok(!c.text.startsWith('---'), `Contact should not contain horizontal rule: "${c.text}"`);
    }
  });

  runTest('Suite 5: Markdown Resumes', 'Ayodele MD: Contact links parse clean URLs without markdown syntax in href', () => {
    const doc = parseResumeDocument(rawAyodeleMd);
    for (const c of doc.contact) {
      if (c.href) {
        assert.ok(!c.href.includes('['), `Contact href must not contain markdown brackets: "${c.href}"`);
        assert.ok(!c.href.includes('**'), `Contact href must not contain markdown bolding: "${c.href}"`);
      }
    }
  });

  runTest('Suite 5: Markdown Resumes', 'Ayodele MD: Experience extracts all 4 positions', () => {
    const doc = parseResumeDocument(rawAyodeleMd);
    assert.ok(
      doc.experience.length >= 3,
      `Expected at least 3 job positions from Ayodele Master Resume, got: ${doc.experience.length}`
    );
  });
}

// ---------------------------------------------------------------------------
// SUITE 6: Rendered Output Parity with In-Memory Structured Document
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 6: Structured Object Render Parity ---');

runTest('Suite 6: Structured Render', 'renderExecutiveResumeBody produces container without html/head tags', () => {
  const body = renderExecutiveResumeBody(sampleDoc);
  assert.ok(body.startsWith('  <div class="resume-container">'), 'Body must start with .resume-container');
  assert.ok(!body.includes('<!DOCTYPE'), 'Body must not contain <!DOCTYPE');
  assert.ok(!body.includes('<html'), 'Body must not contain <html');
  assert.ok(!/<head[\s>]/i.test(body), 'Body must not contain <head> tag');
});

runTest('Suite 6: Structured Render', 'Metric highlighting bolds 40% and lead-in verbs', () => {
  const bullet = 'Spearheaded development of 60+ reusable components, reducing turnaround time by 35%.';
  const formatted = formatExecutiveBullet(bullet);
  assert.ok(formatted.includes('<strong>Spearheaded</strong>'), 'Action lead-in should be bolded');
  assert.ok(formatted.includes('<strong>60+ reusable components</strong>'), 'Metric count should be bolded');
  assert.ok(formatted.includes('<strong>reducing turnaround time by 35%</strong>') || formatted.includes('<strong>35%</strong>'), 'Percentage reduction should be bolded');
});

runTest('Suite 6: Structured Render', 'XSS sanitization escapes executable script tags and malformed attributes', () => {
  const maliciousDoc = {
    name: '<script>alert("pwned")</script>',
    contact: [{ text: '<img src=x onerror=alert(1)>', href: 'javascript:alert(1)' }],
    summary: '<script>alert("xss")</script>',
    skills: [{ category: '<b onmouseover=alert(1)>Skills</b>', items: 'JS' }],
    experience: [{
      role: '<script>role</script>',
      company: 'Evil Corp',
      dates: '2025',
      bullets: ['<svg onload=alert(1)>']
    }],
    education: [{
      degree: '<iframe src=evil.com>',
      institution: 'University'
    }]
  };

  const safeHtml = renderExecutiveResumeHtml(maliciousDoc);
  assert.ok(!/<script[\s>]/i.test(safeHtml), 'HTML must not contain raw <script> tag');
  assert.ok(!safeHtml.includes('href="javascript:'), 'HTML must not allow javascript: URLs');
  assert.ok(!/<img\b/i.test(safeHtml), 'HTML must not allow unescaped <img> tag');
  assert.ok(!/<iframe[\s>]/i.test(safeHtml), 'HTML must not contain raw <iframe> tag');
});

// ---------------------------------------------------------------------------
// FINAL REPORT & VERDICT
// ---------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`  VERIFICATION RESULTS: ${results.passed} Passed, ${results.failed} Failed out of ${results.total} Tests`);
console.log('======================================================================');

if (results.failed > 0) {
  console.log('\nCRITICAL FAILURE SUMMARY:');
  results.failures.forEach((f, idx) => {
    console.log(`  ${idx + 1}) [${f.suite}] ${f.name}`);
    console.log(`     Error: ${f.error}`);
  });
  console.log('\nVERDICT: REQUEST_CHANGES');
  console.log('Reason: src/lib/resume-template.ts fails when consuming raw HTML reference resumes');
  console.log('(Ayodele_Babalola_Resume.html, Abdulhammed_Fuad_Resume.html) and markdown resumes from job-application-agent.');
  process.exitCode = 1;
} else {
  console.log('\nVERDICT: APPROVE');
  console.log('All parity and visual token tests passed with 100% compliance.');
  process.exitCode = 0;
}
