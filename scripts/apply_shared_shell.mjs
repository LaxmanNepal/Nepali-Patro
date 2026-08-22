import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||process.cwd());
const css='https://apps.laxmannepal.com.np/Nepali-Patro/css/shared-shell.css';
const js='https://apps.laxmannepal.com.np/Nepali-Patro/js/shared-shell.js';
const skip=new Set(['node_modules','.git']);
function files(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...files(p));else if(e.isFile()&&e.name.endsWith('.html'))out.push(p)}return out}
for(const file of files(root)){let s=fs.readFileSync(file,'utf8');
 s=s.replace(/<header\b[\s\S]*?<\/header>\s*/gi,'');
 s=s.replace(/<footer\b[\s\S]*?<\/footer>\s*/gi,'');
 s=s.replace(/<div[^>]*class=["'][^"']*(?:mobile-menu-backdrop|shared-menu-backdrop)[^"']*["'][^>]*>[\s\S]*?<\/div>\s*/gi,'');
 s=s.replace(/<nav[^>]*class=["'][^"']*(?:mobile-menu|shared-mobile-menu)[^"']*["'][^>]*>[\s\S]*?<\/nav>\s*/gi,'');
 s=s.replace(/<link[^>]+shared-shell\.css[^>]*>\s*/gi,'');
 s=s.replace(/<script[^>]+shared-shell\.js[^>]*><\/script>\s*/gi,'');
 if(!s.includes(css))s=s.replace(/<\/head>/i,`<link rel="stylesheet" href="${css}?v=20260822-01"></head>`);
 if(!s.includes(js))s=s.replace(/<\/body>/i,`<script src="${js}?v=20260822-01"></script></body>`);
 fs.writeFileSync(file,s);
 console.log(`shared shell normalized: ${path.relative(root,file)}`);
}
