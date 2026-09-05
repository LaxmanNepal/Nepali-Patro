import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const failures=[]; const warnings=[];
const ignored=new Set(['.git','node_modules','.github']);
function walk(dir){const out=[];for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(ent.name)||ent.name.startsWith('_shell-test'))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())out.push(...walk(p));else out.push(p)}return out}
const files=walk(root);
const html=files.filter(f=>f.endsWith('.html'));
const js=files.filter(f=>f.endsWith('.js')||f.endsWith('.mjs'));
const json=files.filter(f=>f.endsWith('.json'));
for(const f of json){try{JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){failures.push(`Invalid JSON: ${path.relative(root,f)} (${e.message})`)}}
for(const f of js){try{execFileSync('node',['--check',f],{stdio:'pipe'})}catch(e){failures.push(`Invalid JS: ${path.relative(root,f)}`)}}
for(const f of html){const s=fs.readFileSync(f,'utf8');if(!/<html[\s>]/i.test(s))warnings.push(`HTML without html root: ${path.relative(root,f)}`);if(/<img\b(?![^>]*\balt=)/i.test(s))warnings.push(`Image without alt: ${path.relative(root,f)}`);if(/target=["']_blank["']/i.test(s)&&!/(?:rel=["'][^"']*\bnoopener\b)/i.test(s))warnings.push(`_blank link without noopener: ${path.relative(root,f)}`)}
const fixFiles=files.filter(f=>/(fixes|patches)\.(js|css)$/i.test(f));if(fixFiles.length)warnings.push(`Technical-debt fix files remain: ${fixFiles.map(f=>path.relative(root,f)).join(', ')}`);
const large=files.filter(f=>fs.statSync(f).size>2_000_000);for(const f of large)warnings.push(`Large asset >2MB: ${path.relative(root,f)}`);
console.log(`Platform audit: ${files.length} files, ${html.length} HTML, ${js.length} JS, ${json.length} JSON`);
for(const w of warnings)console.warn(`WARN: ${w}`);
if(failures.length){for(const e of failures)console.error(`ERROR: ${e}`);process.exit(1)}
console.log('Platform audit passed: no invalid JSON or JavaScript detected.');
