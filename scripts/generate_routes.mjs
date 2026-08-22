import fs from 'node:fs';
import path from 'node:path';

// Canonical feature pages are maintained independently. The old generator copied
// index.html into every route, which caused every section to inherit homepage UI.
// Keep only compatibility aliases here and make them lightweight redirects.
const root=path.resolve('.');
const aliases={
  panchang:'panchanga',
  festivals:'parba',
  saait:'saith'
};
const redirect=target=>`<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=../${target}/"><link rel="canonical" href="https://apps.laxmannepal.com.np/Nepali-Patro/${target}/"><title>नेपाली पात्रो</title></head><body><p>पृष्ठ परिवर्तन हुँदैछ… <a href="../${target}/">यहाँ जानुहोस्</a></p><script>location.replace('../${target}/'+location.search+location.hash)</script></body></html>`;

for(const [alias,target] of Object.entries(aliases)){
  fs.mkdirSync(path.join(root,alias),{recursive:true});
  fs.writeFileSync(path.join(root,alias,'index.html'),redirect(target),'utf8');
}

console.log(`Generated ${Object.keys(aliases).length} compatibility redirects; canonical feature pages were preserved.`);
