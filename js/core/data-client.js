/* Nepali Patro core data client: one cache/error contract for static apps. */
(()=>{
  const memory=new Map();
  const now=()=>Date.now();
  const key=(url,name='default')=>`${name}:${url}`;
  async function fetchJSON(url,name='default',options={}){
    const ttl=Number(options.ttl||300000);
    const cacheKey=key(url,name);
    const cached=memory.get(cacheKey);
    if(cached&&now()-cached.at<ttl)return {value:cached.value,source:'memory',at:cached.at};
    let networkError;
    try{
      const u=new URL(url,location.href);
      if(options.bust!==false)u.searchParams.set('_',String(now()));
      const r=await fetch(u.href,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const value=await r.json();
      memory.set(cacheKey,{value,at:now()});
      return {value,source:'network',at:now()};
    }catch(error){
      networkError=error;
      if(cached)return {value:cached.value,source:'stale-memory',at:cached.at,error};
      throw networkError;
    }
  }
  function clear(name){for(const k of memory.keys())if(!name||k.startsWith(`${name}:`))memory.delete(k)}
  window.NPDataClient={fetchJSON,clear};
})();
