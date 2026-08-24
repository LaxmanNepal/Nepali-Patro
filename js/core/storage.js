(()=>{
  const NS='np:';
  const safe=(fn,fallback)=>{try{return fn()}catch{return fallback}};
  window.NPStorage={
    get(key,fallback=null){return safe(()=>{const v=localStorage.getItem(NS+key);return v===null?fallback:JSON.parse(v)},fallback)},
    set(key,value){return safe(()=>{localStorage.setItem(NS+key,JSON.stringify(value));return true},false)},
    remove(key){return safe(()=>{localStorage.removeItem(NS+key);return true},false)},
    clear(){return safe(()=>{Object.keys(localStorage).filter(k=>k.startsWith(NS)).forEach(k=>localStorage.removeItem(k));return true},false)}
  };
})();
