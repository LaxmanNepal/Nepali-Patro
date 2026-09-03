const CACHE_NAME='nepali-patro-v2026-09-03-01';
const OFFLINE_URL='./offline.html';
const APP_SHELL=['./','./index.html','./manifest.json','./assets/logo.svg','./offline.html','./css/main.css','./css/homepage-redesign.css','./css/mobile-nav.css','./js/mobile-nav.js','./js/homepage-runtime.js'];

const sameOrigin=u=>u.origin===self.location.origin;
const isCacheable=res=>res&&res.ok&&(res.type==='basic'||res.type==='default');
const cacheRequest=req=>{const u=new URL(req.url);u.searchParams.delete('v');return new Request(u.toString(),{method:'GET',headers:req.headers,mode:'same-origin',credentials:req.credentials,redirect:'follow'});};
async function put(req,res){if(!isCacheable(res))return res;try{const c=await caches.open(CACHE_NAME);await c.put(req,res.clone());}catch{}return res;}
async function staleWhileRevalidate(req){const key=cacheRequest(req);const cached=await caches.match(key);const network=fetch(key,{cache:'no-store'}).then(r=>put(key,r)).catch(()=>null);return cached||await network||new Response('',{status:503,statusText:'Offline'});}
async function cacheFirst(req){const key=cacheRequest(req);const cached=await caches.match(key);if(cached)return cached;try{return await put(key,await fetch(key));}catch{return new Response('',{status:504,statusText:'Offline'});}}
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);await Promise.all(APP_SHELL.map(async path=>{try{await c.add(path);}catch{}}));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(!sameOrigin(u))return;if(r.mode==='navigate'||r.destination==='document')return;const path=u.pathname;const data=path.includes('/data/')||path.includes('/feeds/')||path.endsWith('.json');const asset=['script','style','font','image','manifest'].includes(r.destination);if(data){e.respondWith(staleWhileRevalidate(r));return}if(asset){e.respondWith(cacheFirst(r));}});
