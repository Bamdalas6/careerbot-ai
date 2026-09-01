/**
 * One-off probe: which public ATS job boards actually respond with live postings?
 *
 * Run with:  node scripts/probe-boards.mjs
 *
 * This exists so the registry in src/lib/job-providers.ts only ever contains
 * tokens that were verified against the live API. Dead tokens are silently
 * dropped by the fetcher at runtime, but shipping them wastes a request per
 * search, so they get pruned here instead.
 */

const GH = (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`;
const LEVER = (t) => `https://api.lever.co/v0/postings/${t}?mode=json`;
const WORKABLE = (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`;
const SMART = (t) => `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=100`;
const ASHBY = (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`;
const RECRUITEE = (t) => `https://${t}.recruitee.com/api/offers/`;

const CANDIDATES = [
  // --- Nigeria ---
  ['greenhouse', 'paystack'], ['lever', 'paystack'], ['workable', 'paystack'],
  ['lever', 'flutterwave'], ['greenhouse', 'flutterwave'], ['workable', 'flutterwave'],
  ['workable', 'moniepoint'], ['lever', 'moniepoint'], ['greenhouse', 'moniepoint'],
  ['workable', 'teamapt'], ['lever', 'teamapt'],
  ['lever', 'kuda'], ['workable', 'kuda'], ['greenhouse', 'kuda'],
  ['workable', 'kudabank'], ['lever', 'kudabank'],
  ['workable', 'reliancehealth'], ['lever', 'reliancehealth'], ['greenhouse', 'reliancehealth'],
  ['workable', 'heliumhealth'], ['lever', 'heliumhealth'],
  ['workable', 'seamlesshr'], ['lever', 'seamlesshr'],
  ['workable', 'piggyvest'], ['lever', 'piggyvest'],
  ['workable', 'cowrywise'], ['lever', 'cowrywise'],
  ['lever', 'interswitch'], ['workable', 'interswitch'], ['smart', 'Interswitch'],
  ['lever', 'palmpay'], ['workable', 'palmpay'], ['greenhouse', 'palmpay'],
  ['lever', 'carbon'], ['workable', 'carbonapp'], ['lever', 'getcarbon'],
  ['workable', 'termii'], ['lever', 'termii'],
  ['greenhouse', 'norebase'], ['lever', 'norebase'],
  ['lever', 'bamboo'], ['workable', 'mybamboo'],
  ['lever', 'zone'], ['workable', 'zone'],
  ['workable', 'ehealthafrica'], ['lever', 'ehealthafrica'], ['greenhouse', 'ehealthafrica'],

  // --- Pan-African / Kenya / Ghana / South Africa / Egypt ---
  ['greenhouse', 'andela'], ['lever', 'andela'],
  ['lever', 'wave'], ['greenhouse', 'wave'], ['lever', 'wavemobilemoney'],
  ['greenhouse', 'mkopa'], ['lever', 'mkopa'], ['workable', 'mkopa'],
  ['lever', 'yellowcard'], ['greenhouse', 'yellowcard'], ['workable', 'yellowcard'],
  ['lever', 'chippercash'], ['greenhouse', 'chippercash'], ['ashby', 'chippercash'],
  ['greenhouse', 'jumia'], ['smart', 'Jumia'], ['lever', 'jumia'],
  ['greenhouse', 'sunking'], ['greenhouse', 'greenlightplanet'], ['lever', 'sunking'],
  ['greenhouse', 'branchinternational'], ['lever', 'branchinternational'],
  ['greenhouse', 'tala'], ['lever', 'tala'], ['lever', 'talamobile'],
  ['lever', 'cellulant'], ['workable', 'cellulant'], ['greenhouse', 'cellulant'],
  ['greenhouse', 'mfsafrica'], ['lever', 'mfsafrica'], ['lever', 'onafriq'],
  ['greenhouse', 'zipline'], ['lever', 'zipline'],
  ['greenhouse', 'sama'], ['lever', 'sama'], ['lever', 'samasource'],
  ['greenhouse', 'twiga'], ['lever', 'twiga'], ['workable', 'twigafoods'],
  ['greenhouse', 'sendwave'], ['lever', 'sendwave'],
  ['greenhouse', 'oneacrefund'], ['lever', 'oneacrefund'],
  ['greenhouse', 'komaza'], ['lever', 'komaza'],
  ['greenhouse', 'apollaagriculture'], ['lever', 'apolloagriculture'], ['workable', 'apolloagriculture'],
  ['greenhouse', 'burnmanufacturing'], ['lever', 'burn'], ['workable', 'burnmanufacturing'],
  ['greenhouse', 'lori'], ['lever', 'lori'],
  ['greenhouse', 'copia'], ['lever', 'copia'],
  ['greenhouse', 'paymentology'], ['workable', 'paymentology'], ['lever', 'paymentology'],
  ['greenhouse', 'yoco'], ['lever', 'yoco'], ['workable', 'yoco'],
  ['greenhouse', 'takealot'], ['smart', 'takealot'],
  ['greenhouse', 'luno'], ['lever', 'luno'], ['ashby', 'luno'],
  ['greenhouse', 'valr'], ['lever', 'valr'], ['ashby', 'valr'],
  ['greenhouse', 'swvl'], ['lever', 'swvl'],
  ['greenhouse', 'instabug'], ['lever', 'instabug'],
  ['greenhouse', 'paymob'], ['lever', 'paymob'], ['workable', 'paymob'],
  ['greenhouse', 'fawry'], ['lever', 'fawry'],
  ['greenhouse', 'mnt-halan'], ['lever', 'halan'],
  ['greenhouse', 'kobo360'], ['lever', 'kobo360'],
  ['greenhouse', 'gozem'], ['lever', 'gozem'],
  ['greenhouse', 'moovafrica'], ['lever', 'moove'], ['workable', 'moove'],
  ['greenhouse', 'turaco'], ['lever', 'turaco'],
  ['greenhouse', 'canonical'], // control: known-good large board
];

const URL_FOR = { greenhouse: GH, lever: LEVER, workable: WORKABLE, smart: SMART, ashby: ASHBY, recruitee: RECRUITEE };

function countJobs(kind, data) {
  if (!data || typeof data !== 'object') return 0;
  if (kind === 'greenhouse') return Array.isArray(data.jobs) ? data.jobs.length : 0;
  if (kind === 'lever') return Array.isArray(data) ? data.length : 0;
  if (kind === 'workable') return Array.isArray(data.jobs) ? data.jobs.length : 0;
  if (kind === 'smart') return Array.isArray(data.content) ? data.content.length : 0;
  if (kind === 'ashby') return Array.isArray(data.jobs) ? data.jobs.length : 0;
  if (kind === 'recruitee') return Array.isArray(data.offers) ? data.offers.length : 0;
  return 0;
}

function sampleLocations(kind, data) {
  const out = [];
  try {
    if (kind === 'greenhouse') for (const j of data.jobs.slice(0, 4)) out.push(`${j.title} @ ${j.location?.name}`);
    if (kind === 'lever') for (const j of data.slice(0, 4)) out.push(`${j.text} @ ${j.categories?.location}`);
    if (kind === 'workable') for (const j of data.jobs.slice(0, 4)) out.push(`${j.title} @ ${j.location?.city || ''} ${j.location?.country || ''}`);
    if (kind === 'smart') for (const j of data.content.slice(0, 4)) out.push(`${j.name} @ ${j.location?.city} ${j.location?.country}`);
    if (kind === 'ashby') for (const j of data.jobs.slice(0, 4)) out.push(`${j.title} @ ${j.location}`);
  } catch { /* shape drift, ignore */ }
  return out;
}

async function probe([kind, token]) {
  const url = URL_FOR[kind](token);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 board-probe' } });
    clearTimeout(t);
    if (!res.ok) return { kind, token, ok: false, status: res.status };
    const data = await res.json();
    const n = countJobs(kind, data);
    return { kind, token, ok: n > 0, status: res.status, n, samples: n > 0 ? sampleLocations(kind, data) : [] };
  } catch (e) {
    clearTimeout(t);
    return { kind, token, ok: false, status: e.name === 'AbortError' ? 'timeout' : e.message.slice(0, 40) };
  }
}

// Bounded concurrency so we do not hammer any single provider.
const results = [];
const QUEUE = [...CANDIDATES];
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (QUEUE.length) {
      const item = QUEUE.shift();
      results.push(await probe(item));
    }
  })
);

const live = results.filter((r) => r.ok).sort((a, b) => b.n - a.n);
console.log(`\n===== LIVE BOARDS (${live.length} of ${results.length} probed) =====`);
for (const r of live) {
  console.log(`\n[${r.kind}] ${r.token}  -> ${r.n} postings`);
  for (const s of r.samples) console.log(`      ${s}`);
}
console.log(`\n===== DEAD =====`);
console.log(results.filter((r) => !r.ok).map((r) => `${r.kind}/${r.token}(${r.status})`).join('  '));
