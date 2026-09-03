(()=>{'use strict';
const existing=window.NepaliPatroHome;
if(existing?.version>=2)return;
const listeners=new Set();
const state={status:'idle',todayAd:'',todayBs:null,calendar:null,clock:'',festivals:null,news:null,finance:null,error:null};
const api={version:2,state,ready:Promise.resolve(state),set(key,value){state[key]=value;listeners.forEach(fn=>{try{fn(state,key,value)}catch(e){console.error('[Nepali Patro homepage controller]',e)}});return value},merge(values){Object.keys(values||{}).forEach(k=>api.set(k,values[k]));return state},get(key){return key?state[key]:state},subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn)},setReady(promise){api.ready=Promise.resolve(promise).then(()=>{state.status='ready';return state}).catch(e=>{state.status='error';state.error=e;throw e})}};
window.NepaliPatroHome=api;
})();
