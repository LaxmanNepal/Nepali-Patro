/* Nepali Patro — shared homepage shell loader */
(function(){'use strict';
if(window.__NP_HOME_SHELL__)return;window.__NP_HOME_SHELL__=true;
const HOME=new URL('../',location.href);
function boot(){
 const root=document.querySelector('[data-home-shell]');if(!root)return;
 fetch(HOME.href,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('homepage');return r.text()}).then(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  ['header.np-header','nav.mobile-menu','nav.mobile-nav','footer'].forEach(sel=>{
   const current=document.querySelector(sel),fresh=doc.querySelector(sel);
   if(current&&fresh)current.replaceWith(document.importNode(fresh,true));
  });
  document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(href&&href.includes('/Nepali-Patro/all/'))a.classList.add('active')});
  initMobileMenu();
  document.dispatchEvent(new CustomEvent('np:home-shell-ready'));
 }).catch(()=>{initMobileMenu();});
}
function initMobileMenu(){
 const b=document.getElementById('mobileMenuBtn'),m=document.getElementById('mobileMenu'),x=document.getElementById('mobileMenuClose'),o=document.getElementById('mobileMenuBackdrop');if(!b||!m)return;
 const close=()=>{m.classList.remove('open');o&&o.classList.remove('open');b.setAttribute('aria-expanded','false');m.setAttribute('aria-hidden','true')};
 b.onclick=()=>{m.classList.add('open');o&&o.classList.add('open');b.setAttribute('aria-expanded','true');m.setAttribute('aria-hidden','false')};x&&(x.onclick=close);o&&(o.onclick=close);m.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
