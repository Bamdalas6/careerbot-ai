/**
 * Milestone 1 Verification Suite: Executive Resume Parser & HTML Template Engine
 */
import assert from 'node:assert/strict';
import {
  parseResumeDocument,
  renderExecutiveResumeHtml,
  renderExecutiveResumeBody,
  formatExecutiveBullet,
  formatExecutiveSummary,
  escapeHtml
} from '../src/lib/resume-template.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('\n--- MILESTONE 1: EXECUTIVE RESUME TEMPLATE & PARSER TESTS ---\n');

// ---------------------------------------------------------------------------
// TEST 1: Parsing Reference Executive CV (Ayodele Babalola)
// ---------------------------------------------------------------------------
const REFERENCE_CV = `AYODELE BABALOLA
Senior Product Designer | Target: Stripe
Lagos, Nigeria (Remote Worldwide)  •  +234 907 561 6876  •  hello@bamdalas.com  •  bamdalas.com  •  linkedin.com/in/bamdalas

PROFESSIONAL SUMMARY
Results-driven **Senior Product Designer** with over 6+ years of experience and 36+ shipped multinational projects crafting pixel-perfect interface aesthetics, scalable component libraries, and interactive design systems for Stripe. Expert in building scalable Figma design systems, leading user-centric research, and transforming complex technical workflows into high-converting user experiences tailored for Stripe.

CORE COMPETENCIES & TECHNICAL SKILLS
Target Alignment: High-Fidelity Visual Design, Figma Design Systems & Micro-Interactions, Typography, Grid Systems, Responsive Component Libraries
Product & UX Research: Usability Testing, User Interviews, Information Architecture, Journey Mapping, Product Strategy, Conversion Optimization
Design Craft & Tools: Figma, FigJam, Adobe Creative Cloud, Design Tokens, Auto-Layout, Component Libraries, Notion, Jira, Slack

PROFESSIONAL EXPERIENCE
Digital & Product Designer — SLEC Africa | AG Advisory | WINGS    2025 – Present | Lagos, Nigeria (Remote)
• Spearheaded end-to-end UI/UX and digital visual design across enterprise web platforms and multi-channel advisory initiatives.
• Formulated data-driven digital content frameworks and interactive web assets, increasing stakeholder engagement and reach by 40%.
• Transformed complex regulatory and advisory data into clear, intuitive infographics, dashboards, and interactive digital interfaces.
• Maintained design consistency and WCAG AA accessibility standards across all customer-facing digital touchpoints.

Product Designer — Housebank    2024 – 2025
Abuja, Nigeria (Remote)
• Conducted extensive qualitative user research and empathy interviews, defining core user friction points in urban rental discovery.
• Architected responsive user flows, wireframes, and high-fidelity interactive prototypes in Figma for web and mobile dashboards.
• Built and scaled a modular Figma design system with 60+ reusable components and design tokens, reducing feature turnaround time by 35%.
• Designed and optimized key conversion workflows including verified property listings, map-based filtering, and flexible payment plans.

Product Manager & Design Lead — SheltaMe    2023 – 2024
Lagos, Nigeria (Remote)
• Directed the end-to-end product design and feature roadmap for property management and rental marketplace applications.
• Led structured sprint rituals between design and software engineering teams, delivering major rental listing modules 2 weeks ahead of schedule.

EDUCATION & CERTIFICATIONS
Google UX Design Professional Certificate (6 Specializations) — Coursera (2023)
Business Administration and Management — Hardes Business School (2024)
Higher National Diploma (Civil Engineering) — The Polytechnic Ibadan (2022 – 2024)`;

test('parseResumeDocument extracts all fields accurately from reference CV', () => {
  const doc = parseResumeDocument(REFERENCE_CV);

  assert.equal(doc.name, 'AYODELE BABALOLA');
  assert.equal(doc.targetSubtitle, 'Senior Product Designer | Target: Stripe');

  // Check contact
  assert.ok(doc.contact.length >= 4, 'Should extract at least 4 contact items');
  const emailChip = doc.contact.find((c) => c.text === 'hello@bamdalas.com');
  assert.ok(emailChip, 'Email chip extracted');
  assert.equal(emailChip.href, 'mailto:hello@bamdalas.com');
  assert.equal(emailChip.icon, '📧');

  const phoneChip = doc.contact.find((c) => c.text.includes('907 561 6876'));
  assert.ok(phoneChip, 'Phone chip extracted');
  assert.ok(phoneChip.href?.startsWith('tel:'));
  assert.equal(phoneChip.icon, '📞');

  const linkedinChip = doc.contact.find((c) => c.text.includes('linkedin.com'));
  assert.ok(linkedinChip, 'LinkedIn chip extracted');
  assert.ok(linkedinChip.href?.includes('https://linkedin.com'));
  assert.equal(linkedinChip.icon, '🔗');

  // Check summary
  assert.ok(doc.summary, 'Summary extracted');
  assert.ok(doc.summary.includes('Senior Product Designer'));
  assert.ok(doc.summary.includes('Figma design systems'));

  // Check skills
  assert.equal(doc.skills.length, 3, 'Should have 3 skill categories');
  assert.equal(doc.skills[0].category, 'Target Alignment');
  assert.ok(doc.skills[0].items.includes('High-Fidelity Visual Design'));
  assert.equal(doc.skills[1].category, 'Product & UX Research');
  assert.equal(doc.skills[2].category, 'Design Craft & Tools');

  // Check experience
  assert.equal(doc.experience.length, 3, 'Should have 3 experience entries');
  const job1 = doc.experience[0];
  assert.equal(job1.role, 'Digital & Product Designer');
  assert.ok(job1.company.includes('SLEC Africa'));
  assert.equal(job1.dates, '2025 – Present');
  assert.ok(job1.location?.includes('Lagos, Nigeria'));
  assert.equal(job1.bullets.length, 4, 'Job 1 has 4 bullets');
  assert.ok(job1.bullets[1].includes('reach by 40%'));

  const job2 = doc.experience[1];
  assert.equal(job2.role, 'Product Designer');
  assert.equal(job2.company, 'Housebank');
  assert.equal(job2.dates, '2024 – 2025');
  assert.ok(job2.location?.includes('Abuja, Nigeria'));
  assert.equal(job2.bullets.length, 4, 'Job 2 has 4 bullets');

  // Check education
  assert.equal(doc.education.length, 3, 'Should have 3 education credentials');
  assert.ok(doc.education[0].degree.includes('Google UX Design'));
  assert.equal(doc.education[0].institution, 'Coursera');
  assert.equal(doc.education[0].year, '2023');
});

// ---------------------------------------------------------------------------
// TEST 2: Executive HTML Styling & Visual Design Token Fidelity
// ---------------------------------------------------------------------------
test('renderExecutiveResumeHtml matches cv-tailor.mjs CSS tokens and structure', () => {
  const html = renderExecutiveResumeHtml(REFERENCE_CV);

  // 1. Structure
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'Valid HTML doctype');
  assert.ok(html.includes('<html lang="en">'), 'html lang="en" tag');
  assert.ok(html.includes('<title>AYODELE BABALOLA - Senior Product Designer | Target: Stripe Resume</title>'));
  assert.ok(html.includes('<div class="resume-container">'), 'resume-container present');
  assert.ok(html.includes('<header>'), 'header present');
  assert.ok(html.includes('<h1>AYODELE BABALOLA</h1>'), 'h1 uppercase name');
  assert.ok(html.includes('<div class="title-sub">Senior Product Designer | Target: Stripe</div>'), 'title-sub present');
  assert.ok(html.includes('<div class="contact-bar">'), 'contact-bar present');

  // 2. CSS Tokens Check (Verifying cv-tailor.mjs exact specs)
  assert.ok(
    html.includes("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"),
    'Inter font @import present'
  );
  assert.ok(
    html.includes("'Inter', -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"),
    'Inter font stack present'
  );
  assert.ok(html.includes('color: #111827;'), 'Primary text color #111827 present');
  assert.ok(html.includes('line-height: 1.45;'), 'Base line-height 1.45 present');
  assert.ok(html.includes('font-size: 13px;'), 'Base font size 13px present');
  assert.ok(html.includes('max-width: 850px;'), 'Container max-width 850px present');
  assert.ok(html.includes('padding: 32px 40px;'), 'Container screen padding 32px 40px present');
  assert.ok(html.includes('border-bottom: 2px solid #111827;'), 'Header solid 2px accent underline present');
  assert.ok(html.includes('letter-spacing: -0.02em;'), 'Name h1 -0.02em tracking present');
  assert.ok(html.includes('font-size: 24px;'), 'Name h1 24px font size present');
  assert.ok(html.includes('color: #2563eb;'), 'Subtitle blue color #2563eb present');
  assert.ok(html.includes('border-bottom: 1px solid #e5e7eb;'), 'Section divider 1px hairline border present');
  assert.ok(html.includes('letter-spacing: 0.05em;'), 'Section h2 0.05em tracking present');
  assert.ok(html.includes('grid-template-columns: 1fr;'), 'Skills 1fr grid present');
  assert.ok(html.includes('font-size: 12.5px;'), 'Skills/bullets 12.5px font size present');
  assert.ok(html.includes('justify-content: space-between;'), 'Experience two-column header present');
  assert.ok(html.includes('color: #6b7280;'), 'Job meta color #6b7280 present');
  assert.ok(html.includes('margin-left: 18px;'), 'Bullet indent 18px present');
  assert.ok(html.includes('@page {'), '@page rule present');
  assert.ok(html.includes('margin: 12mm 14mm 12mm 14mm;'), '@page 12mm 14mm margins present');
  assert.ok(html.includes('@media print {'), '@media print present');

  // 3. Bullets and Highlighted Metrics
  assert.ok(html.includes('<strong>40%</strong>'), 'Quantified metric 40% wrapped in <strong>');
  assert.ok(html.includes('<strong>reducing feature turnaround time by 35%</strong>'), 'Turnaround metric wrapped');
  assert.ok(html.includes('<strong>60+ reusable components</strong>'), 'Metric count 60+ reusable components wrapped');
  assert.ok(html.includes('<strong>Spearheaded</strong>'), 'Lead-in action verb Spearheaded bolded');
  assert.ok(html.includes('<strong>Architected</strong>'), 'Lead-in action verb Architected bolded');
  assert.ok(html.includes('<strong>2 weeks ahead of schedule</strong>'), 'Turnaround metric ahead of schedule wrapped');

  // 4. Contact chips separation
  assert.ok(html.includes('<span>•</span>'), 'Bullet separators present between chips');
  assert.ok(!html.includes('<span>•</span>\n      </div>'), 'No dangling bullet separator at end of contact bar');
});

// ---------------------------------------------------------------------------
// TEST 3: Featured Projects & Two-Column Education (Abdulhammed Fuad)
// ---------------------------------------------------------------------------
const FUAD_CV = `ABDULHAMMED FUAD OPEYEMI
Lead Full-Stack Software Engineer
Lagos, Nigeria  •  +234 810 123 4567  •  fuad@example.com  •  github.com/fuad  •  fuad.dev

PROFESSIONAL SUMMARY
Results-driven Lead Full-Stack Software Engineer with 7+ years of experience architecting resilient multi-tenant SaaS platforms and cloud microservices.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript (ES6+), Python, PHP, Dart, SQL
Frameworks & Libraries: ReactJS, Next.js, Flutter, Node.js, Express, Tailwind CSS
Database & Cloud: PostgreSQL, MySQL, Redis, AWS (S3, EC2), Docker, Git

WORK EXPERIENCE
Senior Full-Stack Engineer — Paystack Financial Services    Nov 2021 – Present | Lagos, Nigeria
• Engineered automated recurring payment gateway integrations processing over $2.5M in monthly transactions with 99.9% uptime.
• Architected modular micro-frontend components using React and TypeScript, accelerating feature rollouts by 2x.

FEATURED PROJECTS
• Brainiark Shop (shop.brainiark.com): Multi-tenant SaaS platform enabling merchants to launch online stores with multi-tenant database isolation.
• Al-Arafah Cooperative Financial Platform (https://al-arafah.org): Financial management system with loan tracking and automated savings calculations.

EDUCATION & CERTIFICATIONS
Higher National Diploma (HND) in Computer Science — Upper Credit — The Polytechnic Ibadan    2021 – 2023
National Diploma (ND) in Computer Science — The Polytechnic Ibadan    2016 – 2018`;

test('parseResumeDocument handles featured projects and 2-column education', () => {
  const doc = parseResumeDocument(FUAD_CV);

  assert.equal(doc.name, 'ABDULHAMMED FUAD OPEYEMI');
  assert.equal(doc.targetSubtitle, 'Lead Full-Stack Software Engineer');
  assert.ok(doc.projects && doc.projects.length === 2, 'Extracts 2 featured projects');

  const p1 = doc.projects[0];
  assert.equal(p1.name, 'Brainiark Shop');
  assert.equal(p1.link, 'shop.brainiark.com');
  assert.ok(p1.description.includes('Multi-tenant SaaS'));

  const p2 = doc.projects[1];
  assert.equal(p2.name, 'Al-Arafah Cooperative Financial Platform');
  assert.equal(p2.link, 'https://al-arafah.org');

  assert.equal(doc.education.length, 2);
  assert.ok(doc.education[0].degree.includes('Higher National Diploma'));
  assert.equal(doc.education[0].year, '2021 – 2023');

  const html = renderExecutiveResumeHtml(doc);
  assert.ok(html.includes('<h2>Featured Projects</h2>'));
  assert.ok(html.includes('href="https://shop.brainiark.com"'));
  assert.ok(html.includes('href="https://al-arafah.org"'));
  assert.ok(html.includes('<strong>$2.5M</strong>'));
  assert.ok(html.includes('<strong>99.9%</strong>'));
  assert.ok(html.includes('<strong>2x</strong>'));
});

// ---------------------------------------------------------------------------
// TEST 4: renderExecutiveResumeBody (Container-Only for In-App React Preview)
// ---------------------------------------------------------------------------
test('renderExecutiveResumeBody produces container without html/head wrapper', () => {
  const body = renderExecutiveResumeBody(REFERENCE_CV);

  assert.ok(body.includes('<div class="resume-container">'));
  assert.ok(body.includes('<h1>AYODELE BABALOLA</h1>'));
  assert.ok(!body.includes('<!DOCTYPE html>'));
  assert.ok(!body.includes('<head>'));
  assert.ok(!body.includes('</style>'));
});

// ---------------------------------------------------------------------------
// TEST 5: Edge Cases & Security / XSS Sanitization
// ---------------------------------------------------------------------------
test('XSS sanitization escapes script tags and attributes safely', () => {
  const xssCV = `<script>alert("hacked")</script>
Specialist & "Lead" <Designer>
bad@xss.com" onclick="alert(1)  •  +1 555-0199

PROFESSIONAL SUMMARY
Testing <img src=x onerror=alert(1)> and & symbols.

CORE SKILLS
Skills & Tools: C++ & C#, <React> & Node.js

EXPERIENCE
Engineer <Senior> — Tech "Corp" & Co    2020 – Present
• Spearheaded migration from C++ to Rust with 50% faster build & <script>doBad()</script>.`;

  const doc = parseResumeDocument(xssCV);
  const html = renderExecutiveResumeHtml(doc);

  assert.ok(!html.includes('<script>'), 'No unescaped <script> tag in HTML');
  assert.ok(!html.includes('<img src=x'), 'No unescaped <img> onerror tag in HTML');
  assert.ok(html.includes('&lt;script&gt;'), 'Escaped <script> tag present');
  assert.ok(html.includes('&amp;'), 'Escaped ampersand present');
  assert.ok(html.includes('<strong>50%</strong>'), 'Valid metric highlighted even around special characters');
});

// ---------------------------------------------------------------------------
// TEST 6: Formatting helpers (formatExecutiveBullet, formatExecutiveSummary)
// ---------------------------------------------------------------------------
test('formatExecutiveBullet correctly handles metrics, markdown, and lead-ins', () => {
  // Case 1: Markdown bold + lead-in + percentage
  const b1 = formatExecutiveBullet('• Spearheaded **new design system**, increasing reach by 45%.');
  assert.equal(
    b1,
    '<strong>Spearheaded</strong> <strong>new design system</strong>, increasing reach by <strong>45%</strong>.'
  );

  // Case 2: Action verb lead-in auto-detection
  const b2 = formatExecutiveBullet('Architected scalable distributed backend servicing 100K users.');
  assert.ok(b2.startsWith('<strong>Architected</strong>'));

  // Case 3: Currencies and multipliers
  const b3 = formatExecutiveBullet('Generated $1.2M in annual revenue while boosting conversion by 3x.');
  assert.ok(b3.includes('<strong>$1.2M</strong>'));
  assert.ok(b3.includes('<strong>3x</strong>'));

  // Case 4: Naira sign handling
  const b4 = formatExecutiveBullet('Saved ₦25M in operational costs across 36+ shipped projects.');
  assert.ok(b4.includes('<strong>₦25M</strong>'));
  assert.ok(b4.includes('<strong>36+ shipped projects</strong>'));
});

// ---------------------------------------------------------------------------
// TEST 7: Resumes starting with leading blank lines & no target subtitle
// ---------------------------------------------------------------------------
test('parseResumeDocument gracefully handles leading whitespace and minimal headers', () => {
  const minimalCV = `

  
SARAH CONNOR
Los Angeles, CA  •  sarah@sky.net  •  +1 (555) 019-2834

SUMMARY
Experienced systems defense specialist.

SKILLS
Rust, C++, Cybersecurity, Defensive Architecture

EXPERIENCE
Security Lead — Cyberdyne Systems    2021 – Present
• Directed defensive operations against automated infiltration attacks.`;

  const doc = parseResumeDocument(minimalCV);
  assert.equal(doc.name, 'SARAH CONNOR');
  assert.equal(doc.targetSubtitle, undefined);
  assert.equal(doc.contact.length, 3);
  assert.equal(doc.skills.length, 1);
  assert.equal(doc.skills[0].category, 'Core Competencies');
  assert.ok(doc.skills[0].items.includes('Rust, C++'));
  assert.equal(doc.experience.length, 1);
  assert.equal(doc.experience[0].company, 'Cyberdyne Systems');
});

// ---------------------------------------------------------------------------
// TEST 8: Markdown section headers (### Section) & Title-Case headers
// ---------------------------------------------------------------------------
test('parseResumeDocument parses markdown headers and title-case variants', () => {
  const mdCV = `JOHN DOE
Cloud Solutions Architect
john@example.com  •  New York, NY

### Professional Summary
Proven cloud architect with 10+ years designing enterprise AWS architectures.

### Technical Proficiencies
Cloud Services: AWS (S3, Lambda, CloudFront), GCP
Languages: Python, Go, Bash

### Work History
Principal Cloud Architect — Amazon Web Services    2020 – Present
• Accelerated cloud migrations for Fortune 500 enterprises.

### Academic Qualifications
Master of Science in Computer Science — Columbia University (2018)`;

  const doc = parseResumeDocument(mdCV);
  assert.equal(doc.name, 'JOHN DOE');
  assert.equal(doc.targetSubtitle, 'Cloud Solutions Architect');
  assert.ok(doc.summary?.includes('Proven cloud architect'));
  assert.equal(doc.skills.length, 2);
  assert.equal(doc.skills[0].category, 'Cloud Services');
  assert.equal(doc.experience.length, 1);
  assert.equal(doc.experience[0].role, 'Principal Cloud Architect');
  assert.equal(doc.education.length, 1);
  assert.equal(doc.education[0].year, '2018');
});

// ---------------------------------------------------------------------------
// TEST 9: renderExecutiveResumeHtml with raw string & missing subtitle
// ---------------------------------------------------------------------------
test('renderExecutiveResumeHtml handles raw text input directly & omits empty subtitle', () => {
  const rawText = `ALEX MORGAN
alex@example.com  •  San Francisco, CA

PROFESSIONAL SUMMARY
Seasoned full stack engineer.

CORE COMPETENCIES & TECHNICAL SKILLS
Core Skills: TypeScript, React, Next.js, Node.js

PROFESSIONAL EXPERIENCE
Senior Engineer — Vercel    2022 – Present
• Built edge rendering infrastructure improving TTFB by 40%.`;

  const html = renderExecutiveResumeHtml(rawText);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<h1>ALEX MORGAN</h1>'));
  assert.ok(!html.includes('class="title-sub"'), 'No title-sub div when subtitle is omitted');
  assert.ok(!html.includes('undefined'));
  assert.ok(html.includes('<strong>Built</strong>'));
  assert.ok(html.includes('<strong>40%</strong>'));
});

// ---------------------------------------------------------------------------
// TEST 10: Inline Education Parsing & URL Sanitization
// ---------------------------------------------------------------------------
test('parseResumeDocument handles inline education and varied link formats', () => {
  const inlineCv = `CHRIS PRATT
Lead Designer
chris@bamdalas.com  •  bamdalas.com  •  linkedin.com/in/cpratt  •  github.com/cpratt

EDUCATION & CERTIFICATIONS
Google UX Certificate — Coursera (2023) • B.Sc Design — Stanford University (2020)`;

  const doc = parseResumeDocument(inlineCv);
  assert.equal(doc.contact.length, 4);
  const webChip = doc.contact.find((c) => c.text === 'bamdalas.com');
  assert.ok(webChip?.href?.startsWith('https://bamdalas.com'));

  const ghChip = doc.contact.find((c) => c.text.includes('github.com'));
  assert.ok(ghChip?.href?.startsWith('https://github.com'));

  assert.equal(doc.education.length, 2, 'Extracts 2 inline education credentials');
  assert.ok(doc.education[0].degree.includes('Google UX Certificate'));
  assert.equal(doc.education[0].year, '2023');
  assert.ok(doc.education[1].degree.includes('B.Sc Design'));
  assert.equal(doc.education[1].year, '2020');
});

// ---------------------------------------------------------------------------
// TEST 11: Print and Container Styling Verification
// ---------------------------------------------------------------------------
test('renderExecutiveResumeHtml verifies complete print and container CSS rules', () => {
  const html = renderExecutiveResumeHtml(REFERENCE_CV);

  // Print rules
  assert.ok(html.includes('@page {'));
  assert.ok(html.includes('size: letter;'));
  assert.ok(html.includes('margin: 12mm 14mm 12mm 14mm;'));
  assert.ok(html.includes('@media print {'));
  assert.ok(html.includes('body {'));
  assert.ok(html.includes('.resume-container {'));
  assert.ok(html.includes('box-shadow: none;'));
  assert.ok(html.includes('max-width: 100%;'));

  // Screen container rules
  assert.ok(html.includes('.resume-container {'));
  assert.ok(html.includes('max-width: 850px;'));
  assert.ok(html.includes('padding: 32px 40px;'));
  assert.ok(html.includes('margin: 0 auto;'));

  // Two-column experience header rules
  assert.ok(html.includes('.job-header {'));
  assert.ok(html.includes('justify-content: space-between;'));
  assert.ok(html.includes('align-items: baseline;'));
  assert.ok(html.includes('.job-title {'));
  assert.ok(html.includes('font-size: 13px;'));
  assert.ok(html.includes('font-weight: 700;'));
  assert.ok(html.includes('.job-meta {'));
  assert.ok(html.includes('font-size: 12px;'));
  assert.ok(html.includes('color: #6b7280;'));
});

// ---------------------------------------------------------------------------
// TEST 12: Stored XSS inside <strong> in formatExecutiveBullet & formatExecutiveSummary
// ---------------------------------------------------------------------------
test('formatExecutiveBullet and formatExecutiveSummary sanitize inner content of <strong> tags', () => {
  const bulletXss = '• Led team with <strong><script>alert("bullet-xss")</script></strong> tools.';
  const resBullet = formatExecutiveBullet(bulletXss);
  assert.ok(!resBullet.includes('<script>'), 'Bullet output must not contain unescaped <script>');
  assert.ok(resBullet.includes('<strong>&lt;script&gt;alert(&quot;bullet-xss&quot;)&lt;/script&gt;</strong>'), 'Inner script safely escaped');

  const summaryXss = 'Executive with <strong><img src=x onerror=alert(1)></strong> background.';
  const resSummary = formatExecutiveSummary(summaryXss);
  assert.ok(!resSummary.includes('<img'), 'Summary output must not contain unescaped <img>');
  assert.ok(resSummary.includes('<strong>&lt;img src=x onerror=alert(1)&gt;</strong>'), 'Inner img safely escaped');
});

// ---------------------------------------------------------------------------
// TEST 13: XSS escaping for chip.icon in renderExecutiveResumeBody
// ---------------------------------------------------------------------------
test('renderExecutiveResumeBody escapes chip.icon to prevent injection', () => {
  const doc = {
    name: 'SECURE USER',
    contact: [
      { text: 'Email', href: 'mailto:a@b.com', icon: '<img src=x onerror=alert("icon-xss")>' },
      { text: 'Phone', icon: '<script>alert("icon-script")</script>' }
    ],
    skills: [],
    experience: [],
    education: []
  };
  const body = renderExecutiveResumeBody(doc);
  assert.ok(!body.includes('<script>'), 'renderExecutiveResumeBody must escape <script> in chip.icon');
  assert.ok(!body.includes('<img src=x'), 'renderExecutiveResumeBody must escape <img> in chip.icon');
  assert.ok(body.includes('&lt;img src=x onerror=alert(&quot;icon-xss&quot;)&gt;'));
});

// ---------------------------------------------------------------------------
// TEST 14: Unicode / international name preservation
// ---------------------------------------------------------------------------
test('parseResumeDocument preserves accented Latin, African diacritics, and international names', () => {
  const names = [
    { input: 'José García\njose@example.com', expected: 'JOSÉ GARCÍA' },
    { input: 'Björn Müller\nbjorn@example.com', expected: 'BJÖRN MÜLLER' },
    { input: 'Ayọ̀délé Babálọlá\nayodele@example.com', expected: 'AYỌ̀DÉLÉ BABÁLỌLÁ' },
    { input: 'Chidịọma Nnamdi\nchidi@example.com', expected: 'CHIDỊỌMA NNAMDI' },
    { input: 'Иван Петров\nivan@example.com', expected: 'ИВАН ПЕТРОВ' }
  ];

  for (const { input, expected } of names) {
    const doc = parseResumeDocument(input);
    assert.equal(doc.name, expected, `Expected name "${expected}", got "${doc.name}"`);
  }
});

// ---------------------------------------------------------------------------
// TEST 15: HTML ingestion pre-processing
// ---------------------------------------------------------------------------
test('parseResumeDocument parses raw HTML documents without DOCTYPE or style leakage', () => {
  const htmlInput = `<!DOCTYPE html>
<html lang="en">
<head>
  <style>body { font-size: 14px; }</style>
  <script>console.log('strip me');</script>
</head>
<body>
  <div class="resume-container">
    <header>
      <h1>Ada Lovelace</h1>
      <div class="title-sub">Pioneer Computing Engineer</div>
      <div class="contact-bar">
        <span>ada@lovelace.org</span>
        <span>•</span>
        <span>London, UK</span>
      </div>
    </header>
    <section>
      <h2>Core Technical Skills</h2>
      <div class="skill-row"><strong>Algorithms:</strong> Analytical Engine, Calculus</div>
    </section>
    <section>
      <h2>Professional Experience</h2>
      <div class="job-entry">
        <div class="job-header">
          <span class="job-title">Chief Mathematician</span>
          <span class="job-meta">1842 – 1852</span>
        </div>
        <ul>
          <li>Created world first computer algorithm.</li>
        </ul>
      </div>
    </section>
  </div>
</body>
</html>`;

  const doc = parseResumeDocument(htmlInput);
  assert.equal(doc.name, 'ADA LOVELACE');
  assert.equal(doc.targetSubtitle, 'Pioneer Computing Engineer');
  assert.ok(doc.skills.length >= 1, 'Skills extracted');
  assert.equal(doc.skills[0].category, 'Algorithms');
  assert.ok(doc.experience.length >= 1, 'Experience extracted');
  assert.equal(doc.experience[0].role, 'Chief Mathematician');
  assert.equal(doc.experience[0].dates, '1842 – 1852');
  assert.equal(doc.experience[0].bullets.length, 1);
});

// ---------------------------------------------------------------------------
// TEST 16: Markdown bullet asterisk stripping preserving **bold**
// ---------------------------------------------------------------------------
test('formatExecutiveBullet does not strip asterisk from leading markdown **bold**', () => {
  const bullet = '**Built scalable payment gateway** processing $5M monthly transactions.';
  const formatted = formatExecutiveBullet(bullet);
  assert.ok(!formatted.startsWith('*'), 'Must not leave dangling single asterisk');
  assert.ok(formatted.startsWith('<strong>Built scalable payment gateway</strong>'), 'Must bold the markdown leading phrase');
  assert.ok(formatted.includes('<strong>$5M</strong>'), 'Must highlight metric');
});

// ---------------------------------------------------------------------------
// TEST 17: Compound skills headings regex
// ---------------------------------------------------------------------------
test('parseResumeDocument recognizes compound skills headers like "Core Technical Skills"', () => {
  const cv = `MARIE CURIE
Research Scientist
marie@rad.org

CORE TECHNICAL SKILLS
Radiochemistry: Radium Isolation, Spectroscopy
Laboratory Management: Radiation Safety, Clean Room Operations

EXPERIENCE
Principal Investigator — Radium Institute    1914 – 1934
• Discovered radium and polonium.`;

  const doc = parseResumeDocument(cv);
  assert.equal(doc.skills.length, 2);
  assert.equal(doc.skills[0].category, 'Radiochemistry');
  assert.equal(doc.skills[1].category, 'Laboratory Management');
});

// ---------------------------------------------------------------------------
// TEST 18: Target subtitle length limit
// ---------------------------------------------------------------------------
test('parseResumeDocument supports descriptive target subtitles up to 160 characters', () => {
  const cv = `ABDULHAMMED FUAD
Full-Stack Backend & Flutter Mobile Engineer | PHP • Laravel • Flutter (Dart) • REST APIs
fuad@example.com`;

  const doc = parseResumeDocument(cv);
  assert.equal(
    doc.targetSubtitle,
    'Full-Stack Backend & Flutter Mobile Engineer | PHP • Laravel • Flutter (Dart) • REST APIs'
  );
});

// ---------------------------------------------------------------------------
// TEST 19: Education parenthetical details deduplication
// ---------------------------------------------------------------------------
test('renderExecutiveResumeHtml does not duplicate parenthetical education details', () => {
  const cv = `JOHN DOE
john@example.com

EDUCATION & CERTIFICATIONS
Google UX Design Certificate (6 Specializations) — Coursera (2023)
Higher National Diploma (Civil Engineering) — Polytechnic Ibadan (2022 – 2024)`;

  const doc = parseResumeDocument(cv);
  assert.equal(doc.education[0].details, '6 Specializations');
  assert.equal(doc.education[0].degree, 'Google UX Design Certificate');

  const html = renderExecutiveResumeHtml(doc);
  assert.ok(!html.includes('(6 Specializations) (6 Specializations)'), 'No duplicate (6 Specializations)');
  assert.ok(!html.includes('(Civil Engineering) (Civil Engineering)'), 'No duplicate (Civil Engineering)');
  assert.ok(html.includes('Google UX Design Certificate (6 Specializations)'));
});

// ---------------------------------------------------------------------------
// TEST 20: Multi-line experience headers & no swallowed bullets as location
// ---------------------------------------------------------------------------
test('parseResumeDocument parses multi-line job headers and does not swallow bullets as location', () => {
  const cv = `ALAN TURING
Cryptanalyst
alan@bletchley.uk

EXPERIENCE
Senior Cryptanalyst at Government Code and Cypher School
1939 – 1945 | Bletchley Park, UK
• Designed the Bombe electromechanical machine to decipher Enigma.
• Broke naval Enigma ciphers saving an estimated 14M lives.

Lead Mathematician — Acme Corp    2021 – Present
Led engineering team of 5 engineers.
Built core payment microservice.`;

  const doc = parseResumeDocument(cv);
  assert.equal(doc.experience.length, 2, 'Should parse 2 experience entries');

  const job1 = doc.experience[0];
  assert.equal(job1.role, 'Senior Cryptanalyst');
  assert.equal(job1.company, 'Government Code and Cypher School');
  assert.equal(job1.dates, '1939 – 1945');
  assert.equal(job1.location, 'Bletchley Park, UK');
  assert.equal(job1.bullets.length, 2);

  const job2 = doc.experience[1];
  assert.equal(job2.location, undefined, 'First bullet must not be swallowed into location');
  assert.equal(job2.bullets.length, 2, 'Both non-bullet lines should be preserved as bullets');
  assert.equal(job2.bullets[0], 'Led engineering team of 5 engineers.');
});

// ---------------------------------------------------------------------------
// TEST 21: Undated experience and degree fields do not fabricate dummy values
// ---------------------------------------------------------------------------
test('parseResumeDocument and renderer do not fabricate dummy dates or degrees', () => {
  const cv = `FREELANCER BOB
bob@freelance.org

EXPERIENCE
Independent Consultant — Self-Employed
• Advised multiple early-stage startups on architecture.

EDUCATION
Self-Taught`;

  const doc = parseResumeDocument(cv);
  assert.equal(doc.experience[0].dates, '', 'Dates should be empty string, not "2022 – Present"');
  assert.equal(doc.education[0].degree, 'Self-Taught');

  const html = renderExecutiveResumeHtml(doc);
  assert.ok(!html.includes('2022 – Present'), 'HTML should not contain fabricated date');
  assert.ok(!html.includes('Bachelor Degree'), 'HTML should not contain fabricated degree');
});

// ---------------------------------------------------------------------------
// Summary & Exit
// ---------------------------------------------------------------------------
console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}

