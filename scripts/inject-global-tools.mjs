import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const skip=new Set(['node_modules','.git']);
const htmlFiles=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.toLowerCase().endsWith('.html'))htmlFiles.push(p);}}
walk(root);
let changed=0;
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const relCss=path.relative(path.dirname(file),path.join(root,'assets/tools-global.css')).replaceAll(path.sep,'/');
  const relJs=path.relative(path.dirname(file),path.join(root,'assets/tools-global.js')).replaceAll(path.sep,'/');
  const cssTag=`<link rel="stylesheet" href="${relCss}">`;
  const jsTag=`<script src="${relJs}" defer></script>`;
  const navLink='<a class="np-all-nav-link" href="/Nepali-Patro/all/" aria-label="सबै उपकरण तथा सेवाहरू">▦ सबै</a>';
  let next=html;
  if(!next.includes('assets/tools-global.css'))next=next.replace(/<\/head>/i,`  ${cssTag}\n</head>`);
  if(!next.includes('assets/tools-global.js'))next=next.replace(/<\/body>/i,`  ${jsTag}\n</body>`);
  if(!next.includes('/Nepali-Patro/all/')){
    if(/<nav\b[^>]*>[\s\S]*?<\/nav>/i.test(next)) next=next.replace(/<\/nav>/i,`  ${navLink}\n</nav>`);
    else if(/class=["'][^"']*(?:nav|navbar|nav-links|menu)[^"']*["']/i.test(next)) next=next.replace(/<\/header>/i,`  ${navLink}\n</header>`);
  }
  if(next!==html){fs.writeFileSync(file,next);changed++;console.log(file);}
}
console.log(`Updated ${changed} HTML pages with global tools and final navbar link.`);
