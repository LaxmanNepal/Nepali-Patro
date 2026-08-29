const LIST='https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/main/TV/list.json';
const r=await fetch(`${LIST}?_=${Date.now()}`,{headers:{accept:'application/json'},cache:'no-store'});
if(!r.ok)throw new Error(`Live TV catalog HTTP ${r.status}`);
let raw=await r.json();
for(let i=0;i<6&&!Array.isArray(raw);i++){
  if(raw&&typeof raw==='object'&&Array.isArray(raw.channels)){raw=raw.channels;break}
  if(raw&&typeof raw==='object'&&Array.isArray(raw.data)){raw=raw.data;break}
  if(raw&&typeof raw==='object'&&Array.isArray(raw.items)){raw=raw.items;break}
  if(raw&&typeof raw==='object'&&typeof raw.content==='string'){raw=JSON.parse(raw.content);continue}
  if(typeof raw==='string'){raw=JSON.parse(raw);continue}
  break;
}
if(!Array.isArray(raw)||!raw.length)throw new Error('Live TV catalog contains no channels');
const ids=new Set(); let playable=0;
for(const [i,c] of raw.entries()){
  if(!c||typeof c!=='object')throw new Error(`Channel ${i+1}: not an object`);
  const title=String(c.title||c.name||c.channelName||c.channel||'').trim();
  if(!title)throw new Error(`Channel ${i+1}: missing title`);
  const id=String(c.id||c.slug||title).trim().toLowerCase();
  if(ids.has(id))throw new Error(`Duplicate channel id: ${id}`); ids.add(id);
  const stream=c.m3u8||c.m3u8Url||c.streamUrl||c.stream||c.url;
  if(stream){try{const u=new URL(stream);if(!/^https?:$/.test(u.protocol))throw 0;playable++}catch{throw new Error(`${title}: invalid stream URL`)}}
  const logo=c.logo||c.image||c.thumbnail;
  if(logo){try{new URL(logo)}catch{throw new Error(`${title}: invalid logo URL`)}}
}
console.log(`Live TV contract passed: ${raw.length} channels, ${playable} with primary stream URLs.`);
