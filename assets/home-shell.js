/* Nepali Patro — live homepage shell */
(function(){'use strict';
if(window.__NP_HOME_SHELL__)return;window.__NP_HOME_SHELL__=true;
const HOME=new URL('../',location.href);
function boot(){const root=document.querySelector('[data-home-shell]');if(!root)return;
 fetch(HOME.href,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('homepage');return r.text()}).then(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const main=document.querySelector('main');
  const map=[['#homeShellHeader','header.np-header'],['#homeShellMobileNav','nav.mobile-nav'],['#homeShellFooter','footer']];
  map.forEach(([slot,sel])=>{const holder=document.querySelector(slot),fresh=doc.querySelector(sel);if(holder&&fresh)holder.replaceWith(document.importNode(fresh,true));});
  const mobile=document.querySelector('#mobileMenu'),back=document.querySelector('#mobileMenuBackdrop'),freshMenu=doc.querySelector('nav.mobile-menu'),freshBack=doc.querySelector('.mobile-menu-backdrop');
  if(mobile&&freshMenu)mobile.replaceWith(document.importNode(freshMenu,true));else if(freshMenu&&main)main.before(document.importNode(freshMenu,true));
  if(back&&freshBack)back.replaceWith(document.importNode(freshBack,true));else if(freshBack&&document.querySelector('main'))document.querySelector('main').before(document.importNode(freshBack,true));
  document.querySelectorAll('a[href]').forEach(a=>{if(a.getAttribute('href')&&a.getAttribute('href').includes('/Nepali-Patro/all/'))a.classList.add('active')});
  initMobileMenu();document.dispatchEvent(new CustomEvent('np:home-shell-ready'));
 }).catch(()=>initMobileMenu());}
function initMobileMenu(){const b=document.getElementById('mobileMenuBtn'),m=document.getElementById('mobileMenu'),x=document.getElementById('mobileMenuClose'),o=document.getElementById('mobileMenuBackdrop');if(!b||!m)return;const close=()=>{m.classList.remove('open');o&&o.classList.remove('open');b.setAttribute('aria-expanded','false');m.setAttribute('aria-hidden','true')};b.onclick=()=>{m.classList.add('open');o&&o.classList.add('open');b.setAttribute('aria-expanded','true');m.setAttribute('aria-hidden','false')};x&&(x.onclick=close);o&&(o.onclick=close);m.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
