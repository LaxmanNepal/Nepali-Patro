import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const failures = [];
const warnings = [];
const skip = new Set(['node_modules', '.git', '.github']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function stripCommentsAndStrings(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '');
}

for (const file of walk(root)) {
  const rel = path.relative(root, file);
  const ext = path.extname(file).toLowerCase();
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }

  if (ext === '.css') {
    const clean = stripCommentsAndStrings(text);
    let depth = 0;
    for (const ch of clean) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth < 0) break;
    }
    if (depth !== 0) failures.push(`Unbalanced CSS braces: ${rel}`);
  }

  if (ext === '.html') {
    if (!/<meta[^>]+name=["']viewport["']/i.test(text)) warnings.push(`Missing viewport meta: ${rel}`);
    if (!/<title>[^<]+<\/title>/i.test(text)) warnings.push(`Missing/empty title: ${rel}`);
    const images = [...text.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
    for (const img of images) {
      if (!/\balt\s*=\s*["']/i.test(img)) failures.push(`Image without alt: ${rel}`);
    }
    for (const tag of text.matchAll(/<(?:button|a)\b[^>]*>/gi)) {
      const open = tag[0];
      if (/\b(?:aria-label|title)\s*=/i.test(open)) continue;
      if (/^(?:<button\b[^>]*>)/i.test(open) && /\b(?:aria-hidden|disabled)\s*=\s*["']true/i.test(open)) continue;
    }
  }
}

if (failures.length) {
  console.error('QUALITY FAILURES');
  console.error(failures.map(x => `- ${x}`).join('\n'));
  process.exitCode = 1;
}
if (warnings.length) {
  console.warn('QUALITY WARNINGS');
  console.warn(warnings.slice(0, 100).map(x => `- ${x}`).join('\n'));
}
if (!failures.length) console.log(`Static quality audit passed with ${warnings.length} warnings.`);
