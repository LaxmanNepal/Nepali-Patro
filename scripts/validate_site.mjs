import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { adToBs, bsToAd } from 'nepali-calendar-panchang';

const root = path.resolve('.');
const fail = [];

const need = (p) => {
  if (!fs.existsSync(path.join(root, p))) fail.push(`Missing: ${p}`);
};

const readJSON = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  } catch {
    fail.push(`Invalid JSON: ${p}`);
    return null;
  }
};

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

[
  'index.html',
  'manifest.json',
  'sw.js',
  'package.json',
  'package-lock.json',
  'partials/header.html',
  'partials/footer.html',
  'js/section-pages-v2.js'
].forEach(need);

const routes = [
  'calendar',
  'panchanga',
  'parba',
  'saith',
  'rashifal',
  'news',
  'converter',
  'itihas-aaja',
  'gold-price',
  'forex'
];

routes.forEach((route) => need(`${route}/index.html`));

const pkg = readJSON('package.json');
const lock = readJSON('package-lock.json');

if (
  pkg?.dependencies?.['nepali-calendar-panchang'] !== '1.0.2' ||
  lock?.packages?.['']?.dependencies?.['nepali-calendar-panchang'] !== '1.0.2'
) {
  fail.push('Panchang dependency mismatch');
}

const years = readJSON('data/years.json');
const conv = readJSON('data/conversion-index.json');
let all = [];

if (!years || years.minYear !== 2040 || years.maxYear !== 2100 || years.years?.length !== 61) {
  fail.push('Expected BS 2040-2100 metadata');
}

if (years) {
  for (const meta of years.years) {
    const data = readJSON(`data/calendar/${meta.year}.json`);
    if (!data) continue;

    if (
      data.year !== meta.year ||
      data.days.length !== meta.days ||
      data.calendar?.monthLengths?.length !== 12
    ) {
      fail.push(`Calendar metadata mismatch ${meta.year}`);
    }

    const bs = new Set();
    const ad = new Set();

    for (const x of data.days) {
      const bsKey = `${x.bs?.year}-${x.bs?.month}-${x.bs?.day}`;

      if (bs.has(bsKey)) fail.push(`Duplicate BS ${bsKey}`);
      bs.add(bsKey);

      if (ad.has(x.ad?.date)) fail.push(`Duplicate AD ${x.ad?.date}`);
      ad.add(x.ad?.date);

      if (!x.bs?.year || !x.bs?.month || !x.bs?.day || !x.ad?.date || !x.weekday?.nepali) {
        fail.push(`Incomplete day ${meta.year}`);
      }

      for (const key of ['tithi', 'nakshatra', 'yoga', 'karana']) {
        if (!x[key]) fail.push(`Missing ${key} ${x.ad?.date}`);
      }

      all.push(x);
    }
  }
}

if (conv && conv.items?.length !== all.length) {
  fail.push('Conversion index count mismatch');
}

if (conv) {
  if (new Set(conv.items.map((x) => x.bs)).size !== conv.items.length) {
    fail.push('Duplicate BS conversion index');
  }
  if (new Set(conv.items.map((x) => x.ad)).size !== conv.items.length) {
    fail.push('Duplicate AD conversion index');
  }
}

const converter = readJSON('data/converter-index.json');
if (
  !converter ||
  converter.minBS > 1970 ||
  converter.maxBS < 2100 ||
  !Array.isArray(converter.items) ||
  converter.items.length < 40000
) {
  fail.push('Converter index incomplete');
}

for (const [y, m, d] of [
  [2040, 1, 1],
  [2050, 12, 30],
  [2060, 5, 15],
  [2083, 5, 10],
  [2099, 12, 30],
  [2100, 12, 30]
]) {
  try {
    const ad = bsToAd(y, m, d);
    const bs = adToBs(ad);
    if (+bs.year !== y || +bs.month !== m || +bs.day !== d) {
      fail.push(`Round trip failed ${y}-${m}-${d}`);
    }
  } catch {
    fail.push(`Converter failed ${y}-${m}-${d}`);
  }
}

const expected = {
  calendar: 'पूर्ण नेपाली पात्रो',
  panchanga: 'विस्तृत पञ्चाङ्ग',
  parba: 'पर्व तथा बिदा',
  saith: 'साइत तथा शुभ दिन',
  rashifal: 'राशिफल',
  news: 'समाचार',
  converter: 'मिति रूपान्तरण',
  'itihas-aaja': 'इतिहास',
  'gold-price': 'सुन',
  forex: 'विदेशी मुद्रा'
};

for (const route of routes) {
  const html = read(`${route}/index.html`);

  if (/(?:src|href)=["'](?:\.\.?\/|\/)(?:css|js|data)\//i.test(html)) {
    fail.push(`Relative asset URL ${route}`);
  }

  if (/js\/app\.js|homepage-ui\.js/i.test(html)) {
    fail.push(`Homepage engine leakage ${route}`);
  }

  if (!html.toLowerCase().includes(expected[route].toLowerCase())) {
    fail.push(`Missing page marker ${route}`);
  }
}

for (const p of ['partials/header.html', 'partials/footer.html']) {
  const html = read(p);
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);

  if (links.some((x) => !/^https:\/\//i.test(x))) {
    fail.push(`Non-full link in ${p}`);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue;

    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(filePath);
    } else if (entry.isFile() && /\.(?:js|mjs)$/i.test(filePath)) {
      try {
        execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
      } catch {
        fail.push(`JavaScript syntax error: ${path.relative(root, filePath)}`);
      }
    }
  }
}

walk(root);

if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}

console.log(
  `Nepali Patro validation passed: ${all.length} dates, BS 2040-2100, converter 1970-2100, canonical routes, full links and JS syntax.`
);
