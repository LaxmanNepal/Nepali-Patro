import fs from 'node:fs/promises';

const sources = [
  'nepal-goverment/data.js',
  'nepal-goverment/data/provinces.js',
  'nepal-goverment/data/local-governments.js',
  'nepal-goverment/data/service-portals.js'
];
const urls = new Set();
for (const source of sources) {
  const text = await fs.readFile(source, 'utf8');
  for (const m of text.matchAll(/(?:u|url):'?(https?:\/\/[^'"\s}]+)/g)) urls.add(m[1].replace(/['",]+$/, ''));
}
const unique = [...urls];
const results = [];
for (const url of unique) {
  const started = Date.now();
  let timer;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'NepaliPatro-Government-Directory/2.0' } });
    } catch {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'NepaliPatro-Government-Directory/2.0' } });
    }
    results.push({ url, status: res.status, ok: res.ok, finalUrl: res.url, ms: Date.now() - started, checkedAt: new Date().toISOString() });
  } catch (error) {
    results.push({ url, status: 0, ok: false, error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error), ms: Date.now() - started, checkedAt: new Date().toISOString() });
  } finally {
    clearTimeout(timer);
  }
}
await fs.mkdir('nepal-goverment/data', { recursive: true });
const summary = { total: results.length, online: results.filter(x => x.ok).length, failed: results.filter(x => !x.ok).length };
await fs.writeFile('nepal-goverment/data/site-status.json', JSON.stringify({ generatedAt: new Date().toISOString(), sources, summary, count: results.length, results }, null, 2) + '\n');
console.log(`Checked ${results.length} government URLs: ${summary.online} online, ${summary.failed} failed`);
