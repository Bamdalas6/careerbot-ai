import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

register('./scripts/test-loader.mjs', pathToFileURL('./'));

const { parseResumeText } = await import('../src/lib/ai-agent.ts');
const { reviewResume, buildUpgradedCV } = await import('../src/lib/cv-review.ts');

console.log('======================================================================');
console.log('   MULTI-INDUSTRY SKILL ACCURACY & CV GENERATION QUALITY TESTS');
console.log('======================================================================\n');

let passed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Culinary Resume (Agunbiade M. Titilola)
// ---------------------------------------------------------------------------
const culinaryResume = `# AGUNBIADE M. TITILOLA
Professional Cook & Kitchen Supervisor
10, Oyebajo Street, Fadeyi, Lagos, Nigeria • +234 816 399 1658 • tigirl4christ@yahoo.com

## PROFESSIONAL SUMMARY
Passionate and safety-conscious Professional Cook & Kitchen Supervisor with strong culinary expertise. Proven track record in high-volume meal preparation, authentic African & Nigerian cuisine, recipe consistency, and portion control. Skilled in managing kitchen staff, upholding strict hygiene and HACCP sanitation protocols, inventory management (FIFO), and delivering exceptional culinary experiences.

## CORE CULINARY & SUPERVISORY COMPETENCIES
* Culinary Arts & Meal Prep: Traditional African & Nigerian Delicacies, Continental Breakfasts, Proteins, Grilling, Seasoning & Recipe Standardization.
* Kitchen Supervision: Shift Supervision, Kitchen Staff Coordination, Service Line Speed, Task Delegation.
* Food Safety & Sanitation: HACCP & Food Hygiene Compliance, Workstation Sanitization, Safe Food Storage & Temperature Monitoring (FIFO).
* Inventory Control: Bulk Ingredient Sourcing, Daily Stock Taking, Spoilage Minimization.

## PROFESSIONAL EXPERIENCE

Kitchen Supervisor & Cook — African Kitchen Restaurant
The Bells University, Ota, Ogun State | 2021 – 2025
* Supervised daily kitchen operations and food preparation for 350+ university students daily.
* Maintained active hands-on cooking involvement for signature local soups and grilled proteins.
* Led a team of kitchen assistants and prep cooks, enforcing strict personal hygiene.
* Oversaw stock intake, dry and cold storage organization, and implemented FIFO practices, reducing ingredient waste by 20%.

Cook & Food Operations Assistant — Great Mind Catering Services
Lagos, Nigeria | 2018 – 2021
* Prepared high-volume daily meals and event catering menus.
* Executed thorough mise en place preparation: cleaned, chopped, seasoned, and marinated meats.
* Operated commercial kitchen appliances safely adhering to safety procedures.

## EDUCATION & CREDENTIALS
* Bachelor's Degree — National Open University of Nigeria (2012 – 2017)
* Senior Secondary Certificate Examination (SSCE / WAEC) — Santos Comprehensive High School (2003 – 2009)
* Certificate in Food Safety & Hygiene Standards
`;

console.log('--- SUITE 1: Culinary Resume Parsing & Skill Precision ---');

const parsedCulinary = parseResumeText(culinaryResume);

it('Extracts correct candidate name', () => {
  assert.ok(parsedCulinary.name.includes('AGUNBIADE') || parsedCulinary.name.includes('TITILOLA'), `Expected name to contain AGUNBIADE or TITILOLA, got "${parsedCulinary.name}"`);
});

it('Extracts correct best-fit culinary title', () => {
  assert.ok(
    /cook|kitchen|culinary/i.test(parsedCulinary.extracted_title),
    `Expected culinary title, got "${parsedCulinary.extracted_title}"`
  );
});

it('Does NOT extract false programming skills (Go, R, C, TypeScript)', () => {
  const skillsLower = parsedCulinary.skills.map((s) => s.toLowerCase());
  assert.ok(!skillsLower.includes('go'), 'Must not extract Golang "Go" for a cook');
  assert.ok(!skillsLower.includes('r'), 'Must not extract "R" language for a cook');
  assert.ok(!skillsLower.includes('typescript'), 'Must not extract TypeScript for a cook');
  assert.ok(!skillsLower.includes('docker'), 'Must not extract Docker for a cook');
});

it('Extracts authentic culinary and kitchen competencies', () => {
  const skillsLower = parsedCulinary.skills.map((s) => s.toLowerCase());
  const hasCulinarySkills = skillsLower.some((s) =>
    ['culinary arts', 'food preparation', 'kitchen operations', 'food safety & sanitation', 'haccp food safety', 'menu planning', 'staff supervision', 'portion control'].some((expected) => s.includes(expected))
  );
  assert.ok(hasCulinarySkills, `Expected culinary skills, got: ${parsedCulinary.skills.join(', ')}`);
});

it('Calculates experience strictly from work dates (7 years: 2018-2025), NOT 15+ years from high school (2003)', () => {
  // 2018 to 2025 is 7 years
  assert.strictEqual(parsedCulinary.experience_years, 7, `Expected 7 years experience from work history (2018-2025), got ${parsedCulinary.experience_years}`);
});

console.log('\n--- SUITE 2: Natural, Non-Robotic Rebuilt CV Generation ---');

const culinaryReview = reviewResume(culinaryResume);
const upgradedCulinary = buildUpgradedCV(culinaryResume, culinaryReview);

it('Detects culinary domain, NOT engineering', () => {
  assert.ok(
    !culinaryReview.rewritten_summary.includes('software applications') &&
    !culinaryReview.rewritten_summary.includes('distributed cloud systems') &&
    !culinaryReview.rewritten_summary.includes('architecting, building, and scaling high-performance web applications'),
    `Summary must NOT contain web developer boilerplate: "${culinaryReview.rewritten_summary}"`
  );
});

it('Generates human-crafted culinary executive summary', () => {
  assert.ok(
    /culinary|meal preparation|kitchen|food safety|haccp/i.test(culinaryReview.rewritten_summary),
    `Summary should mention culinary/kitchen craft: "${culinaryReview.rewritten_summary}"`
  );
});

it('Uses domain-authentic heading for culinary competencies', () => {
  assert.ok(
    upgradedCulinary.text.includes('CORE CULINARY & SUPERVISORY COMPETENCIES') ||
    upgradedCulinary.text.includes('CORE COMPETENCIES & PROFESSIONAL SKILLS'),
    'Heading should be craft-authentic, not generic tech skills'
  );
  assert.ok(
    !upgradedCulinary.text.includes('TypeScript') && !upgradedCulinary.text.includes('Kubernetes'),
    'Upgraded CV must not inject tech developer keywords into a cook CV'
  );
});

it('Does NOT repeat "Spearheaded" across weak bullet points', () => {
  const weakBulletsText = `
* Responsible for food preparation in the kitchen.
* Responsible for supervising assistants during shifts.
* Responsible for inventory stock counts and supply orders.
* Responsible for sanitation and cleanliness across stations.
`;
  const reviewWeak = reviewResume(weakBulletsText, 'Professional Cook');
  const upgradedWeak = buildUpgradedCV(weakBulletsText, reviewWeak, 'Professional Cook');
  const spearheadedMatches = (upgradedWeak.text.match(/\bSpearheaded\b/g) || []).length;
  assert.ok(
    spearheadedMatches <= 1,
    `Expected at most 1 Spearheaded lead-in across 4 weak bullets, found ${spearheadedMatches}`
  );
});

console.log('\n--- SUITE 3: Fresh Graduate & Short-Tenure Experience Calculation ---');

const entryLevelResume = `# CHIDINMA OKONKWO
Lagos, Nigeria • chidinma@example.com • 08012345678

## PROFESSIONAL SUMMARY
Recent graduate with strong communication and problem solving abilities seeking entry level role.

## EDUCATION
Babcock University, Nigeria (2020 – 2024)
Bachelor of Science in Accounting
`;

const parsedEntry = parseResumeText(entryLevelResume);

it('Does not report 15+ years for a fresh graduate with 2020-2024 education and no jobs', () => {
  assert.ok(
    parsedEntry.experience_years <= 2,
    `Expected <= 2 years for fresh graduate, got ${parsedEntry.experience_years}`
  );
});

console.log('\n--- SUITE 4: Adversarial False-Positive Keyword Immunity ---');

const trickyPhrasesResume = `EMMANUEL ADEYEMI
Sales Associate
Lagos, Nigeria • emmanuel@example.com

PROFESSIONAL SUMMARY
Always willing to go the extra mile and travel on the go. Ready to go into competitive markets.
Assisted with onboarding new sales reps and helped them settle in.
Skilled in verbal communication and resolving issues on a day-to-day basis.

EXPERIENCE
Sales Rep — Retail Stores Ltd | 2022 – 2024
* Handled customer inquiries and managed daily store cash registers.
`;

const parsedTricky = parseResumeText(trickyPhrasesResume);

it('Does not falsely match Golang "Go" when text has English phrases like "to go", "on the go"', () => {
  const skillsLower = parsedTricky.skills.map((s) => s.toLowerCase());
  assert.ok(!skillsLower.includes('go'), 'Must NOT match "Go" (Golang) from "willing to go" or "on the go"');
  assert.ok(!skillsLower.includes('go (golang)'), 'Must NOT match "Go (Golang)" from casual "go" text');
});

it('Does not extract short single letters like "R" or "C" from common English text', () => {
  const skillsLower = parsedTricky.skills.map((s) => s.toLowerCase());
  assert.ok(!skillsLower.includes('r'), 'Must NOT match "R"');
  assert.ok(!skillsLower.includes('r programming'), 'Must NOT match "R Programming"');
  assert.ok(!skillsLower.includes('c / c++'), 'Must NOT match "C / C++"');
});

console.log('\n--- SUITE 5: Healthcare & Administration Accuracy ---');

const nurseResume = `GRACE OKON
Registered Nurse
grace@example.com • +234 809 111 2222

PROFESSIONAL SUMMARY
Dedicated Registered Nurse with 5+ years of experience delivering high quality patient care.

CORE SKILLS
Patient Care, Vital Signs Monitoring, Medication Administration, Triage, Infection Control, EHR

PROFESSIONAL EXPERIENCE
Staff Nurse — General Hospital Lagos | 2020 – Present
* Administered prescribed medications and monitored patient vital signs.
`;

const parsedNurse = parseResumeText(nurseResume);
const reviewNurse = reviewResume(nurseResume);

it('Detects Registered Nurse title and healthcare skills', () => {
  assert.ok(/nurse|healthcare/i.test(parsedNurse.extracted_title), `Expected Nurse title, got ${parsedNurse.extracted_title}`);
  assert.ok(parsedNurse.skills.some((s) => s.toLowerCase().includes('patient care')));
});

it('Generates authentic healthcare summary without tech boilerplate', () => {
  assert.ok(/patient care|clinical|hipaa/i.test(reviewNurse.rewritten_summary));
  assert.ok(!reviewNurse.rewritten_summary.includes('web applications'));
});

console.log('\n======================================================================');
console.log(`VERIFICATION RESULTS: ${passed} Passed, 0 Failed`);
console.log('======================================================================\n');
