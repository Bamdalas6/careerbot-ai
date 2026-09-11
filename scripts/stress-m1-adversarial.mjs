/**
 * Empirical Adversarial Stress Harness for Milestone 1
 * Targets: parseResumeDocument, renderExecutiveResumeHtml, renderExecutiveResumeBody,
 *          formatExecutiveBullet, formatExecutiveSummary, escapeHtml
 */

import { performance } from 'node:perf_hooks';
import {
  parseResumeDocument,
  renderExecutiveResumeHtml,
  renderExecutiveResumeBody,
  formatExecutiveBullet,
  formatExecutiveSummary,
  escapeHtml
} from '../src/lib/resume-template.ts';

const findings = [];
let suiteCount = 0;
let passCount = 0;
let failCount = 0;

function report(suite, testName, passed, details = {}) {
  suiteCount++;
  if (passed) {
    passCount++;
    console.log(`  ✓ PASS: [${suite}] ${testName}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: [${suite}] ${testName}`);
    if (details.reason) console.error(`    Reason: ${details.reason}`);
    findings.push({ suite, testName, passed: false, ...details });
  }
}

console.log('================================================================');
console.log('   EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 1');
console.log('================================================================\n');

// ============================================================================
// SUITE 1: XSS Injection & HTML Sanitization
// ============================================================================
console.log('--- SUITE 1: XSS Injection & HTML Sanitization ---');

// 1.1 XSS in bullets via <strong> tag evasion
{
  const bulletXss = '• Spearheaded <strong><script>alert("xss-bullet-script")</script></strong> optimization.';
  const formatted = formatExecutiveBullet(bulletXss);
  const rawScript = formatted.includes('<script>');
  report('XSS: Bullets', 'formatExecutiveBullet should not allow raw <script> via <strong> wrapper', !rawScript, {
    reason: rawScript ? 'Unescaped <script> tag present in bullet output!' : null,
    outputSnippet: formatted
  });

  const bulletImg = '• Optimized backend <strong><img src=x onerror=alert("xss-bullet-img")></strong> pipeline.';
  const formattedImg = formatExecutiveBullet(bulletImg);
  const rawImg = formattedImg.includes('<img src=x');
  report('XSS: Bullets', 'formatExecutiveBullet should not allow raw <img onerror> via <strong> wrapper', !rawImg, {
    reason: rawImg ? 'Unescaped <img onerror> tag present in bullet output!' : null,
    outputSnippet: formattedImg
  });

  const bulletSvg = '• Designed <strong><svg onload=alert("xss-bullet-svg")></strong> interface.';
  const formattedSvg = formatExecutiveBullet(bulletSvg);
  const rawSvg = formattedSvg.includes('<svg');
  report('XSS: Bullets', 'formatExecutiveBullet should not allow raw <svg> via <strong> wrapper', !rawSvg, {
    reason: rawSvg ? 'Unescaped <svg> tag present in bullet output!' : null,
    outputSnippet: formattedSvg
  });
}

// 1.2 XSS in summary via <strong> tag evasion
{
  const summaryXss = 'Experienced <strong><script>alert("xss-summary")</script></strong> engineer.';
  const formatted = formatExecutiveSummary(summaryXss);
  const rawScript = formatted.includes('<script>');
  report('XSS: Summary', 'formatExecutiveSummary should not allow raw <script> via <strong> wrapper', !rawScript, {
    reason: rawScript ? 'Unescaped <script> tag present in summary output!' : null,
    outputSnippet: formatted
  });

  const summaryImg = 'Senior architect with <strong><img src=x onerror=alert("xss-summary-img")></strong> 10+ years.';
  const formattedImg = formatExecutiveSummary(summaryImg);
  const rawImg = formattedImg.includes('<img src=x');
  report('XSS: Summary', 'formatExecutiveSummary should not allow raw <img onerror> via <strong> wrapper', !rawImg, {
    reason: rawImg ? 'Unescaped <img onerror> tag present in summary output!' : null,
    outputSnippet: formattedImg
  });
}

// 1.3 Full Resume Document XSS via rawText (Stored XSS Simulation)
{
  const xssCvText = `JANE DOE <script>alert("xss-name")</script>
Senior Architect <img src=x onerror=alert("xss-sub")>
attacker@example.com" onclick="alert('xss-email')"  •  javascript:alert("xss-link")  •  <svg onload=alert("xss-loc")>

PROFESSIONAL SUMMARY
Senior architect with <strong><script>alert("xss-summary")</script></strong> background.

TECHNICAL SKILLS
<script>alert("xss-skill-cat")</script>: <img src=x onerror=alert("xss-skill-item")>, TypeScript

PROFESSIONAL EXPERIENCE
<script>alert("xss-role")</script> — <script>alert("xss-comp")</script>    2020 – Present | <script>alert("xss-job-loc")</script>
• Spearheaded <strong><img src=x onerror=alert("xss-bullet")></strong> transformation.
• Delivered feature with <script>alert("plain-bullet-script")</script> tags.

FEATURED PROJECTS
<script>alert("xss-proj-name")</script> (javascript:alert("xss-proj-link")): <img src=x onerror=alert("xss-proj-desc")>

EDUCATION & CERTIFICATIONS
<script>alert("xss-degree")</script> — <script>alert("xss-school")</script> (2024)
`;

  const parsed = parseResumeDocument(xssCvText);
  const html = renderExecutiveResumeHtml(parsed);

  const unescapedTags = [];
  if (html.includes('<script>')) unescapedTags.push('<script>');
  if (html.includes('<img src=x')) unescapedTags.push('<img src=x');
  if (html.includes('<svg')) unescapedTags.push('<svg');
  if (html.includes('href="javascript:')) unescapedTags.push('href="javascript:..."');
  if (html.includes('onclick=')) unescapedTags.push('onclick=');

  report('XSS: End-to-End HTML', 'Full HTML rendering must contain 0 unescaped malicious tags/attributes from rawText', unescapedTags.length === 0, {
    reason: unescapedTags.length > 0 ? `Found unescaped XSS payloads: ${unescapedTags.join(', ')}` : null,
    unescapedTags
  });
}

// 1.4 Direct ParsedResumeDocument object XSS (Object injection via contact chip icon)
{
  const directDoc = {
    name: 'TEST USER',
    contact: [
      { text: 'test@example.com', icon: '<script>alert("xss-icon")</script>' },
      { text: 'Malicious Phone', icon: '<img src=x onerror=alert("xss-icon-img")>' }
    ],
    skills: [],
    experience: [],
    education: []
  };

  const bodyHtml = renderExecutiveResumeBody(directDoc);
  const iconHasScript = bodyHtml.includes('<script>');
  const iconHasImg = bodyHtml.includes('<img src=x');

  report('XSS: Direct Object', 'renderExecutiveResumeBody should escape chip.icon to prevent injection', !iconHasScript && !iconHasImg, {
    reason: (iconHasScript || iconHasImg) ? 'Unescaped chip.icon injected into HTML!' : null,
    bodySnippet: bodyHtml.slice(0, 300)
  });
}


// ============================================================================
// SUITE 2: Unicode, International Characters & Accented Names
// ============================================================================
console.log('\n--- SUITE 2: Unicode, International Characters & Accented Names ---');

// 2.1 Accented and Latin-extended names
{
  const accentedNames = [
    { input: 'José García', expected: 'JOSÉ GARCÍA' },
    { input: 'Müller Schmidt', expected: 'MÜLLER SCHMIDT' },
    { input: 'Björn Stroustrup', expected: 'BJÖRN STROUSTRUP' },
    { input: 'René Descartes', expected: 'RENÉ DESCARTES' },
    { input: 'François Hollande', expected: 'FRANÇOIS HOLLANDE' },
    { input: 'Chloë Sevigny', expected: 'CHLOË SEVIGNY' },
    { input: 'Łukasz Fabiański', expected: 'ŁUKASZ FABIAŃSKI' }
  ];

  for (const item of accentedNames) {
    const cv = `${item.input}\nSoftware Engineer\njose@example.com\n\nSUMMARY\nGreat dev.`;
    const parsed = parseResumeDocument(cv);
    const passed = parsed.name === item.expected;
    report('Unicode: Latin Accents', `Preserves accented name "${item.input}" (got "${parsed.name}", expected "${item.expected}")`, passed, {
      input: item.input,
      got: parsed.name,
      expected: item.expected,
      reason: !passed ? `Name was mutilated or stripped: "${parsed.name}"` : null
    });
  }
}

// 2.2 African & Nigerian diacritics
{
  const africanNames = [
    { input: 'Ayọ̀délé Babálọlá', expectedIncludes: 'AYỌ̀DÉLÉ' },
    { input: 'Chidịọma Nnamdi', expectedIncludes: 'CHIDỊỌMA' }
  ];

  for (const item of africanNames) {
    const cv = `${item.input}\nProduct Designer\nhello@example.com\n\nSUMMARY\nGreat dev.`;
    const parsed = parseResumeDocument(cv);
    const passed = parsed.name.includes(item.expectedIncludes);
    report('Unicode: African Diacritics', `Preserves African diacritics "${item.input}" (got "${parsed.name}")`, passed, {
      got: parsed.name,
      reason: !passed ? `Diacritic letters were stripped from name: "${parsed.name}"` : null
    });
  }
}

// 2.3 Non-Latin scripts (Cyrillic, CJK, Arabic, Hebrew, Greek)
{
  const nonLatinNames = [
    { input: 'Иван Петров', script: 'Cyrillic' },
    { input: '李小龙', script: 'Chinese' },
    { input: '山田太郎', script: 'Japanese' },
    { input: 'محمد بن زايد', script: 'Arabic' },
    { input: 'יוסי כהן', script: 'Hebrew' },
    { input: 'Σωκράτης', script: 'Greek' }
  ];

  for (const item of nonLatinNames) {
    const cv = `${item.input}\nSoftware Engineer\nuser@example.com\n\nSUMMARY\nGreat dev.`;
    const parsed = parseResumeDocument(cv);
    const passed = parsed.name !== 'CANDIDATE NAME' && parsed.name.length > 0;
    report('Unicode: Non-Latin Scripts', `Does not obliterate ${item.script} name "${item.input}" into "CANDIDATE NAME"`, passed, {
      input: item.input,
      got: parsed.name,
      reason: !passed ? `Name in ${item.script} was completely wiped out to fallback "${parsed.name}"` : null
    });
  }
}

// 2.4 Emojis and Complex Unicode in Content
{
  const emojiCv = `SARAH CONNOR 🛡️
Cyber Defense 🚀 | AI Resistance 🦾
sarah@sky.net  •  +1 555-0199  •  Los Angeles 🌴

PROFESSIONAL SUMMARY
Defending human networks against 🤖 Skynet algorithms with 99.99% uptime.

CORE COMPETENCIES & TECHNICAL SKILLS
Defensive Ops 🛡️: C++, Rust 🦀, Network Security 🔒, Incident Response 🚨

PROFESSIONAL EXPERIENCE
Defense Commander — Resistance ✊    2029 – Present | Underground ⛺
• Led 500+ freedom fighters ⚔️ in defending critical infrastructure against 100+ cyber incursions.
• Accelerated system recovery time by 80% using automated contingency protocols.
`;

  let crashed = false;
  let parsed = null;
  let html = '';
  try {
    parsed = parseResumeDocument(emojiCv);
    html = renderExecutiveResumeHtml(parsed);
  } catch (err) {
    crashed = true;
  }

  const hasRustEmoji = html.includes('🦀');
  const hasShieldEmoji = html.includes('🛡️');
  const hasPercentage = html.includes('<strong>80%</strong>');

  report('Unicode: Emojis & Symbols', 'Parses and renders complex emoji content without crashing or dropping glyphs', !crashed && hasRustEmoji && hasShieldEmoji && hasPercentage, {
    crashed,
    hasRustEmoji,
    hasShieldEmoji,
    hasPercentage
  });
}


// ============================================================================
// SUITE 3: Malformed, Chaotic & Boundary Inputs
// ============================================================================
console.log('\n--- SUITE 3: Malformed, Chaotic & Boundary Inputs ---');

// 3.1 Empty & Whitespace strings
{
  const emptyInputs = [
    { label: 'Empty string ""', text: '' },
    { label: 'Whitespace only "   \\n\\t\\r   "', text: '   \n\t\r   ' },
    { label: 'Single newline "\\n"', text: '\n' },
    { label: '100 consecutive newlines', text: '\n'.repeat(100) }
  ];

  for (const item of emptyInputs) {
    let crashed = false;
    let html = '';
    try {
      const parsed = parseResumeDocument(item.text);
      html = renderExecutiveResumeHtml(parsed);
    } catch (err) {
      crashed = true;
    }
    const validHtml = html.includes('class="resume-container"') && html.includes('CANDIDATE NAME');
    report('Boundary: Empty/Whitespace', `${item.label} returns valid fallback HTML without crashing`, !crashed && validHtml, {
      crashed,
      validHtml
    });
  }
}

// 3.2 Null and Undefined Robustness
{
  let parseNullOk = false;
  let parseUndefOk = false;
  try {
    const p1 = parseResumeDocument(null);
    parseNullOk = p1.name === 'CANDIDATE NAME';
    const p2 = parseResumeDocument(undefined);
    parseUndefOk = p2.name === 'CANDIDATE NAME';
  } catch (err) {
    //
  }

  report('Boundary: Null/Undefined', 'parseResumeDocument handles null/undefined gracefully', parseNullOk && parseUndefOk, {
    parseNullOk,
    parseUndefOk
  });
}

// 3.3 Internal Placeholder Injection
{
  const injectionCv = `ALEX TEST
alex@example.com

PROFESSIONAL SUMMARY
Managed ___STRONG_TAG_0___ and ___STRONG_TAG_9999___ with 50% increase.

PROFESSIONAL EXPERIENCE
Lead Engineer — Acme Corp    2020 – Present
• Implemented ___STRONG_TAG_1___ feature yielding 40% growth.
• Refactored system reducing turnaround time by 35% with ___STRONG_TAG_0___.
`;

  const parsed = parseResumeDocument(injectionCv);
  const html = renderExecutiveResumeHtml(parsed);

  const containsLiteralUndefined = html.includes('undefined');
  report('Robustness: Token Injection', 'Does not inject literal "undefined" string when input contains internal placeholders', !containsLiteralUndefined, {
    reason: containsLiteralUndefined ? 'Found literal "undefined" in generated HTML due to placeholderMap out-of-bounds!' : null,
    htmlSnippet: html.slice(html.indexOf('<section>'), html.indexOf('</section>') + 200)
  });
}

// 3.4 Chaotic Punctuation & Binary / Control Characters
{
  const chaotic = `!@#$%^&*()_+=-` + '`~[]\\{}|;\':",./<>?\n' +
    '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f' +
    'Line with NULL byte \x00 in middle\n' +
    '\\\\\\\\////^^^^&&&&****\n' +
    'PROFESSIONAL SUMMARY\n' +
    'Testing crazy characters: ﷽ and ဪ and \u200B\u200C\u200D\uFEFF invisible spaces.\n' +
    'EXPERIENCE\n' +
    'Role ??? — Company !!!    2020 – 2024\n' +
    '• Bullet with *unmatched **bold ***formatting and >>> quotes.\n';

  let crashed = false;
  let html = '';
  try {
    const doc = parseResumeDocument(chaotic);
    html = renderExecutiveResumeHtml(doc);
  } catch (err) {
    crashed = true;
  }

  report('Chaotic: Punctuation & Control Chars', 'Handles binary chars, zero-width spaces, and chaotic punctuation without crashing', !crashed && html.length > 0, {
    crashed,
    htmlLength: html.length
  });
}

// 3.5 Extremely Long Single Line (50,000 characters)
{
  const longLine = 'WORD '.repeat(10000);
  const longCv = `LONG CANDIDATE\nlong@example.com\n\nPROFESSIONAL SUMMARY\n${longLine}\n\nEXPERIENCE\nDev — Corp    2020 – 2024\n• ${longLine}\n`;

  const start = performance.now();
  let crashed = false;
  let html = '';
  try {
    const doc = parseResumeDocument(longCv);
    html = renderExecutiveResumeHtml(doc);
  } catch (err) {
    crashed = true;
  }
  const duration = performance.now() - start;

  report('Extreme: 50,000 char line', `Processes massive 50K-character single line without crashing or hanging (${duration.toFixed(1)}ms)`, !crashed && duration < 500, {
    durationMs: duration,
    crashed
  });
}


// ============================================================================
// SUITE 4: ReDoS & Catastrophic Backtracking Stress
// ============================================================================
console.log('\n--- SUITE 4: ReDoS & Catastrophic Backtracking Stress ---');

// 4.1 Turnaround regex backtracking attack
{
  // highlightMetrics: /\b(reducing\s+[^.<]*?\s+by\s+\d+(?:\.\d+)?%)(?!\w)/gi
  // Attack string: "reducing " + "a ".repeat(3000) (no "by", forces backtrack)
  const attackStr = 'reducing ' + 'token '.repeat(2000);
  const start = performance.now();
  const res = formatExecutiveBullet(attackStr);
  const duration = performance.now() - start;

  report('ReDoS: highlightMetrics', `Turnaround reduction regex survives non-matching prefix attack (${duration.toFixed(1)}ms)`, duration < 100, {
    durationMs: duration
  });
}

// 4.2 DATE_REGEX backtracking attack
{
  // DATE_REGEX: /(?:(?:Jan|...)[a-z]*\.?\s+)?\b(19|20)\d{2}\b.../
  const attackDate = 'Jan' + 'u'.repeat(2000) + ' 2020 – Present';
  const start = performance.now();
  const doc = parseResumeDocument(`TEST NAME\nRole — Company    ${attackDate}\n• Bullet`);
  const duration = performance.now() - start;

  report('ReDoS: DATE_REGEX', `Date regex survives repeated letters attack (${duration.toFixed(1)}ms)`, duration < 100, {
    durationMs: duration
  });
}

// 4.3 Section Heading Regex Stress
{
  const longHeading = 'PROFESSIONAL ' + 'VERY '.repeat(500) + 'EXPERIENCE';
  const start = performance.now();
  const doc = parseResumeDocument(`TEST NAME\n${longHeading}\nRole — Company    2020 – 2024\n• Bullet`);
  const duration = performance.now() - start;

  report('ReDoS: matchSectionHeading', `Section heading matcher bounded length protection (${duration.toFixed(1)}ms)`, duration < 50, {
    durationMs: duration
  });
}


// ============================================================================
// SUITE 5: Massive Payload & Scale Stress (50+ bullets, 20+ skills, 10+ jobs)
// ============================================================================
console.log('\n--- SUITE 5: Massive Payload & Scale Stress ---');

{
  const jobsCount = 12;
  const bulletsPerJob = 5; // total 60 bullets
  const skillCategoriesCount = 22;
  const educationCount = 8;
  const projectsCount = 8;

  const lines = [];
  lines.push('MASSIVE EXECUTIVE CANDIDATE');
  lines.push('VP of Global Engineering & Enterprise Architecture | Target: Microsoft');
  lines.push('San Francisco, CA  •  +1 (555) 987-6543  •  vp.eng@massive.example.com  •  linkedin.com/in/massive-vp  •  github.com/massive-vp');
  lines.push('');
  lines.push('PROFESSIONAL SUMMARY');
  lines.push('Visionary Engineering Executive with 18+ years of experience leading globally distributed engineering teams of 250+ developers. Architected enterprise cloud systems delivering 99.999% reliability across $50M+ annual recurring revenue streams. Spearheaded modern DevOps transformations reducing deployment cycle times by 65%.');
  lines.push('');

  lines.push('TECHNICAL PROFICIENCIES & SKILLS');
  for (let i = 1; i <= skillCategoriesCount; i++) {
    lines.push(`Category ${i} Architecture: Skill Alpha ${i}, Skill Beta ${i}, Microservices ${i}, Distributed Cache ${i}, Cloud Native ${i}`);
  }
  lines.push('');

  lines.push('PROFESSIONAL EXPERIENCE');
  for (let j = 1; j <= jobsCount; j++) {
    const yearStart = 2024 - j;
    const yearEnd = j === 1 ? 'Present' : (2025 - j).toString();
    lines.push(`Senior Director of Systems ${j} — Enterprise Global Scale Corp ${j}    ${yearStart} – ${yearEnd} | Seattle, WA (Remote)`);
    for (let b = 1; b <= bulletsPerJob; b++) {
      const metric = (b * 10 + j) % 90 + 10;
      lines.push(`• Spearheaded enterprise modernization program ${j}.${b}, increasing throughput by ${metric}% and saving $${j}.5M annually.`);
    }
    lines.push('');
  }

  lines.push('FEATURED PROJECTS');
  for (let p = 1; p <= projectsCount; p++) {
    lines.push(`• Global Platform ${p} (https://platform-${p}.massive.org): Cloud-native event-driven distributed system processing 50M requests daily.`);
  }
  lines.push('');

  lines.push('EDUCATION & CERTIFICATIONS');
  for (let e = 1; e <= educationCount; e++) {
    lines.push(`Master of Science in Distributed Systems ${e} — Stanford University School of Engineering (${2020 - e})`);
  }

  const massiveCvText = lines.join('\n');

  // Benchmark parsing
  const parseStart = performance.now();
  const parsed = parseResumeDocument(massiveCvText);
  const parseDuration = performance.now() - parseStart;

  // Benchmark HTML rendering
  const renderStart = performance.now();
  const html = renderExecutiveResumeHtml(parsed);
  const renderDuration = performance.now() - renderStart;

  const totalDuration = parseDuration + renderDuration;

  // Assertions on parsed structure
  const parsedJobsOk = parsed.experience.length === jobsCount;
  const totalBullets = parsed.experience.reduce((sum, j) => sum + j.bullets.length, 0);
  const parsedBulletsOk = totalBullets === jobsCount * bulletsPerJob;
  const parsedSkillsOk = parsed.skills.length === skillCategoriesCount;
  const parsedEduOk = parsed.education.length === educationCount;
  const parsedProjOk = (parsed.projects?.length || 0) === projectsCount;

  report('Scale: Parser Extraction', `Extracts all ${jobsCount} jobs, ${totalBullets} bullets, ${skillCategoriesCount} skill categories accurately`,
    parsedJobsOk && parsedBulletsOk && parsedSkillsOk && parsedEduOk && parsedProjOk,
    {
      expectedJobs: jobsCount, gotJobs: parsed.experience.length,
      expectedBullets: jobsCount * bulletsPerJob, gotBullets: totalBullets,
      expectedSkills: skillCategoriesCount, gotSkills: parsed.skills.length,
      expectedEdu: educationCount, gotEdu: parsed.education.length,
      expectedProj: projectsCount, gotProj: parsed.projects?.length
    }
  );

  // Performance threshold: < 50ms for massive resume
  const perfOk = totalDuration < 100;
  report('Scale: Performance', `Parses and renders massive resume in ${totalDuration.toFixed(1)}ms (parse: ${parseDuration.toFixed(1)}ms, render: ${renderDuration.toFixed(1)}ms, budget: <100ms)`,
    perfOk,
    { parseDurationMs: parseDuration, renderDurationMs: renderDuration, totalDurationMs: totalDuration }
  );

  // Verify HTML completeness
  const htmlHasAllJobs = html.includes(`Enterprise Global Scale Corp ${jobsCount}`);
  const htmlHasLastSkill = html.includes(`Category ${skillCategoriesCount}`);
  const htmlHasLastEdu = html.includes(`Distributed Systems ${educationCount}`);

  report('Scale: HTML Output Completeness', 'Rendered HTML contains all generated sections without truncation',
    htmlHasAllJobs && htmlHasLastSkill && htmlHasLastEdu,
    { htmlLength: html.length, htmlHasAllJobs, htmlHasLastSkill, htmlHasLastEdu }
  );
}


// ============================================================================
// FINAL SUMMARY & FINDINGS AUDIT
// ============================================================================
console.log('\n================================================================');
console.log(`STRESS TEST COMPLETE: ${passCount} passed, ${failCount} failed (total ${suiteCount} tests)`);
console.log('================================================================\n');

if (findings.length > 0) {
  console.log('CRITICAL / HIGH FINDINGS IDENTIFIED:');
  findings.forEach((f, idx) => {
    console.log(`\n[Finding #${idx + 1}] Suite: ${f.suite} | Test: ${f.testName}`);
    console.log(`Reason: ${f.reason}`);
  });
}
