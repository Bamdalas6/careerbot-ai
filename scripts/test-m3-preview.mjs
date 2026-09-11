/**
 * Milestone 3 Verification Suite: In-App Resume Modal & Preview Synchronization
 *
 * Validates:
 * 1. ExecutiveResumePreview component exports, compilation, and SSR rendering.
 * 2. Visual CSS tokens and DOM markup fidelity matching job-application-agent cv-tailor.mjs.
 * 3. Live real-time preview synchronization when CV text is updated.
 * 4. ResumeModal.tsx segmented toggle ([ 📄 Executive Preview | ✏️ Plaintext Editor ]),
 *    expanded modal max-width (sm:max-w-4xl lg:max-w-5xl), and HTML export button.
 * 5. Standalone executive HTML export generation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  parseResumeDocument,
  renderExecutiveResumeHtml,
  renderExecutiveResumeBody,
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

async function runTests() {
  console.log('\n--- MILESTONE 3: IN-APP RESUME PREVIEW & MODAL SYNCHRONIZATION TESTS ---\n');

  // ---------------------------------------------------------------------------
  // SETUP: Dynamically compile and import ExecutiveResumePreview.tsx
  // ---------------------------------------------------------------------------
  const previewSourcePath = path.resolve('src/components/Resume/ExecutiveResumePreview.tsx');
  assert.ok(fs.existsSync(previewSourcePath), 'ExecutiveResumePreview.tsx must exist');

  const rawSource = fs.readFileSync(previewSourcePath, 'utf8');

  // Replace relative @/lib/resume-template import with file URL for Node ESM resolution
  const templateFileURL = pathToFileURL(path.resolve('src/lib/resume-template.ts')).href;
  const resolvedSource = rawSource.replace('@/lib/resume-template', templateFileURL);

  const transpileResult = ts.transpileModule(resolvedSource, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const tempModulePath = path.resolve('scripts', 'temp-test-preview.mjs');
  fs.writeFileSync(tempModulePath, transpileResult.outputText, 'utf8');

  let PreviewModule;
  try {
    PreviewModule = await import(pathToFileURL(tempModulePath).href);
  } finally {
    if (fs.existsSync(tempModulePath)) {
      fs.unlinkSync(tempModulePath);
    }
  }

  const { ExecutiveResumePreview, default: DefaultExecutiveResumePreview } = PreviewModule;

  // ---------------------------------------------------------------------------
  // TEST 1: Component Exports
  // ---------------------------------------------------------------------------
  test('ExecutiveResumePreview exports named and default components cleanly', () => {
    assert.strictEqual(typeof ExecutiveResumePreview, 'function', 'Named export must be a function component');
    assert.strictEqual(typeof DefaultExecutiveResumePreview, 'function', 'Default export must be a function component');
    assert.strictEqual(ExecutiveResumePreview, DefaultExecutiveResumePreview, 'Default export should equal named export');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Paper-Sheet Styling & Paper Container Classes
  // ---------------------------------------------------------------------------
  const SAMPLE_REFERENCE_CV = `AYODELE BABALOLA
Senior Product Designer | Target: Stripe
Lagos, Nigeria (Remote Worldwide)  •  +234 907 561 6876  •  hello@bamdalas.com  •  bamdalas.com  •  linkedin.com/in/bamdalas

PROFESSIONAL SUMMARY
Results-driven **Senior Product Designer** with over 6+ years of experience and 36+ shipped multinational projects crafting pixel-perfect interface aesthetics, scalable component libraries, and interactive design systems for Stripe. Expert in building scalable Figma design systems, leading user-centric research, and transforming complex technical workflows into high-converting user experiences.

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

EDUCATION & CERTIFICATIONS
B.Sc. Civil Engineering (Second Class Upper) — Obafemi Awolowo University    2017 – 2023
Certified UX Designer — Interaction Design Foundation    2022`;

  test('ExecutiveResumePreview renders paper-sheet container classes and executive visual styles', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ExecutiveResumePreview, { text: SAMPLE_REFERENCE_CV })
    );

    // Verify paper sheet container classes
    assert.ok(html.includes('bg-white'), 'Must contain bg-white background');
    assert.ok(html.includes('text-[#111827]'), 'Must contain base executive text color #111827');
    assert.ok(html.includes('shadow-xl'), 'Must contain shadow-xl paper elevation');
    assert.ok(html.includes('max-w-[850px]'), 'Must contain max-w-[850px] standard document container constraint');
    assert.ok(html.includes('mx-auto'), 'Must contain mx-auto centering');
    assert.ok(html.includes('rounded-lg'), 'Must contain rounded-lg paper sheet corners');

    // Verify embedded scoped styles matching cv-tailor.mjs
    assert.ok(html.includes("font-family: 'Inter'") || html.includes("font-family:'Inter'"), 'Must embed Inter font family with system fallbacks');
    assert.ok(html.includes('border-bottom: 2px solid #111827') || html.includes('border-bottom:2px solid #111827'), 'Must embed 2px solid dark accent border under header');
    assert.ok(html.includes('color: #2563eb') || html.includes('color:#2563eb'), 'Must embed primary blue subtitle color (#2563eb)');
    assert.ok(html.includes('border-bottom: 1px solid #e5e7eb') || html.includes('border-bottom:1px solid #e5e7eb'), 'Must embed 1px hairline divider for section headings');
    assert.ok(html.includes('grid-template-columns: 1fr') || html.includes('grid-template-columns:1fr'), 'Must embed single-column skills grid');
    assert.ok(html.includes('justify-content: space-between') || html.includes('justify-content:space-between'), 'Must embed two-column space-between layout for job headers');
    assert.ok(html.includes('@media print'), 'Must embed print media stylesheet');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Markup Structure & Section Elements
  // ---------------------------------------------------------------------------
  test('ExecutiveResumePreview renders complete semantic executive DOM markup', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ExecutiveResumePreview, { text: SAMPLE_REFERENCE_CV })
    );

    // Candidate Header
    assert.ok(html.includes('<h1>AYODELE BABALOLA</h1>'), 'Header must contain uppercase candidate name');
    assert.ok(
      html.includes('class="title-sub"') && html.includes('Senior Product Designer | Target: Stripe'),
      'Must contain target subtitle in .title-sub div'
    );

    // Contact Bar
    assert.ok(html.includes('class="contact-bar"'), 'Must contain .contact-bar flex row');
    assert.ok(html.includes('hello@bamdalas.com'), 'Must contain candidate email');
    assert.ok(html.includes('+234 907 561 6876'), 'Must contain candidate phone');
    assert.ok(html.includes('•'), 'Must contain bullet separators between contact elements');

    // Section Titles
    assert.ok(html.includes('<h2>Professional Summary</h2>'), 'Must render Professional Summary heading');
    assert.ok(
      html.includes('<h2>Core Competencies &amp; Technical Skills</h2>') ||
      html.includes('<h2>Core Competencies & Technical Skills</h2>'),
      'Must render Core Competencies heading'
    );
    assert.ok(html.includes('<h2>Professional Experience</h2>'), 'Must render Professional Experience heading');
    assert.ok(
      html.includes('<h2>Education &amp; Certifications</h2>') ||
      html.includes('<h2>Education & Certifications</h2>'),
      'Must render Education & Certifications heading'
    );

    // Skills Grid
    assert.ok(html.includes('class="skills-grid"'), 'Must contain .skills-grid container');
    assert.ok(html.includes('<strong>Target Alignment:</strong>'), 'Skills must bold category prefixes');

    // Experience Two-Column Header
    assert.ok(html.includes('class="job-header"'), 'Must contain .job-header two-column flex row');
    assert.ok(html.includes('class="job-title"'), 'Must contain left-aligned job title and company');
    assert.ok(html.includes('class="job-meta"'), 'Must contain right-aligned dates and location');

    // Bullet Points with Quantified Metrics
    assert.ok(html.includes('<strong>40%</strong>'), 'Must bold prominent quantified metric 40%');
    assert.ok(
      html.includes('<strong>reducing feature turnaround time by 35%</strong>') ||
      html.includes('<strong>35%</strong>'),
      'Must bold prominent quantified metric or reduction turnaround'
    );
    assert.ok(
      html.includes('<strong>Spearheaded</strong>') ||
      html.includes('<strong>Built and scaled</strong>'),
      'Must bold active verb lead-in'
    );
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Pre-parsed Document Support (doc prop)
  // ---------------------------------------------------------------------------
  test('ExecutiveResumePreview supports pre-parsed ParsedResumeDocument passed via doc prop', () => {
    const preParsed = {
      name: 'DR. ELEANOR VANCE',
      targetSubtitle: 'VP of Engineering | Target: Anthropic',
      contact: [
        { text: 'eleanor@vance.io', href: 'mailto:eleanor@vance.io', icon: '📧' },
        { text: 'San Francisco, CA', icon: '📍' },
      ],
      summary: 'Executive engineering leader scaling distributed AI infrastructure.',
      skills: [
        { category: 'Executive Leadership', items: 'Org Scaling, High-Trust Culture, Budgeting' },
      ],
      experience: [
        {
          role: 'VP of Engineering',
          company: 'HyperScale AI',
          dates: '2022 – Present',
          location: 'San Francisco, CA',
          bullets: ['Scaled org from 15 to 120 engineers with 98% retention.'],
        },
      ],
      education: [
        { degree: 'Ph.D. Computer Science', institution: 'MIT', year: '2015' },
      ],
    };

    const html = ReactDOMServer.renderToString(
      React.createElement(ExecutiveResumePreview, { doc: preParsed })
    );

    assert.ok(html.includes('<h1>DR. ELEANOR VANCE</h1>'), 'Must render name from preParsed doc');
    assert.ok(html.includes('VP of Engineering | Target: Anthropic'), 'Must render subtitle from preParsed doc');
    assert.ok(html.includes('HyperScale AI'), 'Must render company from preParsed doc');
    assert.ok(html.includes('<strong>Executive Leadership:</strong>'), 'Must render skills category from preParsed doc');
    assert.ok(html.includes('MIT'), 'Must render education institution from preParsed doc');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Empty and Minimal State Handling
  // ---------------------------------------------------------------------------
  test('ExecutiveResumePreview renders graceful placeholder state when text is empty', () => {
    const emptyHtml = ReactDOMServer.renderToString(
      React.createElement(ExecutiveResumePreview, { text: '' })
    );

    assert.ok(emptyHtml.includes('No resume content to preview'), 'Must display empty placeholder message');
    assert.ok(
      emptyHtml.includes('Add text in the editor or rebuild your CV to see the executive preview.'),
      'Must display helpful guidance in placeholder'
    );
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Real-Time Live Synchronization
  // ---------------------------------------------------------------------------
  test('ExecutiveResumePreview synchronizes dynamically when text prop updates', () => {
    const textV1 = `ALICE ADAMS\nTech Lead\nalice@test.com\n\nPROFESSIONAL SUMMARY\nExperienced leader.\n\nCORE COMPETENCIES\nBackend: Go, Python`;
    const textV2 = `BOB BAKER\nStaff Infrastructure Architect | Target: Netflix\nbob@netflix.org\n\nPROFESSIONAL SUMMARY\nDistributed systems architect.\n\nCORE COMPETENCIES\nCloud: Kubernetes, Terraform, Rust\n\nPROFESSIONAL EXPERIENCE\nStaff Architect — CloudScale Inc    2021 – Present | Remote\n• Optimized cluster compute costs reducing spend by 45%.`;

    const htmlV1 = ReactDOMServer.renderToString(
      React.createElement(ExecutiveResumePreview, { text: textV1 })
    );
    assert.ok(htmlV1.includes('ALICE ADAMS'), 'V1 must contain Alice Adams');
    assert.ok(!htmlV1.includes('BOB BAKER'), 'V1 must not contain Bob Baker');

    const htmlV2 = ReactDOMServer.renderToString(
      React.createElement(ExecutiveResumePreview, { text: textV2 })
    );
    assert.ok(htmlV2.includes('BOB BAKER'), 'V2 must dynamically reflect updated name Bob Baker');
    assert.ok(htmlV2.includes('Staff Infrastructure Architect | Target: Netflix'), 'V2 must reflect updated subtitle');
    assert.ok(htmlV2.includes('Kubernetes, Terraform, Rust'), 'V2 must reflect updated skills');
    assert.ok(
      htmlV2.includes('<strong>reducing spend by 45%</strong>') || htmlV2.includes('<strong>45%</strong>'),
      'V2 must reflect updated and bolded metric 45%'
    );
    assert.ok(!htmlV2.includes('ALICE ADAMS'), 'V2 must not contain stale Alice Adams data');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: ResumeModal.tsx Static Verification
  // ---------------------------------------------------------------------------
  test('ResumeModal.tsx contains segmented view switcher, expanded max-width, and HTML export button', () => {
    const modalPath = path.resolve('src/components/Resume/ResumeModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'ResumeModal.tsx must exist');

    const modalSource = fs.readFileSync(modalPath, 'utf8');

    // 1. Check imports
    assert.ok(
      modalSource.includes("import { ExecutiveResumePreview } from './ExecutiveResumePreview'"),
      'Must import ExecutiveResumePreview'
    );
    assert.ok(
      modalSource.includes("import { renderExecutiveResumeHtml } from '@/lib/resume-template'"),
      'Must import renderExecutiveResumeHtml'
    );

    // 2. Check modal dialog width expansion
    assert.ok(
      modalSource.includes("tab === 'rebuilt' ? 'sm:max-w-4xl lg:max-w-5xl' : 'sm:max-w-2xl'") ||
      modalSource.includes("sm:max-w-4xl") ||
      modalSource.includes("lg:max-w-5xl"),
      'Modal container must expand max-width for rebuilt view to fit 850px container'
    );

    // 3. Check viewMode state
    assert.ok(
      modalSource.includes("const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')") ||
      modalSource.includes("useState<'preview' | 'edit'>"),
      'Must have viewMode state initialized to preview'
    );

    // 4. Check Segmented Switcher UI
    assert.ok(
      modalSource.includes('📄 Executive Preview'),
      'Must render "📄 Executive Preview" tab in segmented switcher'
    );
    assert.ok(
      modalSource.includes('✏️ Plaintext Editor'),
      'Must render "✏️ Plaintext Editor" tab in segmented switcher'
    );

    // 5. Check Conditional Rendering
    assert.ok(
      modalSource.includes('<ExecutiveResumePreview text={upgraded.text} />'),
      'Must render <ExecutiveResumePreview text={upgraded.text} /> in preview mode'
    );
    assert.ok(
      modalSource.includes('Tell me what to change'),
      'Must keep manual edit prompt in edit mode'
    );
    assert.ok(
      modalSource.includes('value={upgraded.text}'),
      'Must keep editable textarea in edit mode'
    );

    // 6. Check HTML Export Button
    assert.ok(
      modalSource.includes("onClick={() => exportCv('html')}"),
      'Must have HTML download button calling exportCv("html")'
    );
    assert.ok(
      modalSource.includes('>HTML<') || modalSource.includes('HTML\n') || modalSource.includes('HTML</button>'),
      'Must render HTML export button'
    );

    // 7. Check exportCv supports 'html'
    assert.ok(
      modalSource.includes("format: 'pdf' | 'docx' | 'html'"),
      'exportCv must accept "html" format'
    );
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Standalone Executive HTML Export Generation
  // ---------------------------------------------------------------------------
  test('renderExecutiveResumeHtml outputs standalone document with complete head, styles and container', () => {
    const exportedHtml = renderExecutiveResumeHtml(SAMPLE_REFERENCE_CV);

    assert.ok(exportedHtml.startsWith('<!DOCTYPE html>'), 'Exported HTML must be a valid HTML5 document');
    assert.ok(exportedHtml.includes('<html lang="en">'), 'Must contain html tag');
    assert.ok(exportedHtml.includes('<head>'), 'Must contain head section');
    assert.ok(exportedHtml.includes('<title>'), 'Must contain title tag');
    assert.ok(exportedHtml.includes('<style>'), 'Must embed complete CSS styles in style tag');
    assert.ok(exportedHtml.includes('class="resume-container"'), 'Must contain .resume-container element');
    assert.ok(exportedHtml.includes('<h1>AYODELE BABALOLA</h1>'), 'Must contain candidate name');
    assert.ok(exportedHtml.includes('Senior Product Designer | Target: Stripe'), 'Must contain target subtitle');
    assert.ok(exportedHtml.includes('</html>'), 'Must cleanly close html tag');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
