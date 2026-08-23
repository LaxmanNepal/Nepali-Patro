import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
const root=path.resolve(process.argv[2]||process.cwd());
const css='https://apps.laxmannepal.com.np/Nepali-Patro/css/shared-shell.css';
const js='https://apps.laxmannepal.com.np/Nepali-Patro/js/shared-shell.js';
const version=(process.env.PAGES_VERSION||execSync('git rev-parse --short HEAD',{cwd:root,encoding:'utf8'}).trim()||Date.now().toString()).replace(/[^a-zA-Z0-9._-]/g,'');
const skip=new Set(['node_modules','.git']);
function files(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...files(p));else if(e.isFile()&&e.name.endsWith('.html'))out.push(p)}return out}
for(const file of files(root)){let s=fs.readFileSync(file,'utf8');
 s=s.replace(/<header\b[\s\S]*?<\/header>\s*/gi,'');
 s=s.replace(/<footer\b[\s\S]*?<\/footer>\s*/gi,'');
 s=s.replace(/<div[^>]*class=["'][^"']*(?:mobile-menu-backdrop|shared-menu-backdrop)[^"']*["'][^>]*>[\s\S]*?<\/div>\s*/gi,'');
 s=s.replace(/<nav[^>]*class=["'][^"']*(?:mobile-menu|shared-mobile-menu)[^"']*["'][^>]*>[\s\S]*?<\/nav>\s*/gi,'');
 s=s.replace(/<link[^>]+shared-shell\.css[^>]*>\s*/gi,'');
 s=s.replace(/<script[^>]+shared-shell\.js[^>]*><\/script>\s*/gi,'');
 s=s.replace(/<link[^>]+data-shared-build[^>]*>\s*/gi,'');
 s=s.replace(/<script[^>]+data-shared-build[^>]*><\/script>\s*/gi,'');
 s=s.replace(/<\/head>/i,`<link rel="stylesheet" href="${css}?v=${version}" data-shared-build="${version}"></head>`);
 s=s.replace(/<\/body>/i,`<script src="${js}?v=${version}" data-shared-build="${version}"></script></body>`);
 fs.writeFileSync(file,s);
 console.log(`shared shell normalized: ${path.relative(root,file)} (${version})`);
}
console.log(`Shared shell build version: ${version}`);
