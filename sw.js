const CACHE_NAME='nepali-patro-v2026-08-30-01';
const OFFLINE_URL='./offline.html';
const APP_SHELL=['./','./index.html','./manifest.json','./assets/logo.svg','./offline.html','./css/main.css','./css/mobile-nav.css','./js/mobile-nav.js'];
const sameOrigin=u=>u.origin===self.location.origin;
const isCacheable=res=>res&&res.ok&&(res.type==='basic'||res.type==='default');
const put=async(req,res)=>{if(!isCacheable(res))return res;const c=await caches.open(CACHE_NAME);await c.put(req,res.clone());return res};
const networkFirst=async req=>{
  try{return await put(req,await fetch(req))}
  catch{return caches.match(req).then(x=>x||caches.match(OFFLINE_URL))}
};
const staleWhileRevalidate=async req=>{
  const cached=await caches.match(req);
  const network=fetch(req).then(r=>put(req,r)).catch(()=>null);
  return cached||await network||new Response('',{status:503,statusText:'Offline'});
};
const cacheFirst=async req=>{
  const cached=await caches.match(req);
  if(cached)return cached;
  try{return await put(req,await fetch(req))}
  catch{return new Response('',{status:504,statusText:'Offline'})}
};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(!sameOrigin(u))return;
  const nav=r.mode==='navigate'||r.destination==='document';
  const path=u.pathname;
  const data=path.includes('/data/')||path.includes('/feeds/')||path.endsWith('.json');
  const asset=['script','style','font','image','manifest'].includes(r.destination);
  if(nav){e.respondWith(networkFirst(r));return}
  if(data){e.respondWith(staleWhileRevalidate(r));return}
  if(asset){e.respondWith(cacheFirst(r));}
});