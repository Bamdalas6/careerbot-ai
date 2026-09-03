import { runSearch } from '../src/lib/job-providers.ts';
import { runFullJobHarvester } from '../src/lib/job-crawler.ts';
import { getCrawledJobs } from '../src/lib/db.ts';

async function runVerification() {
  console.log('================================================================');
  console.log('STARTING JOB AGGREGATION & JOBICY REMOVAL VERIFICATION SUITE');
  console.log('================================================================\n');

  let failed = false;
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failed = true;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  // STEP 1: Test Harvester Execution & Database Pool Ingestion
  console.log('\n--- Step 1: Harvester Ingestion (Jobberman, MyJobMag, YC, Dribbble, etc.) ---');
  console.log('Executing runFullJobHarvester()...');
  const harvested = await runFullJobHarvester();
  console.log(`Harvested ${harvested.length} unique jobs from multi-source crawl.`);

  assert(harvested.length > 0, `Harvester returned at least 1 job (got ${harvested.length})`);
  assert(typeof harvested.added === 'number', `Harvester returns persistence statistic 'added' (${harvested.added})`);
  assert(typeof harvested.total === 'number', `Harvester returns persistence statistic 'total' (${harvested.total})`);

  const harvestedSources = new Set(harvested.map((j) => j.source));
  console.log('Harvested sources:', [...harvestedSources].sort().join(', '));

  assert(harvestedSources.has('Wellfound'), 'Wellfound jobs are actively harvested');
  assert(harvestedSources.has('Contra'), 'Contra jobs are actively harvested');
  assert(harvestedSources.has('Jobberman'), 'Jobberman jobs are actively harvested');
  assert(harvestedSources.has('MyJobMag'), 'MyJobMag jobs are actively harvested');
  assert(harvestedSources.has('Dribbble'), 'Dribbble jobs are actively harvested');
  assert(harvestedSources.has('Authentic Jobs'), 'Authentic Jobs are actively harvested');
  assert(harvestedSources.has('Arc.dev'), 'Arc.dev jobs are actively harvested');

  // Verify Authentic Jobs quality: real companies and not blog articles
  const authenticJobsList = harvested.filter((j) => j.source === 'Authentic Jobs');
  if (authenticJobsList.length > 0) {
    const hasRealEmployers = authenticJobsList.some(
      (j) => j.company && j.company !== 'Design & Tech Employer'
    );
    assert(hasRealEmployers, 'Authentic Jobs yields real company attributions (e.g. Discord, OpenAI, Reddit, Airbnb)');
    const hasBlogArticle = authenticJobsList.some(
      (j) => j.title.toLowerCase().includes('what actually works in 2026') || j.title.toLowerCase().includes('how to hire')
    );
    assert(!hasBlogArticle, 'Authentic Jobs excludes blog post articles from job listings');
  }

  // Verify Arc.dev title normalization
  const arcJobsList = harvested.filter((j) => j.source === 'Arc.dev');
  if (arcJobsList.length > 0) {
    const hasCategoryTitle = arcJobsList.some((j) => /^ai jobs$/i.test(j.title));
    assert(!hasCategoryTitle, 'Arc.dev role titles are cleanly normalized into developer/engineer titles');
  }

  // Check that Jobicy is 100% absent from harvested jobs
  const jobicyHarvested = harvested.filter(
    (j) => j.source === 'Jobicy' || j.id.includes('jobicy') || j.apply_url.includes('jobicy.com')
  );
  assert(jobicyHarvested.length === 0, 'Jobicy is 100% absent from all harvested jobs');

  // Check that Moniepoint and its variants are strictly excluded
  const moniepointHarvested = harvested.filter(
    (j) => j.company.toLowerCase().includes('moniepoint')
  );
  assert(moniepointHarvested.length === 0, 'Moniepoint and its variants are 100% excluded from harvested jobs');

  // Verify crawled_jobs in database
  const inDb = await getCrawledJobs(200);
  console.log(`Retrieved ${inDb.length} jobs from database pool (crawled_jobs).`);
  assert(inDb.length > 0, `Database pool contains crawled jobs (got ${inDb.length})`);

  const jobicyInDb = inDb.filter(
    (j) => j.source === 'Jobicy' || j.id.includes('jobicy') || j.apply_url.includes('jobicy.com')
  );
  assert(jobicyInDb.length === 0, 'Jobicy is 100% absent from database pool');

  const moniepointInDb = inDb.filter(
    (j) => j.company.toLowerCase().includes('moniepoint')
  );
  assert(moniepointInDb.length === 0, 'Moniepoint is 100% excluded from database pool');

  // STEP 2: Test Live Search Queries
  console.log('\n--- Step 2: Live Search Queries & Gating ---');
  const testQueries = [
    'software engineer',
    'frontend developer remote',
    'python remote',
    'product designer in Lagos',
    'c++ developer',
    '.net remote',
    '', // Browse mode
  ];

  const allReturnedJobs = [];
  const sourcesObserved = new Set();

  for (const q of testQueries) {
    console.log(`\nQuerying: "${q || '(browse all)'}"...`);
    const result = await runSearch(q, 30);
    console.log(`  Fetched: ${result.diagnostics.fetched}, Exact: ${result.diagnostics.relevant}, Returned: ${result.jobs.length}`);
    console.log(`  Sources queried: ${result.diagnostics.sourcesQueried.join(', ')}`);

    assert(result.jobs.length > 0, `Query "${q}" returned results (got ${result.jobs.length})`);

    for (const job of result.jobs) {
      allReturnedJobs.push(job);
      sourcesObserved.add(job.source);

      // Requirement R1: Complete Removal of Jobicy
      if (
        job.source === 'Jobicy' ||
        job.id.toLowerCase().includes('jobicy') ||
        job.apply_url.toLowerCase().includes('jobicy.com')
      ) {
        assert(false, `FATAL: Jobicy job detected: ${job.id} - ${job.title} (${job.apply_url})`);
      }

      // Quality: Company & Title
      if (!job.title || typeof job.title !== 'string' || job.title.trim().length === 0) {
        assert(false, `Job missing valid title: ${JSON.stringify(job)}`);
      }
      if (!job.company || typeof job.company !== 'string' || job.company.trim().length === 0) {
        assert(false, `Job missing valid company: ${JSON.stringify(job)}`);
      }

      // Quality: Clean description snippet
      if (!job.snippet || /<[a-z][\s\S]*>/i.test(job.snippet)) {
        assert(false, `Job snippet contains raw HTML or is empty: ${job.id}`);
      }

      // Quality: Direct apply_url
      if (!job.apply_url || !/^https?:\/\//i.test(job.apply_url)) {
        assert(false, `Job missing valid HTTP apply_url: ${job.id} (${job.apply_url})`);
      }

      // Quality: Freshness (<=150 days)
      if (job.age_days !== undefined && job.age_days > 150) {
        assert(false, `Job exceeds max age of 150 days: ${job.id} (${job.age_days} days)`);
      }

      // Quality: Blacklist
      if (job.company.toLowerCase().includes('moniepoint')) {
        assert(false, `Blacklisted company found in results: ${job.company}`);
      }
    }
  }

  // STEP 3: Multi-source coverage verification
  console.log('\n--- Step 3: Multi-Source Representation ---');
  console.log('Sources observed across live search results:');
  for (const src of [...sourcesObserved].sort()) {
    const count = allReturnedJobs.filter((j) => j.source === src).length;
    console.log(`  - ${src.padEnd(20)}: ${count} jobs`);
  }

  assert(
    !sourcesObserved.has('Jobicy'),
    'Verification confirmed: Jobicy was NEVER observed in any search result'
  );

  const hasRemoteSources =
    sourcesObserved.has('RemoteOK') ||
    sourcesObserved.has('WeWorkRemotely') ||
    sourcesObserved.has('Himalayas') ||
    sourcesObserved.has('Working Nomads') ||
    sourcesObserved.has('Jobspresso') ||
    sourcesObserved.has('Remotive');
  assert(hasRemoteSources, 'Live remote boards (RemoteOK, WWR, Himalayas, Working Nomads, Jobspresso, Remotive) are actively returned');

  // STEP 4: Adversarial Hardening & Ingest Security Probes
  console.log('\n--- Step 4: Adversarial Hardening & Defense-in-Depth Tests ---');

  // 1. Ingest Security: Attempt to inject Jobicy job into database pool
  const testJobicyJob = {
    id: 'test-jobicy-injection',
    title: 'Adversarial Jobicy Role',
    company: 'Jobicy Partner Corp',
    location: 'Remote',
    is_remote: true,
    job_type: 'Full-time',
    description: 'Malicious Jobicy posting trying to bypass filters',
    snippet: 'Malicious Jobicy posting',
    tags: ['Remote', 'Jobicy'],
    apply_url: 'https://jobicy.com/jobs/malicious-test-job',
    source: 'Jobicy',
    posted_at: 'Today',
    age_days: 0,
  };
  const saveInjectionResult = await (await import('../src/lib/db.ts')).saveCrawledJobs([testJobicyJob]);
  const dbAfterInjection = await getCrawledJobs(250);
  const leakedJobicy = dbAfterInjection.filter(
    (j) => j.source === 'Jobicy' || j.apply_url.includes('jobicy.com') || j.id.includes('jobicy')
  );
  assert(leakedJobicy.length === 0, 'Adversarial test: Jobicy injection was strictly rejected and never saved to db');

  // 2. Ingest Security: Attempt to inject Moniepoint variant into database pool
  const testMoniepointJob = {
    id: 'test-moniepoint-injection',
    title: 'Senior Frontend Engineer',
    company: 'Moniepoint Microfinance Bank Nigeria Ltd',
    location: 'Lagos, Nigeria',
    is_remote: false,
    job_type: 'Full-time',
    description: 'Moniepoint test listing',
    snippet: 'Moniepoint test listing',
    tags: ['Nigeria', 'Banking'],
    apply_url: 'https://careers.example.com/moniepoint/test',
    source: 'Community Feed',
    posted_at: 'Today',
    age_days: 0,
  };
  await (await import('../src/lib/db.ts')).saveCrawledJobs([testMoniepointJob]);
  const dbAfterMoniepoint = await getCrawledJobs(250);
  const leakedMoniepoint = dbAfterMoniepoint.filter(
    (j) => j.company.toLowerCase().includes('moniepoint')
  );
  assert(leakedMoniepoint.length === 0, 'Adversarial test: Moniepoint variant was strictly rejected and never saved to db');

  // 3. Adversarial query test: Special symbols and nonsense characters
  console.log('\nTesting adversarial queries:');
  const weirdQueries = ['!@#$%^&*()_+{}[]', '   ', 'C++', 'C#', '.NET', 'jobicy', 'moniepoint'];
  for (const wq of weirdQueries) {
    const res = await runSearch(wq, 10);
    assert(Array.isArray(res.jobs), `Adversarial query "${wq}" handled cleanly without error`);
    const hasJobicy = res.jobs.some(
      (j) => j.source === 'Jobicy' || j.apply_url.includes('jobicy.com') || j.id.toLowerCase().includes('jobicy')
    );
    assert(!hasJobicy, `Adversarial query "${wq}" returned 0 Jobicy jobs`);
    const hasMoniepoint = res.jobs.some((j) => j.company.toLowerCase().includes('moniepoint'));
    assert(!hasMoniepoint, `Adversarial query "${wq}" returned 0 Moniepoint jobs`);
  }

  // 4. UI Copy Verification: Ensure Moniepoint is purged from FactsSection
  const fs = await import('fs');
  const factsSectionContent = fs.readFileSync('src/components/Sections/FactsSection.tsx', 'utf-8');
  assert(
    !factsSectionContent.toLowerCase().includes('moniepoint'),
    'FactsSection UI contains 0 mentions of Moniepoint'
  );

  console.log('\n================================================================');
  if (failed) {
    console.error('❌ TEST SUITE FAILED WITH ERRORS');
    process.exit(1);
  } else {
    console.log('🎉 ALL ACCEPTANCE CRITERIA VERIFIED AND PASSED SUCCESSFULLY!');
    console.log('================================================================');
  }
}

runVerification().catch((err) => {
  console.error('Unhandled error during verification:', err);
  process.exit(1);
});
