import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const fail = [];
const readJSON = (p) => {
  try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); }
  catch (e) { fail.push(`Invalid JSON: ${p} (${e.message})`); return null; }
};

const years = readJSON('data/years.json');
if (!years || years.schemaVersion !== 5) fail.push('data/years.json: schemaVersion must be 5');
if (years && (years.minYear !== 2040 || years.maxYear !== 2100)) fail.push('data/years.json: expected BS 2040-2100');

for (const meta of years?.years || []) {
  const data = readJSON(`data/calendar/${meta.year}.json`);
  if (!data) continue;
  if (data.schemaVersion !== 5) fail.push(`BS ${meta.year}: schemaVersion must be 5`);
  if (!Array.isArray(data.days)) { fail.push(`BS ${meta.year}: days must be an array`); continue; }
  for (const [i, d] of data.days.entries()) {
    const required = ['bs','ad','weekday','tithi','nakshatra','yoga','karana','sun','moon','rahuKaal','events'];
    for (const key of required) if (d[key] === undefined || d[key] === null) fail.push(`BS ${meta.year} day ${i}: missing ${key}`);
    if (d.bs && (d.bs.year !== meta.year || !Number.isInteger(d.bs.month) || !Number.isInteger(d.bs.day))) fail.push(`BS ${meta.year} day ${i}: invalid BS identity`);
    if (d.ad && !/^\d{4}-\d{2}-\d{2}$/.test(d.ad.date || '')) fail.push(`BS ${meta.year} day ${i}: invalid AD date`);
    if (d.events && (!Array.isArray(d.events) || d.events.some(x => typeof x !== 'string'))) fail.push(`BS ${meta.year} day ${i}: invalid events`);
  }
}

const conversion = readJSON('data/conversion-index.json');
if (conversion && (conversion.schemaVersion !== 2 || conversion.minBS !== 2040 || conversion.maxBS !== 2100)) fail.push('conversion-index.json: contract mismatch');
const converter = readJSON('data/converter-index.json');
if (!converter || !Array.isArray(converter.items) || converter.items.length === 0) fail.push('converter-index.json: empty or invalid');

if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}
console.log('Contract validation passed: calendar records, manifests and conversion indexes match the current data contracts.');
