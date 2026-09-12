/* Nepali Patro V4 Phase 3 — Smart Today prioritization */
(function(){'use strict';
const ready=()=>{const body=document.body;if(!body||!body.classList.contains('home-redesign'))return;
 const section=document.querySelector('.daily-hub');if(!section)return;
 section.classList.add('smart-today');
 const cards=[...section.querySelectorAll('.daily-hub-card')];
 const hasContent=el=>el&&el.textContent.replace(/\s+/g,' ').trim().length>0;
 const score=el=>{let s=0,t=(el.textContent||'').toLowerCase();if(/लोड हुँदैछ|loading/.test(t))s-=10;if(hasContent(el))s+=2;if(el.querySelector('[href]'))s+=1;if(/आज|विशेष|पर्व|बिदा|राशिफल/.test(t))s+=2;return s};
 cards.sort((a,b)=>score(b)-score(a)).forEach((card,i)=>{card.style.setProperty('--smart-order',i);card.classList.toggle('smart-primary',i===0)});
 const badge=document.createElement('span');badge.className='smart-today-badge';badge.textContent='आजको प्राथमिकता';
 const heading=section.querySelector('.np-heading');if(heading&&!heading.querySelector('.smart-today-badge'))heading.appendChild(badge);
 const observe=new MutationObserver(()=>{cards.forEach(c=>{const content=c.querySelector('.np-cards,.np-zodiac');if(content&&content.textContent&&!/लोड हुँदैछ/.test(content.textContent)){c.classList.add('smart-ready')}})});
 cards.forEach(c=>observe.observe(c,{subtree:true,childList:true,characterData:true}));
 setTimeout(()=>{cards.forEach(c=>{if(c.textContent&&!/लोड हुँदैछ/.test(c.textContent))c.classList.add('smart-ready')})},1200);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
