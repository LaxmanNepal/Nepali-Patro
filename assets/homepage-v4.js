/* Nepali Patro Homepage V4 — small UX upgrades */
(function(){'use strict';
function ready(){
 const body=document.body;if(!body||!body.classList.contains('home-redesign'))return;
 body.classList.add('np-v4-ready');
 document.querySelectorAll('.np-section').forEach((section,i)=>{section.style.setProperty('--np-v4-delay',Math.min(i*35,280)+'ms')});
 const links=document.querySelectorAll('.np-heading a,.full-calendar-btn,.quick-action,.featured-service,.utility-card');
 links.forEach(a=>{a.addEventListener('pointerdown',()=>a.classList.add('np-v4-pressed'),{passive:true});a.addEventListener('pointerup',()=>a.classList.remove('np-v4-pressed'),{passive:true});a.addEventListener('pointercancel',()=>a.classList.remove('np-v4-pressed'),{passive:true})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
