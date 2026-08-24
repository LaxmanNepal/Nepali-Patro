const CACHE_NAME='nepali-patro-v2026-08-24-02';
const APP_SHELL=['./','./index.html','./manifest.json','./assets/logo.svg'];
const isAppRequest=url=>url.origin===self.location.origin;
const putCache=async(req,res)=>{if(!res||!res.ok)return res;const c=await caches.open(CACHE_NAME);await c.put(req,res.clone());return res};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(!isAppRequest(url))return;
 const doc=req.mode==='navigate'||req.destination==='document';
 const data=url.pathname.includes('/data/')||url.pathname.includes('/feeds/')||url.pathname.endsWith('.json');
 const asset=['script','style','font','image','manifest'].includes(req.destination);
 if(doc){event.respondWith((async()=>{try{const res=await fetch(req,{cache:'no-store'});if(res.ok)await putCache(req,res);return res}catch(e){return (await caches.match(req))||new Response('<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#b91c1c"><title>नेपाली पात्रो · अफलाइन</title><link rel="stylesheet" href="./css/main.css"></head><body><main style="max-width:700px;margin:15vh auto;padding:24px;text-align:center;font-family:system-ui"><h1>नेपाली पात्रो</h1><p>तपाईं अहिले अफलाइन हुनुहुन्छ। पहिले खोलिएको पृष्ठको क्यास उपलब्ध भएमा फर्केर प्रयास गर्नुहोस्।</p><button onclick="location.reload()">फेरि प्रयास गर्नुहोस्</button></main></body></html>',{headers:{'Content-Type':'text/html;charset=utf-8'}})}})()});return}
 if(data){event.respondWith((async()=>{try{const res=await fetch(req,{cache:'no-store'});if(res.ok)await putCache(req,res);return res}catch(e){return caches.match(req)}})());return}
 if(asset){event.respondWith((async()=>{const cached=await caches.match(req);if(cached){fetch(req,{cache:'no-store'}).then(r=>r.ok&&putCache(req,r)).catch(()=>{});return cached}try{return await putCache(req,await fetch(req))}catch(e){return Response.error()}})())}
});