/* Nepali Patro — Tool List disabled */
(()=>{
  'use strict';
  const removeToolList=()=>{
    document.querySelectorAll('[data-tool-list], .tool-list-section').forEach(el=>el.remove());
  };
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',removeToolList,{once:true});
  }else{
    removeToolList();
  }
  // Also remove it if another script injects the section later.
  new MutationObserver(removeToolList).observe(document.documentElement,{childList:true,subtree:true});
})();