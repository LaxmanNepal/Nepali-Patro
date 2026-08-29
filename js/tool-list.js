(()=>{const ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/';const SITEMAP=`${ROOT}sitemap.xml`;const META={
'calendar/':['📅','पात्रो','नेपाली मिति, महिना र वर्षको पूर्ण पात्रो।'],
'panchanga/':['☀️','पञ्चाङ्ग','तिथि, नक्षत्र, योग र करण।'],
'parba/':['🎉','पर्व','नेपाली पर्व, उत्सव र बिदाहरू।'],
'saith/':['✨','साइत','विवाह, गृहप्रवेश र शुभ समय।'],
'rashifal/':['♈','राशिफल','दैनिक तथा साप्ताहिक राशिफल।'],
'jyotish/':['🔱','ज्योतिष','कुण्डली, ग्रह, दशा र नक्षत्र।'],
'news/':['📰','समाचार','नेपालका ताजा समाचार।'],
'live-tv/':['📺','लाइभ टिभी','नेपाली तथा अन्य Live TV channels।'],
'forex/':['💱','विदेशी मुद्रा','NRB विनिमय दर र विदेशी मुद्रा।'],
'converter/':['⇄','मिति रूपान्तरण','वि.सं. र ई.सं. मिति रूपान्तरण।'],
'itihas-aaja/':['📜','आजको इतिहास','आजको ऐतिहासिक घटना र नेपाली संस्कृति।'],
'gold-price/':['🪙','सुनको मूल्य','नेपालको सुन तथा चाँदीको मूल्य।'],
'vegetables/':['🥦','तरकारी मूल्य','नेपालका तरकारी तथा कृषि मूल्य।'],
'interest-rate/':['📈','ब्याजदर','बैंक तथा वित्तीय संस्थाका ब्याजदर।'],
'patro/':['🗓️','पात्रो','दैनिक नेपाली पात्रो सेवा।'],
'Nepse/':['💹','NEPSE','नेपाली शेयर बजारसम्बन्धी जानकारी।']
};
const fallback=[['📅','पात्रो','calendar/'],['☀️','पञ्चाङ्ग','panchanga/'],['🎉','पर्व','parba/'],['✨','साइत','saith/'],['♈','राशिफल','rashifal/'],['🔱','ज्योतिष','jyotish/'],['📰','समाचार','news/'],['📺','लाइभ टिभी','live-tv/'],['💱','विदेशी मुद्रा','forex/'],['⇄','मिति रूपान्तरण','converter/'],['📜','आजको इतिहास','itihas-aaja/'],['🪙','सुनको मूल्य','gold-price/'],['🥦','तरकारी मूल्य','vegetables/'],['📈','ब्याजदर','interest-rate/'],['🗓️','पात्रो','patro/'],['💹','NEPSE','Nepse/']];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function norm(u){try{const x=new URL(u);let p=x.pathname.replace(/^\/Nepali-Patro\/?/,'');return p.replace(/^\/+|\/+$/g,'')+'/'}catch{return''}}function label(path){const m=META[path];if(m)return m;const slug=path.replace(/\/$/,'').split('/').pop().replace(/[-_]+/g,' ');return ['🧰',slug.replace(/\b\w/g,x=>x.toUpperCase()),'नेपाली पात्रोको उपयोगी सेवा।']}function render(paths){const grid=document.querySelector('[data-tool-list-grid]');if(!grid)return;const seen=new Set(),items=[];paths.forEach(path=>{if(!path||seen.has(path)||path.startsWith('blog/'))return;seen.add(path);const m=label(path);items.push({icon:m[0],title:m[1],desc:m[2],url:ROOT+path})});if(!items.length){fallback.forEach(([icon,title,path])=>items.push({icon,title,desc:META[path]?.[2]||'नेपाली पात्रोको उपयोगी सेवा।',url:ROOT+path}));}grid.innerHTML=items.map(x=>`<a class="tool-card" href="${esc(x.url)}"><span class="tool-card-icon" aria-hidden="true">${x.icon}</span><span class="tool-card-copy"><strong>${esc(x.title)}</strong><small>${esc(x.desc)}</small></span><span class="tool-card-arrow" aria-hidden="true">→</span></a>`).join('')}
async function init(){const grid=document.querySelector('[data-tool-list-grid]');if(!grid)return;try{const r=await fetch(`${SITEMAP}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(r.status);const xml=await r.text();const doc=new DOMParser().parseFromString(xml,'application/xml');const paths=[...doc.querySelectorAll('loc')].map(n=>norm(n.textContent)).filter(Boolean);render(paths)}catch(e){console.warn('Tool list sitemap unavailable:',e);render(fallback.map(x=>x[2]))}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()})();