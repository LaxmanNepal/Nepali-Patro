/* Nepali Patro core data client: canonical JSON transport + freshness contract. */
(()=>{
  'use strict';
  const memory=new Map();
  const now=()=>Date.now();
  const key=(url,name='default')=>`${name}:${url}`;
  const iso=ms=>ms?new Date(ms).toISOString():null;
  const result=(value,source,at,error=null)=>({data:value,value,source,updatedAt:iso(at),at,status:error?'stale':'ok',stale:source==='stale-memory',error:error||null});
  const root='/Nepali-Patro/';

  async function fetchJSON(url,name='default',options={}){
    const ttl=Number(options.ttl||300000);
    const cacheKey=key(url,name);
    const cached=memory.get(cacheKey);
    if(cached&&now()-cached.at<ttl)return result(cached.value,'memory',cached.at);
    try{
      const u=new URL(url,location.origin+root);
      if(options.bust!==false)u.searchParams.set('_',String(now()));
      const r=await fetch(u.href,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const value=await r.json();
      const at=now();
      memory.set(cacheKey,{value,at});
      return result(value,'network',at);
    }catch(error){
      if(cached)return result(cached.value,'stale-memory',cached.at,error);
      throw error;
    }
  }

  async function get(nameOrUrl,options={}){
    const datasets={
      calendar:year=>`data/calendar/${year}.json`,
      years:'data/years.json',
      conversion:'data/conversion-index.json',
      gold:'feeds/gold_silver.json',
      forex:'feeds/forex.json',
      news:'feeds/news.json',
      history:'data/itihas/history.json'
    };
    if(Object.prototype.hasOwnProperty.call(datasets,nameOrUrl)){
      const target=datasets[nameOrUrl];
      const url=typeof target==='function'?target(options.year):target;
      if(!url||url.includes('undefined'))throw new Error(`Missing dataset parameter: ${nameOrUrl}`);
      return fetchJSON(url,nameOrUrl,options);
    }
    return fetchJSON(nameOrUrl,options.name||'default',options);
  }

  function clear(name){for(const k of memory.keys())if(!name||k.startsWith(`${name}:`))memory.delete(k)}
  window.NPDataClient={fetchJSON,get,clear};
  window.NPData={get,fetchJSON,clear};
})();
