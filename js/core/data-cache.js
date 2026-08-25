(()=>{
  const memory=new Map();
  const key=k=>`np-cache:${k}`;
  const now=()=>Date.now();
  const parse=raw=>{try{return JSON.parse(raw)}catch{return null}};
  window.NPDataCache={
    read(name,fallback=null){
      if(memory.has(name))return memory.get(name).value;
      try{const item=parse(localStorage.getItem(key(name)));if(!item)return fallback;memory.set(name,item);return item.value??fallback}catch{return fallback}
    },
    meta(name){try{return parse(localStorage.getItem(key(name)))?.savedAt||null}catch{return null}},
    write(name,value){
      const item={savedAt:new Date().toISOString(),value};
      memory.set(name,item);
      try{localStorage.setItem(key(name),JSON.stringify(item));return true}catch{return false}
    },
    remove(name){memory.delete(name);try{localStorage.removeItem(key(name));return true}catch{return false}},
    async fetchJSON(url,name,{ttl=300000,signal}={}){
      const cacheName=name||url;
      const cached=this.read(cacheName,null);
      const savedAt=this.meta(cacheName);
      const age=savedAt?Math.max(0,now()-Date.parse(savedAt)):Infinity;
      if(cached!==null&&age<ttl)return {value:cached,stale:false,source:'cache',savedAt};
      try{
        const res=await fetch(url,{cache:'no-store',signal,headers:{Accept:'application/json'}});
        if(!res.ok)throw new Error(`HTTP ${res.status}`);
        const value=await res.json();
        this.write(cacheName,value);
        return {value,stale:false,source:'network',savedAt:new Date().toISOString()};
      }catch(error){
        if(cached!==null)return {value:cached,stale:true,source:'cache',savedAt,error};
        throw error;
      }
    }
  };
})();
