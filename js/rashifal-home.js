(()=>{'use strict';
const ROOT=new URL('./',window.location.href).href;
const Z=[
 ['♈','मेष','Aries'],['♉','वृष','Taurus'],['♊','मिथुन','Gemini'],['♋','कर्कट','Cancer'],
 ['♌','सिंह','Leo'],['♍','कन्या','Virgo'],['♎','तुला','Libra'],['♏','वृश्चिक','Scorpio'],
 ['♐','धनु','Sagittarius'],['♑','मकर','Capricorn'],['♒','कुम्भ','Aquarius'],['♓','मीन','Pisces']
];
const style=()=>{if(document.getElementById('npRashiHomeStyle'))return;const s=document.createElement('style');s.id='npRashiHomeStyle';s.textContent=`
#rashifalPreview.np-zodiac{grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
#rashifalPreview .np-rashi-card{position:relative;display:flex;align-items:center;gap:10px;min-height:72px;padding:11px 10px;text-align:left;border-radius:17px;background:var(--np-card,#fff);border:1px solid var(--np-line,#e5e7eb);box-shadow:0 5px 18px rgba(15,23,42,.035);overflow:hidden}
#rashifalPreview .np-rashi-card:before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:var(--np-red,#b91c1c);opacity:.14}
#rashifalPreview .np-rashi-card:hover{transform:translateY(-2px);border-color:#efb0b0;box-shadow:0 10px 25px rgba(15,23,42,.08)}
#rashifalPreview .np-rashi-symbol{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:12px;background:#fff5f5;color:var(--np-red,#b91c1c);font-size:23px;line-height:1}
#rashifalPreview .np-rashi-copy{min-width:0;display:block}
#rashifalPreview .np-rashi-name{display:block;font-size:12px;font-weight:900;line-height:1.25;white-space:nowrap}
#rashifalPreview .np-rashi-en{display:block;margin-top:2px;color:var(--np-muted,#68707d);font:600 8px/1.2 Poppins,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rashifalPreview .np-rashi-arrow{margin-left:auto;color:var(--np-muted,#68707d);font-size:13px;opacity:.65}
#rashifalPreview .np-rashi-label{display:block;grid-column:1/-1;margin:-1px 2px 1px;color:var(--np-muted,#68707d);font-size:10px;font-weight:700}
body.dark.home-redesign #rashifalPreview .np-rashi-symbol{background:#2a1719}
@media(max-width:900px){#rashifalPreview.np-zodiac{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:600px){#rashifalPreview.np-zodiac{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#rashifalPreview .np-rashi-card{min-height:88px;padding:11px 7px;display:flex;flex-direction:column;justify-content:center;text-align:center;gap:5px;border-radius:15px}#rashifalPreview .np-rashi-symbol{width:34px;height:34px;flex-basis:34px;font-size:21px}#rashifalPreview .np-rashi-copy{width:100%}#rashifalPreview .np-rashi-name{font-size:10px}#rashifalPreview .np-rashi-en{font-size:7px}#rashifalPreview .np-rashi-arrow{display:none}}
`;(document.head||document.documentElement).appendChild(s)};
function paint(){const root=document.getElementById('rashifalPreview');if(!root)return;style();root.innerHTML='<span class="np-rashi-label">आफ्नो राशि छान्नुहोस्</span>'+Z.map(([symbol,name,en])=>`<a class="np-rashi-card" href="${ROOT}rashifal/" aria-label="${name} राशिको दैनिक राशिफल"><span class="np-rashi-symbol" aria-hidden="true">${symbol}</span><span class="np-rashi-copy"><span class="np-rashi-name">${name}</span><span class="np-rashi-en">${en} · दैनिक</span></span><span class="np-rashi-arrow" aria-hidden="true">›</span></a>`).join('')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
window.NepaliPatroHome?.subscribe((state,key)=>{if(key==='calendar'||key==='status')paint()});
})();
