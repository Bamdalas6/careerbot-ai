/**
 * Sanity-checks the reviewer's score range across deliberately different CVs.
 * A grader that gives everything 70-85 is useless, so this prints the spread.
 */
const BASE = process.env.BASE || 'http://localhost:3210';

const CASES = {
  'terrible (one line, no contact)': `I am a hardworking team player and fast learner looking for any opportunity.`,

  'weak (duties, no metrics, no contact)': `PROFILE
Hard working graduate seeking a role.

EXPERIENCE
Sales Assistant, Shoprite
Responsible for attending to customers on the shop floor.
Duties included arranging stock and helping with the till.
Worked on the promotions display every weekend.
Assisted with monthly stock counting exercises.

EDUCATION
BSc Business Administration, 2019`,

  'mid (some structure, mixed bullets)': `SUMMARY
Data analyst with 4 years in retail analytics.
Email: t.bello@example.com | Phone: 08099887766

EXPERIENCE
Built Power BI dashboards used by the commercial team.
Responsible for weekly sales reporting across 12 branches.
Automated the reconciliation process, saving 9 hours a week.
Worked on data quality checks for the warehouse feed.
Trained 5 junior analysts on SQL.

SKILLS
SQL, Power BI, Excel, Python

EDUCATION
BSc Statistics, University of Ibadan, 2019`,

  'strong (quantified, complete)': `SUMMARY
Senior Product Designer with 7 years across fintech and logistics in Lagos and Nairobi.
chidi@example.com | +2348031234567 | linkedin.com/in/chidi | behance.net/chidi

EXPERIENCE
Redesigned onboarding in Figma, lifting completion 38% for 55k monthly users.
Established the design system now used by 4 squads, cutting handoff time 30%.
Ran usability testing with 60 participants, reducing support tickets 22%.
Led accessibility audit across 14 screens, raising WCAG compliance to 96%.
Mentored 3 junior designers, two promoted within 18 months.
Drove information architecture rework that grew search usage 2.4x.

SKILLS
Figma, user research, wireframes, prototyping, design system, usability testing,
accessibility, information architecture, user flows, interaction design, handoff

EDUCATION
BSc Computer Science, University of Lagos, 2016`,

  'non-tech: accountant': `SUMMARY
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

const rows = [];
for (const [label, text] of Object.entries(CASES)) {
  const res = await fetch(`${BASE}/api/resume/upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!json.success) {
    rows.push([label, res.status, '-', '-', '-', '-', '-', json.error]);
    continue;
  }
  const r = json.review;
  const by = {};
  r.sections.forEach((s) => (by[s.label] = s.score));
  rows.push([
    label,
    r.score,
    by['Structure'],
    by['Impact & evidence'],
    by['Skills coverage'],
    by['Writing quality'],
    r.ats_warnings.length,
    r.improved_bullets.length,
  ]);
}

const head = ['CASE', 'TOTAL', 'STRUCT', 'IMPACT', 'SKILL', 'WRITE', 'ATS', 'FIX'];
const w = [38, 6, 7, 7, 6, 6, 4, 4];
console.log(head.map((h, i) => String(h).padEnd(w[i])).join(' '));
for (const row of rows) console.log(row.map((c, i) => String(c).padEnd(w[i])).join(' '));

// Show the worst case's actual advice, to confirm it is specific and usable.
const res = await fetch(`${BASE}/api/resume/upgrade`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: CASES['weak (duties, no metrics, no contact)'] }),
});
const r = (await res.json()).review;
console.log('\n--- advice for the weak CV ---');
console.log('headline    :', r.headline);
console.log('top priority:', r.top_priority);
console.log('ats         :');
r.ats_warnings.forEach((w) => console.log('   -', w));
console.log('missing kw  :', r.missing_keywords.join(', ') || '(none)');
console.log('summary     :', r.rewritten_summary);
console.log('rewrites    :');
r.improved_bullets.forEach((b) => {
  console.log('   before:', b.before);
  console.log('   after :', b.after);
});
