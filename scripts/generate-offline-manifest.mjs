import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||process.cwd());
const out=path.join(root,'offline-manifest.json');
const skip=new Set(['node_modules','.git','_site']);
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else if(e.isFile()&&e.name==='index.html')out.push(p)}return out}
const routes=walk(root).map(p=>{let r=path.relative(root,p).replaceAll(path.sep,'/');if(r==='index.html')return '/Nepali-Patro/';return '/Nepali-Patro/'+r.replace(/\/index\.html$/,'/');}).sort();
const assets=['/Nepali-Patro/','/Nepali-Patro/css/shared-shell.css','/Nepali-Patro/js/shared-shell.js','/Nepali-Patro/partials/header.html','/Nepali-Patro/partials/footer.html','/Nepali-Patro/partials/tool-list.html','/Nepali-Patro/js/tool-list.js','/Nepali-Patro/css/tool-list.css'];
fs.writeFileSync(out,JSON.stringify({version:process.env.PAGES_VERSION||Date.now().toString(),routes,assets},null,2)+'\n');
console.log(`Offline manifest: ${routes.length} routes`);
