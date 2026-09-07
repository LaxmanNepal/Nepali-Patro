import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const routes = ['', 'calendar', 'panchanga', 'parba', 'saith', 'rashifal', 'news', 'converter', 'itihas-aaja', 'gold-price', 'forex'];
const warnings = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const route of routes) {
  const file = route ? `${route}/index.html` : 'index.html';
  if (!fs.existsSync(path.join(root, file))) { warnings.push(`Missing SEO page: ${file}`); continue; }
  const html = read(file);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() || '';
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]?.trim() || '';
  const h1 = [...html.matchAll(/<h1\b/gi)].length;
  if (!title) warnings.push(`${file}: missing title`);
  if (!description) warnings.push(`${file}: missing meta description`);
  if (!canonical) warnings.push(`${file}: missing canonical URL`);
  if (h1 !== 1) warnings.push(`${file}: expected exactly one H1, found ${h1}`);
  if (!/<meta[^>]+property=["']og:title["']/i.test(html)) warnings.push(`${file}: missing og:title`);
  if (!/<meta[^>]+property=["']og:description["']/i.test(html)) warnings.push(`${file}: missing og:description`);
  if (!/<script[^>]+type=["']application\/ld\+json["']/i.test(html)) warnings.push(`${file}: missing JSON-LD`);
}

if (warnings.length) console.warn(warnings.join('\n'));
console.log(`SEO audit completed: ${routes.length} canonical page targets checked, ${warnings.length} warning(s).`);
