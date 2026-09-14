/* Saith dataset adapter: keeps feature code on the canonical static-data transport. */
(()=>{
  'use strict';
  const client=window.NPData;
  if(!client?.get)return;
  window.NPSaithData={
    async year(year,options={}){
      return client.get(`data/saith/${year}.json`,{name:'saith',ttl:3600000,bust:false,...options});
    }
  };
})();
