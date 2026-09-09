import fs from 'node:fs/promises';

const BASE = 'https://www.mofaga.gov.np/local-contact?page=';
const PAGES = 51;
const OUT = 'nepal-goverment/data/local-governments.js';
const clean = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i')) || [])[1] || '';
const esc = s => String(s ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ');

const provinceIds = new Map([
  ['कोशी प्रदेश','koshi'],['मधेश प्रदेश','madhesh'],['बागमती प्रदेश','bagmati'],['गण्डकी प्रदेश','gandaki'],
  ['लुम्बिनी प्रदेश','lumbini'],['कर्णाली प्रदेश','karnali'],['सुदूरपश्चिम प्रदेश','sudurpashchim']
]);
function typeOf(name){
  if(name.includes('महानगरपालिका')) return 'metropolitan';
  if(name.includes('उप-महानगरपालिका') || name.includes('उपमहानगरपालिका')) return 'submetropolitan';
  if(name.includes('नगरपालिका')) return 'municipality';
  if(name.includes('गाउँपालिका') || name.includes('गाँउपालिका')) return 'rural';
  return 'district-coordination';
}
function websiteFromEmail(email){
  const domain = email.split('@')[1] || '';
  return domain.endsWith('.gov.np') ? `https://${domain}/` : '';
}
async function fetchPage(page){
  const r = await fetch(`${BASE}${page}`, {headers:{'user-agent':'Nepali-Patro Government Directory Sync/1.0'}, signal:AbortSignal.timeout(30000)});
  if(!r.ok) throw new Error(`HTTP ${r.status} page ${page}`);
  return r.text();
}
function parse(html){
  const out=[];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for(const row of rows){
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
    if(cells.length < 6) continue;
    const values = cells.map(clean);
    const no = values[0].replace(/[^0-9]/g,'');
    if(!no || Number(no)<1 || Number(no)>753) continue;
    const province=values[1], name=values[2], district=values[3], email=values[5];
    if(!provinceIds.has(province) || !name || !district) continue;
    const websiteCell = cells[4];
    const href = attr((websiteCell.match(/<a[^>]*>/i)||[''])[0], 'href');
    let url = href;
    if(url && url.startsWith('//')) url='https:'+url;
    else if(url && url.startsWith('/')) url='https://www.mofaga.gov.np'+url;
    if(!/^https?:\/\//i.test(url)) url=websiteFromEmail(email);
    out.push({id:`lg-${no}`,n:name,e:'Local Government of Nepal',u:url,c:'स्थानीय शासन',l:'local',p:provinceIds.get(province),district,type:typeOf(name),email,phone:values[6]||'',source:'MoFAGA',sourceId:Number(no)});
  }
  return out;
}

const all=[]; const errors=[];
for(let page=1; page<=PAGES; page++){
  try { const rows=parse(await fetchPage(page)); all.push(...rows); console.log(`page ${page}: ${rows.length}`); }
  catch(e){ errors.push(`page ${page}: ${e.message}`); console.error(errors.at(-1)); }
}
const dedup=[...new Map(all.map(x=>[x.id,x])).values()].sort((a,b)=>a.sourceId-b.sourceId);
if(dedup.length < 700) throw new Error(`Safety check failed: only ${dedup.length} local governments parsed.`);
const content=`// Auto-generated from MoFAGA Local Level Contact. Do not edit manually.\n// Source: https://www.mofaga.gov.np/local-contact\n// Generated: ${new Date().toISOString()}\nwindow.GOVERNMENT_LOCAL_GOVERNMENTS = ${JSON.stringify(dedup,null,2)};\nwindow.GOVERNMENT_LOCAL_SYNC = ${JSON.stringify({source:'MoFAGA',count:dedup.length,generatedAt:new Date().toISOString(),errors})};\n`;
await fs.mkdir('nepal-goverment/data',{recursive:true});
await fs.writeFile(OUT,content);
console.log(`Wrote ${OUT} with ${dedup.length} records.`);
if(errors.length) process.exitCode=2;
