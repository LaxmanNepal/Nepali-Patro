import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const routes={
  patro:'पात्रो — नेपाली पात्रो',
  calendar:'क्यालेन्डर — नेपाली पात्रो',
  panchanga:'पञ्चाङ्ग — नेपाली पात्रो',
  panchang:'पञ्चाङ्ग — नेपाली पात्रो',
  parba:'पर्व तथा बिदा — नेपाली पात्रो',
  festivals:'पर्व तथा बिदा — नेपाली पात्रो',
  saith:'साइत — नेपाली पात्रो',
  saait:'साइत — नेपाली पात्रो',
  rashifal:'राशिफल — नेपाली पात्रो',
  news:'समाचार केन्द्र — नेपाली पात्रो',
  converter:'मिति रूपान्तरण — नेपाली पात्रो'
};

for(const [route,title] of Object.entries(routes)){
  const html=source
    .replace('<head>','<head><base href="../">')
    .replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`);
  fs.mkdirSync(path.join(root,route),{recursive:true});
  fs.writeFileSync(path.join(root,route,'index.html'),html,'utf8');
}
console.log(`Generated ${Object.keys(routes).length} clean static feature routes.`);
