import fs from 'node:fs/promises';

const BASE = 'https://mofaga.gov.np/local-contact?page=';
const OUT = 'nepal-goverment/data/local-governments.json';
const TOTAL_PAGES = 51;

const clean = (s='') => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const abs = (href='') => href.startsWith('http') ? href : new URL(href, 'https://mofaga.gov.np/').href;

function parsePage(html) {
  const rows = [];
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0] || html;
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  for (const tr of table.match(trRe) || []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
    if (cells.length < 5) continue;
    const values = cells.map(clean);
    const sn = values[0].match(/\d+/)?.[0];
    if (!sn) continue;
    const links = [...tr.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)].map(m => abs(m[1]));
    const web = links.find(u => !u.includes('mailto:')) || '';
    const [province, name, district] = values.slice(1, 4);
    const email = values.find(v => /@/.test(v)) || '';
    rows.push({ id:`lg-${sn}`, sn:Number(sn), province, district, name, type:/गाउँपालिका|rural/i.test(name) ? 'rural-municipality' : /महानगरपालिका|metropolitan/i.test(name) ? 'metropolitan' : /उपमहानगरपालिका|sub-metropolitan/i.test(name) ? 'sub-metropolitan' : 'municipality', website:web, email, source:`${BASE}${Math.ceil(Number(sn)/15)}` });
  }
  return rows;
}

const all = new Map();
for (let page=1; page<=TOTAL_PAGES; page++) {
  const res = await fetch(`${BASE}${page}`, {headers:{'user-agent':'Nepali-Patro-Government-Directory/1.0'}});
  if (!res.ok) throw new Error(`MoFAGA page ${page}: ${res.status}`);
  for (const row of parsePage(await res.text())) all.set(row.sn, row);
  console.log(`page ${page}/${TOTAL_PAGES}: ${all.size}`);
}

const records = [...all.values()].sort((a,b)=>a.sn-b.sn);
await fs.mkdir('nepal-goverment/data', {recursive:true});
await fs.writeFile(OUT, JSON.stringify({source:'https://mofaga.gov.np/local-contact',generatedAt:new Date().toISOString(),count:records.length,records}, null, 2)+'\n');
console.log(`wrote ${records.length} local governments to ${OUT}`);
if (records.length < 700) throw new Error(`Expected roughly 753 local governments, got ${records.length}`);
