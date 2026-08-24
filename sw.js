const CACHE_NAME='nepali-patro-v2026-08-24-03';
const OFFLINE_URL='./offline.html';
const APP_SHELL=['./','./index.html','./manifest.json','./assets/logo.svg','./offline.html','./css/main.css','./css/mobile-nav.css','./js/mobile-nav.js'];
const sameOrigin=u=>u.origin===self.location.origin;
const save=async(req,res)=>{if(!res||!res.ok)return res;const c=await caches.open(CACHE_NAME);await c.put(req,res.clone());return res};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(!sameOrigin(u))return;const nav=r.mode==='navigate'||r.destination==='document';const data=u.pathname.includes('/data/')||u.pathname.includes('/feeds/')||u.pathname.endsWith('.json');const asset=['script','style','font','image','manifest'].includes(r.destination);if(nav){e.respondWith(fetch(r,{cache:'no-store'}).then(x=>save(r,x)).catch(()=>caches.match(r).then(x=>x||caches.match(OFFLINE_URL))));return}if(data){e.respondWith(fetch(r,{cache:'no-store'}).then(x=>save(r,x)).catch(()=>caches.match(r)));return}if(asset){e.respondWith(caches.match(r).then(cached=>{const update=fetch(r,{cache:'no-store'}).then(x=>save(r,x)).catch(()=>null);return cached||update}));}});
