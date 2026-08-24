(()=>{
  const memory=new Map();
  const key=k=>`np-cache:${k}`;
  window.NPDataCache={
    read(name,fallback=null){try{const raw=localStorage.getItem(key(name));if(!raw)return fallback;const item=JSON.parse(raw);return item?.value??fallback}catch{return fallback}},
    write(name,value){try{localStorage.setItem(key(name),JSON.stringify({savedAt:new Date().toISOString(),value}));memory.set(name,value);return true}catch{return false}},
    async fetchJSON(url,name,{ttl=300000,signal}={}){
      const cacheName=name||url;const cached=this.read(cacheName,null);
      try{const res=await fetch(url,{cache:'no-store',signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);const value=await res.json();this.write(cacheName,value);return {value,stale:false,source:'network'}
      }catch(error){if(cached!==null)return {value:cached,stale:true,source:'cache',error};throw error}
    }
  };
})();
