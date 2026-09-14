/* Nepali Patro shared freshness UI: one status vocabulary for static datasets. */
(()=>{
  'use strict';
  const labels={network:['●','ताजा','fresh'],memory:['●','क्यास','cached'],'stale-memory':['●','पुरानो क्यास','stale'],error:['●','उपलब्ध छैन','error']};
  const ensure=()=>{let el=document.querySelector('#npDataStatus');if(el)return el;el=document.createElement('div');el.id='npDataStatus';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9999;padding:7px 10px;border:1px solid rgba(0,0,0,.1);border-radius:999px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);box-shadow:0 4px 18px rgba(0,0,0,.08);font:600 12px/1.2 system-ui,sans-serif;color:#475569;opacity:0;transition:opacity .2s ease;pointer-events:none';document.body.appendChild(el);return el};
  const show=(state,name)=>{const el=ensure(),x=labels[state]||labels.error;el.dataset.state=x[2];el.textContent=`${x[0]} ${name||'डेटा'} · ${x[1]}`;el.style.opacity='1';clearTimeout(el._timer);el._timer=setTimeout(()=>{el.style.opacity='.72'},2200)};
  const wrap=(fn,name)=>async(...args)=>{try{const r=await fn(...args);show(r?.source||'network',name);return r}catch(e){show('error',name);throw e}};
  const boot=()=>{if(!window.NPData||window.NPData.__statusWrapped)return;window.NPData.get=wrap(window.NPData.get,'डेटा');if(window.NPData.fetchJSON)window.NPData.fetchJSON=wrap(window.NPData.fetchJSON,'डेटा');window.NPData.__statusWrapped=true};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
