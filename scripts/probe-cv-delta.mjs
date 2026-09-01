/**
 * Compares the review of an original CV against the review of its rebuild,
 * section by section.
 *
 * A rebuild that scores lower than the input is a broken promise — the button
 * says "upgrade". This is the script that catches that regression and points at
 * the section responsible.
 */
const BASE = process.env.BASE || 'http://localhost:3210';

const CASES = {
  'strong accountant': `SUMMARY
Chartered accountant with 8 years in audit and financial reporting.
a.eze@example.com | 08123456789

EXPERIENCE
Led the year-end audit for a ₦4.2bn revenue subsidiary with zero material findings.
Reduced month-end close from 12 days to 5 through reconciliation automation.
Prepared IFRS financial reporting packs for 6 group entities.
Managed budgeting and variance analysis across 3 business units.

SKILLS
IFRS, reconciliation, financial reporting, budgeting, variance analysis, audit, Excel

EDUCATION
BSc Accounting, 2014. ACCA qualified, 2017.`,

  'designer with a name banner': `CHIDINMA OKAFOR - Product Designer
Email: chidinma@example.com  Phone: +2348031234567
linkedin.com/in/chidinma

SUMMARY
Product designer with 6 years across fintech and logistics.

EXPERIENCE
Redesigned onboarding in Figma, lifting completion 38% for 55k users.
Responsible for the design system used by 4 squads.
Ran usability testing with 60 participants across Lagos and Abuja.

SKILLS
Wireframing, Rapid Prototyping, User Journey Mapping, Information Architecture

EDUCATION
BSc Computer Science, University of Lagos, 2017`,
};

async function review(text) {
  const res = await fetch(`${BASE}/api/resume/upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json.review;
}

async function rebuild(text) {
  const res = await fetch(`${BASE}/api/resume/rebuild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json.cv;
}

for (const [label, text] of Object.entries(CASES)) {
  const before = await review(text);
  const cv = await rebuild(text);
  const after = await review(cv.text);

  console.log('\n' + '='.repeat(78));
  console.log(`${label.toUpperCase()}   ${before.score} -> ${after.score}`);
  console.log('='.repeat(78));

  const byLabel = new Map(after.sections.map((s) => [s.label, s]));
  for (const b of before.sections) {
    const a = byLabel.get(b.label);
    const delta = a ? a.score - b.score : 0;
    const arrow = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '=';
    console.log(`${arrow.padStart(4)}  ${b.label.padEnd(22)} ${b.score} -> ${a ? a.score : '?'}`);
    if (delta < 0) {
      console.log('        before:', b.notes.join(' | ') || '(none)');
      console.log('        after: ', a.notes.join(' | ') || '(none)');
    }
  }
}
