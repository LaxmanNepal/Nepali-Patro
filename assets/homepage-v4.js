/* Nepali Patro Homepage V4 — Phase 2 premium daily dashboard UX */
(function(){'use strict';
function addPhase2Style(){
 if(document.getElementById('np-v4-phase2-style'))return;
 const style=document.createElement('style');style.id='np-v4-phase2-style';style.textContent='.home-redesign.np-v4-dashboard .today-main-card{isolation:isolate}.home-redesign.np-v4-dashboard .today-main-card:after{content:"";position:absolute;right:-70px;bottom:-100px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(220,38,38,.08),transparent 68%);pointer-events:none;z-index:-1}.home-redesign.np-v4-dashboard .main-date-content{position:relative}.home-redesign.np-v4-dashboard .main-date-content:after{content:"आज";position:absolute;right:0;top:0;font-size:clamp(3rem,8vw,6.5rem);line-height:1;font-weight:900;color:rgba(185,28,28,.045);pointer-events:none}.home-redesign.np-v4-dashboard .daily-command-center{position:relative}.home-redesign.np-v4-dashboard .np-section{scroll-margin-top:80px}.home-redesign.np-v4-dashboard .np-section.np-v4-visible{opacity:1;transform:none}.home-redesign.np-v4-dashboard .np-section{opacity:.001;transform:translateY(10px);transition:opacity .45s ease,transform .45s ease;transition-delay:var(--np-v4-delay,0ms)}.home-redesign.np-v4-dashboard .quick-action{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.home-redesign.np-v4-dashboard .quick-action:hover{transform:translateY(-3px);border-color:rgba(185,28,28,.18);box-shadow:0 14px 30px rgba(0,0,0,.07)}@media(max-width:700px){.home-redesign.np-v4-dashboard .main-date-content:after{font-size:4rem;right:4px}}@media(prefers-reduced-motion:reduce){.home-redesign.np-v4-dashboard .np-section{opacity:1;transform:none;transition:none!important}.home-redesign.np-v4-dashboard .quick-action{transition:none!important}}';document.head.appendChild(style);
}
function ready(){
 const body=document.body;if(!body||!body.classList.contains('home-redesign'))return;
 body.classList.add('np-v4-ready','np-v4-dashboard');addPhase2Style();
 document.querySelectorAll('.np-section').forEach((section,i)=>section.style.setProperty('--np-v4-delay',Math.min(i*35,280)+'ms'));
 document.querySelectorAll('.np-heading a,.full-calendar-btn,.quick-action,.featured-service,.utility-card').forEach(a=>{a.addEventListener('pointerdown',()=>a.classList.add('np-v4-pressed'),{passive:true});a.addEventListener('pointerup',()=>a.classList.remove('np-v4-pressed'),{passive:true});a.addEventListener('pointercancel',()=>a.classList.remove('np-v4-pressed'),{passive:true})});
 const today=document.querySelector('.today-main-card');if(today){today.setAttribute('aria-label','आजको नेपाली पात्रो र पञ्चाङ्ग');today.classList.add('dashboard-primary')}
 const actions=document.querySelector('.quick-actions');if(actions){actions.setAttribute('aria-label','आजका मुख्य कार्यहरू');actions.querySelectorAll('.quick-action').forEach((a,i)=>a.style.setProperty('--quick-index',i))}
 const panchang=document.querySelector('.panchang-grid');if(panchang)panchang.setAttribute('aria-label','आजको पञ्चाङ्ग विवरण');
 const hub=document.querySelector('.daily-hub');if(hub)hub.classList.add('daily-command-center');
 const observe=()=>{if(!('IntersectionObserver' in window)){document.querySelectorAll('.np-section').forEach(s=>s.classList.add('np-v4-visible'));return}const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('np-v4-visible');io.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.05});document.querySelectorAll('.np-section').forEach(s=>io.observe(s))};
 if(document.readyState==='complete')observe();else window.addEventListener('load',observe,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
