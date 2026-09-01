/**
 * Second-pass probe: dump the feeds that responded, and try the feed paths that
 * WP Job Manager / common Nigerian boards actually use.
 */

const UA = 'Mozilla/5.0 (compatible; CareerBot/1.0)';

async function get(url, { method = 'GET', body, headers } = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const res = await fetch(url, {
      method,
      body,
      signal: c.signal,
      headers: { 'User-Agent': UA, Accept: '*/*', ...(headers || {}) },
      redirect: 'follow',
    });
    return { ok: res.ok, status: res.status, type: res.headers.get('content-type') || '', text: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, type: '', text: `${e.name}: ${e.message}` };
  } finally {
    clearTimeout(t);
  }
}

function countTag(xml, tag) {
  return (xml.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
}

console.log('=== HotNigerianJobs rss.xml ===');
{
  const r = await get('https://www.hotnigerianjobs.com/rss.xml');
  console.log('status', r.status, r.type, 'len', r.text.length, 'items', countTag(r.text, 'item'));
  console.log(r.text.slice(0, 1400));
}

console.log('\n=== Inkdesk job feeds ===');
for (const u of [
  'https://jobs.inkdeskng.org/?feed=job_feed',
  'https://jobs.inkdeskng.org/jobs/feed/',
  'https://jobs.inkdeskng.org/feed/?post_type=job_listing',
  'https://jobs.inkdeskng.org/wp-json/wp/v2/types',
]) {
  const r = await get(u);
  console.log(`\n-- ${u}\n   status ${r.status} ${r.type} len ${r.text.length} items ${countTag(r.text, 'item')}`);
  console.log('   ' + r.text.slice(0, 500).replace(/\s+/g, ' '));
}

console.log('\n=== MyJobMag sitemap index ===');
{
  const r = await get('https://www.myjobmag.com/sitemap.xml');
  console.log(r.text.slice(0, 900));
}

console.log('\n=== Jooble API without key (expects 4xx, confirms endpoint shape) ===');
{
  const r = await get('https://jooble.org/api/NOKEY', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords: 'ui ux designer', location: 'Lagos' }),
  });
  console.log('status', r.status, r.type);
  console.log(r.text.slice(0, 300).replace(/\s+/g, ' '));
}

console.log('\n=== Other Nigerian boards: feed / JSON-LD check ===');
for (const u of [
  'https://www.jobberman.com/feed',
  'https://www.jobberman.com/jobs/rss',
  'https://www.myjobmag.com/jobs-by-title/ui-ux-designer-remote',
]) {
  const r = await get(u);
  const jsonLd = (r.text.match(/application\/ld\+json/g) || []).length;
  const jobPosting = (r.text.match(/"@type"\s*:\s*"JobPosting"/g) || []).length;
  console.log(
    `-- ${u}\n   status ${r.status} ${r.type.split(';')[0]} len ${r.text.length} ld+json=${jsonLd} JobPosting=${jobPosting}`
  );
}
