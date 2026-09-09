import fs from 'node:fs/promises';

const source='nepal-goverment/data.js';
const text=await fs.readFile(source,'utf8');
const urls=[...text.matchAll(/u:'(https?:\/\/[^']+)'/g)].map(m=>m[1]);
const unique=[...new Set(urls)];
const results=[];
for(const url of unique){
  const started=Date.now();
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    let res;
    try{res=await fetch(url,{method:'HEAD',redirect:'follow',signal:controller.signal,headers:{'user-agent':'NepaliPatro-Government-Directory/1.0'}})}
    catch{res=await fetch(url,{method:'GET',redirect:'follow',signal:controller.signal,headers:{'user-agent':'NepaliPatro-Government-Directory/1.0'}})}
    clearTimeout(timer);
    results.push({url,status:res.status,ok:res.ok,finalUrl:res.url,ms:Date.now()-started,checkedAt:new Date().toISOString()});
  }catch(error){results.push({url,status:0,ok:false,error:error?.name==='AbortError'?'timeout':String(error?.message||error),ms:Date.now()-started,checkedAt:new Date().toISOString()});}
}
await fs.mkdir('nepal-goverment/data',{recursive:true});
await fs.writeFile('nepal-goverment/data/site-status.json',JSON.stringify({generatedAt:new Date().toISOString(),count:results.length,results},null,2)+'\n');
console.log(`Checked ${results.length} government URLs`);
