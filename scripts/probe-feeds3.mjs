/**
 * Third pass:
 *  1. Verify the Inkdesk WP Job Manager feed — item shape, dates, search params.
 *  2. Probe a batch of Nigerian / African employer ATS tokens, hunting for the
 *     design- and product-hiring companies the current registry is thin on.
 */

const UA = 'Mozilla/5.0 (compatible; CareerBot/1.0)';

async function get(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  try {
    const res = await fetch(url, { signal: c.signal, headers: { 'User-Agent': UA, Accept: '*/*' } });
    const type = res.headers.get('content-type') || '';
    const text = await res.text();
    return { ok: res.ok, status: res.status, type, text };
  } catch (e) {
    return { ok: false, status: 0, type: '', text: `${e.name}: ${e.message}` };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- 1. Inkdesk
console.log('=== Inkdesk job_feed: item shape ===');
{
  const r = await get('https://jobs.inkdeskng.org/?feed=job_feed');
  const items = r.text.split(/<item>/).slice(1);
  console.log(`items: ${items.length}`);
  const first = items[0] || '';
  for (const tag of ['title', 'link', 'pubDate', 'job_listing:location', 'job_listing:company', 'job_listing:job_type', 'dc:creator']) {
    const m = first.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    console.log(`  ${tag.padEnd(24)} ${m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/\s+/g, ' ').slice(0, 90) : '(absent)'}`);
  }
  console.log('\n  all titles + dates:');
  for (const it of items) {
    const t = (it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '?';
    const d = (it.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '?';
    const days = d !== '?' ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : '?';
    console.log(`    ${String(days).padStart(5)}d  ${t.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 70)}`);
  }
  console.log('\n  distinct namespaced tags present in item 1:');
  console.log('   ', [...new Set((first.match(/<[a-z_]+:[a-z_]+/gi) || []))].join(' '));
}

console.log('\n=== Inkdesk job_feed with search_keywords=designer ===');
{
  const r = await get('https://jobs.inkdeskng.org/?feed=job_feed&search_keywords=designer');
  const items = r.text.split(/<item>/).slice(1);
  console.log(`status ${r.status} items ${items.length}`);
  for (const it of items.slice(0, 6)) {
    const t = (it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '?';
    console.log('   ', t.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 80));
  }
}

// ------------------------------------------------- 2. More employer ATS boards
const CANDIDATES = [
  ['greenhouse', 'flutterwave'], ['lever', 'flutterwave'], ['workable', 'flutterwave'],
  ['greenhouse', 'paystack'], ['lever', 'paystack'], ['workable', 'paystack'],
  ['greenhouse', 'interswitch'], ['workable', 'interswitch'],
  ['workable', 'piggyvest'], ['greenhouse', 'piggyvest'],
  ['workable', 'cowrywise'], ['greenhouse', 'cowrywise'], ['lever', 'cowrywise'],
  ['workable', 'paga'], ['greenhouse', 'paga'], ['lever', 'paga'],
  ['workable', 'termii'], ['workable', 'seamlesshr'], ['greenhouse', 'seamlesshr'],
  ['workable', 'reliancehmo'], ['workable', 'helium-health'], ['workable', 'heliumhealth'],
  ['greenhouse', 'heliumhealth'], ['lever', 'heliumhealth'],
  ['workable', 'lifebank'], ['workable', 'thrive-agric'], ['workable', 'sabi'],
  ['greenhouse', 'sabi'], ['workable', 'bamboo'], ['workable', 'risevest'],
  ['workable', 'chipper-cash'], ['greenhouse', 'chippercash'], ['lever', 'chippercash'],
  ['ashby', 'chippercash'], ['greenhouse', 'wave'], ['lever', 'wave'],
  ['greenhouse', 'yellowcard'], ['lever', 'yellowcard'], ['ashby', 'yellowcard'],
  ['workable', 'yellowcard'],
  ['greenhouse', 'mpharma'], ['lever', 'mpharma'], ['workable', 'mpharma'],
  ['greenhouse', 'sunking'], ['lever', 'sunking'], ['greenhouse', 'greenlightplanet'],
  ['lever', 'greenlightplanet'], ['greenhouse', 'zipline'], ['lever', 'zipline'],
  ['greenhouse', 'twiga'], ['lever', 'twiga'], ['greenhouse', 'sendwave'],
  ['greenhouse', 'busha'], ['workable', 'busha'], ['greenhouse', 'bitnob'],
  ['workable', 'bitnob'], ['greenhouse', 'nomba'], ['workable', 'nomba'],
  ['lever', 'nomba'], ['workable', 'anchor'], ['greenhouse', 'juicyway'],
  ['greenhouse', 'm-kopa'], ['lever', 'm-kopa'], ['workable', 'mkopa'],
  ['greenhouse', 'mkopa'], ['greenhouse', 'kobo360'], ['lever', 'kobo360'],
  ['greenhouse', 'eden'], ['greenhouse', 'shuttlers'], ['workable', 'shuttlers'],
  ['greenhouse', 'turing'], ['greenhouse', 'deel'], ['ashby', 'deel'],
  ['greenhouse', 'toptal'], ['lever', 'toptal'],
];

const URLS = {
  greenhouse: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=false`,
  lever: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
  workable: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}`,
  ashby: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
};

function countJobs(provider, data) {
  if (!data) return 0;
  if (provider === 'lever') return Array.isArray(data) ? data.length : 0;
  return Array.isArray(data?.jobs) ? data.jobs.length : 0;
}

console.log('\n=== Employer ATS token probe ===');
const hits = [];
for (const [provider, token] of CANDIDATES) {
  const r = await get(URLS[provider](token));
  if (!r.ok || !r.type.includes('json')) continue;
  let data = null;
  try { data = JSON.parse(r.text); } catch { continue; }
  const n = countJobs(provider, data);
  if (n > 0) {
    // Sample locations + whether any design roles are present.
    const list = provider === 'lever' ? data : data.jobs;
    const titles = list.map((j) => j.title || j.text || '').filter(Boolean);
    const locs = new Set(
      list.map((j) =>
        j.location?.name || j.categories?.location || j.location ||
        [j.city, j.country].filter(Boolean).join(', ') || ''
      ).filter(Boolean)
    );
    const design = titles.filter((t) => /design|ux|ui|product/i.test(t));
    const ng = [...locs].filter((l) => /nigeria|lagos|abuja|africa|kenya|ghana|remote/i.test(l));
    hits.push({ provider, token, n, design: design.length, ng: ng.slice(0, 4) });
    console.log(
      `HIT ${provider.padEnd(10)} ${token.padEnd(18)} jobs=${String(n).padStart(4)} design/product=${String(design.length).padStart(3)}  loc: ${ng.slice(0, 3).join(' | ').slice(0, 80)}`
    );
  }
}
console.log(`\n${hits.length} live boards found.`);
