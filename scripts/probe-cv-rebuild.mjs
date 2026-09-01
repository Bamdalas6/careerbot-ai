/**
 * Verifies /api/resume/rebuild produces a document that is (a) not mangled,
 * (b) scores higher than the original, and (c) contains no invented numbers.
 *
 * The last one matters most: a rebuilt CV that quietly fabricates "increased
 * revenue 30%" would walk the user into an interview with a lie in their hand.
 */
const BASE = process.env.BASE || 'http://localhost:3210';

const CASES = {
  'no headings at all': `Chinedu Balogun
chinedu.b@example.com 08145556677
I am a hard working sales assistant with 3 years experience. Responsible for attending to customers on the shop floor. Duties included arranging stock and helping with the till. I worked on the promotions display every weekend. BSc Business Administration, University of Ilorin, 2019. Excel, CRM, inventory, customer service.`,

  'weak but headed': `PROFILE
Hard working graduate seeking a role.

EXPERIENCE
Sales Assistant, Shoprite
Responsible for attending to customers on the shop floor.
Duties included arranging stock and helping with the till.
Worked on the promotions display every weekend.
Assisted with monthly stock counting exercises.

EDUCATION
BSc Business Administration, 2019`,

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
BSc Computer Science, University of Lagos, 2017

CERTIFICATIONS
Google UX Design Certificate, 2021`,

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
};

/** Numbers in the output that were not in the input = fabrication. */
function inventedNumbers(before, after) {
  const strip = (s) =>
    s
      .replace(/\[[^\]]*\]/g, ' ') // placeholders are honest, ignore them
      .match(/\d+(?:[.,]\d+)?%?/g) || [];
  const src = new Set(strip(before));
  return strip(after).filter((n) => !src.has(n));
}

for (const [label, text] of Object.entries(CASES)) {
  const res = await fetch(`${BASE}/api/resume/rebuild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  console.log('\n' + '='.repeat(78));
  console.log(label.toUpperCase());
  console.log('='.repeat(78));
  if (!json.success) {
    console.log('FAILED', res.status, json.error);
    continue;
  }
  const invented = inventedNumbers(text, json.cv.text);
  console.log(
    `score ${json.score_before} -> ${json.score_after}  |  placeholders ${json.cv.placeholders}  |  ` +
      `invented numbers: ${invented.length ? '!!! ' + invented.join(', ') : 'none'}`
  );
  console.log('\nchanges:');
  json.cv.changes.forEach((c) => console.log('  -', c));
  console.log('\n--- document ---');
  console.log(json.cv.text);
}
