/* Nepali Patro Homepage V4 — Phase 2 premium daily dashboard UX */
(function(){'use strict';
function ready(){
 const body=document.body;if(!body||!body.classList.contains('home-redesign'))return;
 body.classList.add('np-v4-ready','np-v4-dashboard');
 document.querySelectorAll('.np-section').forEach((section,i)=>{section.style.setProperty('--np-v4-delay',Math.min(i*35,280)+'ms')});
 const links=document.querySelectorAll('.np-heading a,.full-calendar-btn,.quick-action,.featured-service,.utility-card');
 links.forEach(a=>{a.addEventListener('pointerdown',()=>a.classList.add('np-v4-pressed'),{passive:true});a.addEventListener('pointerup',()=>a.classList.remove('np-v4-pressed'),{passive:true});a.addEventListener('pointercancel',()=>a.classList.remove('np-v4-pressed'),{passive:true})});
 const today=document.querySelector('.today-main-card');
 if(today){today.setAttribute('aria-label','आजको नेपाली पात्रो र पञ्चाङ्ग');today.classList.add('dashboard-primary');}
 const actions=document.querySelector('.quick-actions');
 if(actions){actions.setAttribute('aria-label','आजका मुख्य कार्यहरू');actions.querySelectorAll('.quick-action').forEach((a,i)=>a.style.setProperty('--quick-index',i));}
 const panchang=document.querySelector('.panchang-grid');
 if(panchang)panchang.setAttribute('aria-label','आजको पञ्चाङ्ग विवरण');
 const hub=document.querySelector('.daily-hub');
 if(hub)hub.classList.add('daily-command-center');
 const observe=()=>{if(!('IntersectionObserver' in window))return;const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('np-v4-visible');io.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.05});document.querySelectorAll('.np-section').forEach(s=>io.observe(s));};
 if(document.readyState==='complete')observe();else window.addEventListener('load',observe,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
