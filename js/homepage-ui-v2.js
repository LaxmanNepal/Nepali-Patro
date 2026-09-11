(()=>{'use strict';
if(window.NepaliPatroUIV2)return;window.NepaliPatroUIV2=true;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
function reveal(){const sections=$$('.home-redesign .np-section');if(!('IntersectionObserver'in window)){sections.forEach(x=>x.classList.add('ui-visible'));return}const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('ui-visible');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.04});sections.forEach(s=>{s.classList.add('ui-reveal');io.observe(s)})}
function header(){const h=$('.np-header');if(!h)return;const paint=()=>h.classList.toggle('np-scrolled',scrollY>24);addEventListener('scroll',paint,{passive:true});paint()}
function topButton(){const b=document.createElement('button');b.type='button';b.className='np-top-button';b.setAttribute('aria-label','माथि जानुहोस्');b.title='माथि जानुहोस्';b.textContent='↑';b.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));document.body.appendChild(b);const paint=()=>b.classList.toggle('is-visible',scrollY>520);addEventListener('scroll',paint,{passive:true});paint()}
function keyboard(){document.addEventListener('keydown',e=>{if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return;const a=document.activeElement;if(['INPUT','TEXTAREA','SELECT'].includes(a?.tagName)||a?.isContentEditable)return;const target=$('.mobile-menu:not([aria-hidden="true"]) a')||$('.np-heading a');if(target){e.preventDefault();target.focus()}})}
function boot(){reveal();header();topButton();keyboard()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();