import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const files = [];
const walk = (dir) => {
  if (!exists(dir)) return;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replaceAll('\\', '/');
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    if (entry.isDirectory()) walk(rel);
    else if (entry.isFile()) files.push(rel);
  }
};
walk('.');

const html = files.filter((f) => f.endsWith('.html'));
const js = files.filter((f) => /\.(?:js|mjs)$/.test(f));
const css = files.filter((f) => f.endsWith('.css'));
const homepageController = read('js/homepage-controller.js');
const homepageCss = [...homepageController.matchAll(/\['([^']+\.css)'/g)].map((m) => m[1]);
const homepageJs = [...homepageController.matchAll(/\['([^']+\.js)'/g)].map((m) => m[1]);

const routeDirs = ['calendar','panchanga','parba','saith','rashifal','news','converter','itihas-aaja','gold-price','forex'];
const routeReport = routeDirs.map((route) => {
  const file = `${route}/index.html`;
  if (!exists(file)) return { route, file, missing: true, scripts: [], styles: [] };
  const source = read(file);
  return {
    route,
    file,
    missing: false,
    scripts: [...source.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]),
    styles: [...source.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1]),
  };
});

const legacyHomepageFiles = js.filter((f) => /^js\/homepage-(?:v|ui|dashboard|pwa|intelligence|news|finance|performance|runtime|calendar)/i.test(f));
const directFetchFiles = js.filter((f) => {
  const source = read(f);
  return /\bfetch\s*\(/.test(source) && f !== 'js/core/data-client.js';
});
const dataClientConsumers = js.filter((f) => /NPDataClient\./.test(read(f)));
const duplicateHomepageEngines = [
  'homepage-controller.js', 'homepage-runtime.js', 'homepage-ui-v2.js', 'homepage-dashboard-v3.js',
  'homepage-ui-v4.js', 'homepage-pwa-v5.js', 'homepage-intelligence-v6.js', 'homepage-news-v9.js',
  'homepage-finance-v10.js', 'homepage-v2.js'
].filter((name) => exists(`js/${name}`));

const missingHomepageDeps = [...homepageCss.map((f) => `css/${f}`), ...homepageJs.map((f) => `js/${f}`)]
  .filter((f) => !exists(f));

const report = {
  generatedAt: new Date().toISOString(),
  counts: { html: html.length, js: js.length, css: css.length },
  homepage: {
    controller: 'js/homepage-controller.js',
    injectedStyles: homepageCss,
    injectedScripts: homepageJs,
    duplicateEngines: duplicateHomepageEngines,
    missingDependencies: missingHomepageDeps,
  },
  dataLayer: {
    dataClient: exists('js/core/data-client.js'),
    consumers: dataClientConsumers,
    directFetchFiles,
  },
  routes: routeReport,
};

fs.writeFileSync(path.join(root, 'docs/architecture-inventory.json'), JSON.stringify(report, null, 2) + '\n');

const errors = [];
if (!report.homepage.controller) errors.push('Homepage controller missing');
if (missingHomepageDeps.length) errors.push(`Homepage controller references missing assets: ${missingHomepageDeps.join(', ')}`);
for (const route of routeReport) if (route.missing) errors.push(`Missing canonical route: ${route.file}`);
if (!report.dataLayer.dataClient) errors.push('Missing js/core/data-client.js');

console.log(`Architecture inventory: ${html.length} HTML, ${js.length} JS/MJS, ${css.length} CSS files.`);
console.log(`Homepage controller injects ${homepageJs.length} scripts and ${homepageCss.length} styles.`);
console.log(`Homepage legacy/parallel engines detected: ${duplicateHomepageEngines.length}.`);
console.log(`Direct JSON/network fetch consumers outside data-client: ${directFetchFiles.length}.`);
console.log(`Data-client consumers: ${dataClientConsumers.length}.`);
console.log(`Inventory written to docs/architecture-inventory.json`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
