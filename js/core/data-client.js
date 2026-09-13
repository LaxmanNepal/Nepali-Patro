/* Nepali Patro core data client: one cache/error contract for static apps. */
(()=>{
  const memory=new Map();
  const now=()=>Date.now();
  const key=(url,name='default')=>`${name}:${url}`;
  const result=(data,source,at,error=null)=>({data,source,updatedAt:at||null,status:error?'stale':'ok',stale:source==='stale-memory',error:error||null});

  async function fetchJSON(url,name='default',options={}){
    const ttl=Number(options.ttl||300000);
    const cacheKey=key(url,name);
    const cached=memory.get(cacheKey);
    if(cached&&now()-cached.at<ttl){
      const response=result(cached.value,'memory',cached.at);
      response.value=cached.value;
      response.at=cached.at;
      return response;
    }
    try{
      const u=new URL(url,location.href);
      if(options.bust!==false)u.searchParams.set('_',String(now()));
      const r=await fetch(u.href,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const value=await r.json();
      const at=now();
      memory.set(cacheKey,{value,at});
      const response=result(value,'network',at);
      response.value=value;
      response.at=at;
      return response;
    }catch(error){
      if(cached){
        const response=result(cached.value,'stale-memory',cached.at,error);
        response.value=cached.value;
        response.at=cached.at;
        return response;
      }
      throw error;
    }
  }

  async function get(url,name='default',options={}){
    return fetchJSON(url,name,options);
  }

  function clear(name){for(const k of memory.keys())if(!name||k.startsWith(`${name}:`))memory.delete(k)}
  window.NPDataClient={fetchJSON,get,clear};
  window.NPData={get,fetchJSON,clear};
})();
