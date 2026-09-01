/**
 * Probes candidate Nigerian / aggregator job sites for a machine-readable feed.
 *
 * The app only ingests real APIs and RSS — never scraped HTML — so a candidate
 * source has to prove it publishes something parseable before it earns a place
 * in the registry. Run with: node scripts/probe-feeds.mjs
 */

const UA = 'Mozilla/5.0 (compatible; CareerBot/1.0; +https://example.com)';

const CANDIDATES = [
  // MyJobMag — Nigerian board, look for RSS / XML exports
  ['myjobmag rss', 'https://www.myjobmag.com/feed/rss'],
  ['myjobmag rss2', 'https://www.myjobmag.com/rss'],
  ['myjobmag jobsxml', 'https://www.myjobmag.com/jobsxml'],
  ['myjobmag feed', 'https://www.myjobmag.com/feed'],
  ['myjobmag sitemap', 'https://www.myjobmag.com/sitemap.xml'],
  ['myjobmag robots', 'https://www.myjobmag.com/robots.txt'],

  // HotNigerianJobs
  ['hotnigerianjobs feed', 'https://www.hotnigerianjobs.com/feed'],
  ['hotnigerianjobs rss', 'https://www.hotnigerianjobs.com/rss.xml'],
  ['hotnigerianjobs atom', 'https://www.hotnigerianjobs.com/feeds/posts/default'],
  ['hotnigerianjobs robots', 'https://www.hotnigerianjobs.com/robots.txt'],

  // Inkdesk — URL shape suggests WP Job Manager
  ['inkdesk wp-json', 'https://jobs.inkdeskng.org/wp-json/wp/v2/job_listing?per_page=5'],
  ['inkdesk feed', 'https://jobs.inkdeskng.org/feed'],
  ['inkdesk robots', 'https://jobs.inkdeskng.org/robots.txt'],

  // Jooble — official API needs a key; confirm the endpoint shape
  ['jooble api (no key)', 'https://ng.jooble.org/api/'],

  // Arc.dev
  ['arc robots', 'https://arc.dev/robots.txt'],

  // Indeed / Glassdoor — confirm they are closed
  ['indeed ng robots', 'https://ng.indeed.com/robots.txt'],
  ['glassdoor robots', 'https://www.glassdoor.com/robots.txt'],

  // Extra Nigerian boards worth checking while we are here
  ['jobberman robots', 'https://www.jobberman.com/robots.txt'],
  ['ngcareers rss', 'https://www.ngcareers.com/feed'],
  ['jobgurus rss', 'https://www.jobgurus.com.ng/feed'],
];

async function probe(label, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'follow',
    });
    const type = res.headers.get('content-type') || '';
    const text = await res.text();
    const head = text.slice(0, 260).replace(/\s+/g, ' ');
    const isFeed = /<rss|<feed|<\?xml/i.test(text.slice(0, 200));
    const isJson = type.includes('json') || /^[\[{]/.test(text.trim());
    let items = 0;
    if (isFeed) items = (text.match(/<item[\s>]/gi) || text.match(/<entry[\s>]/gi) || []).length;
    console.log(
      `${res.ok ? 'OK ' : 'ERR'} ${String(res.status).padEnd(4)} ${label.padEnd(24)} ` +
        `${isFeed ? `RSS/XML items=${items}` : isJson ? 'JSON' : 'HTML'} | ${type.split(';')[0]} | ${head.slice(0, 120)}`
    );
  } catch (e) {
    console.log(`ERR  --- ${label.padEnd(24)} ${e.name}: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }
}

for (const [label, url] of CANDIDATES) {
  await probe(label, url);
}
