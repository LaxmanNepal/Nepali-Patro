import fs from 'node:fs/promises';

const OUT = 'nepal-goverment/data/local-governments.js';
const BASE = 'https://www.mofaga.gov.np/local-contact?page=';
const pages = Array.from({ length: 51 }, (_, i) => i + 1);
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
const nepaliDigits = s => String(s ?? '').replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
const abs = u => { try { return new URL(u, 'https://www.mofaga.gov.np/').href; } catch { return ''; } };
const normalizeUrl = u => { try { const x = new URL(u); x.hash = ''; x.search = ''; return x.href.replace(/\/$/, '/'); } catch { return ''; } };
const provinceId = p => ({ 'कोशी प्रदेश':'koshi','मधेश प्रदेश':'madhesh','बागमती प्रदेश':'bagmati','गण्डकी प्रदेश':'gandaki','लुम्बिनी प्रदेश':'lumbini','कर्णाली प्रदेश':'karnali','सुदूरपश्चिम प्रदेश':'sudurpashchim' })[clean(p)] || '';
const typeOf = n => /महानगरपालिका|उप-महानगरपालिका|नगरपालिका|गाउँपालिका/.exec(n)?.[0] || '';

function rows(html) {
  const out = [];
  for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const raw = tr[0];
    const cells = [...raw.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(m => clean(m[1].replace(/<[^>]+>/g, ' ')));
    if (cells.length < 7) continue;
    const serialText = nepaliDigits(cells[0]);
    const serial = Number((serialText.match(/\d+/) || [])[0]);
    if (!Number.isFinite(serial)) continue;
    const hrefs = [...raw.matchAll(/href=["']([^"']+)["']/gi)].map(m => abs(m[1])).filter(Boolean);
    const website = normalizeUrl(hrefs.find(u => /^https?:\/\//i.test(u) && !u.includes('mofaga.gov.np')) || '');
    if (!website || !/\.gov\.np\b/i.test(new URL(website).hostname)) continue;
    const province = cells[1] || '';
    const name = cells[2] || '';
    const district = cells[3] || '';
    const email = (cells[5]?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
    const phone = cells[6] || '';
    if (!name || !district) continue;
    out.push({ serial, n: name, e: '', u: website, c: 'स्थानीय सरकार', l: 'local', p: provinceId(province), province, district, type: typeOf(name), k: `${name} ${district} ${province}`.trim(), email, phone });
  }
  return out;
}

const all = [];
for (const page of pages) {
  const res = await fetch(BASE + page, { headers: { 'user-agent': 'Nepali-Patro-Government-Directory/2.0' } });
  if (!res.ok) throw new Error(`MoFAGA page ${page}: HTTP ${res.status}`);
  const html = await res.text();
  const found = rows(html);
  all.push(...found);
  console.log(`page ${page}: ${found.length}`);
}

const bySerial = new Map();
for (const x of all) if (!bySerial.has(x.serial)) bySerial.set(x.serial, x);
const unique = [...bySerial.values()].sort((a, b) => a.serial - b.serial);
if (unique.length < 700 || unique.length > 753) throw new Error(`Safety stop: parsed ${unique.length} local websites; expected 700–753.`);

const payload = { sourceUrl: 'https://www.mofaga.gov.np/local-contact/', total: 753, recordCount: unique.length, generatedAt: new Date().toISOString(), provinces: [...new Set(unique.map(x => x.p).filter(Boolean))].length };
const js = `// Generated from the official MoFAGA local-government contact directory.\nwindow.GOVERNMENT_LOCAL_META=${JSON.stringify(payload)};\nwindow.GOVERNMENT_LOCAL_GOVERNMENTS=[\n${unique.map(x => `{n:'${esc(x.n)}',e:'',u:'${esc(x.u)}',c:'स्थानीय सरकार',l:'local',p:'${esc(x.p)}',province:'${esc(x.province)}',district:'${esc(x.district)}',type:'${esc(x.type)}',k:'${esc(x.k)}',email:'${esc(x.email)}',phone:'${esc(x.phone)}'}`).join(',\n')}\n];\n`;
await fs.writeFile(OUT, js);
console.log(`Wrote ${unique.length} local governments to ${OUT}`);
