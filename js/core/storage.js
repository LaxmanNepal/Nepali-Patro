(()=>{
  const NS='np:';
  const safe=(fn,fallback)=>{try{return fn()}catch{return fallback}};
  const key=k=>NS+k;
  window.NPStorage={
    get(key,fallback=null){return safe(()=>{const v=localStorage.getItem(key(key));return v===null?fallback:JSON.parse(v)},fallback)},
    set(key,value){return safe(()=>{localStorage.setItem(key(key),JSON.stringify(value));return true},false)},
    remove(key){return safe(()=>{localStorage.removeItem(key(key));return true},false)},
    clear(){return safe(()=>{Object.keys(localStorage).filter(k=>k.startsWith(NS)).forEach(k=>localStorage.removeItem(k));return true},false)},
    has(key){return safe(()=>localStorage.getItem(key(key))!==null,false)}
  };
})();
