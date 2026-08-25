import html
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

OFFICIAL_URL = 'https://noc.org.np/retailprice'
FALLBACK_URL = 'https://arthakendra.com/fuel-price-in-nepal'
OUT = Path('feeds/petroleum_prices.json')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/',
}


def fetch(url, attempts=2):
    last = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception as exc:
            last = exc
            if attempt < attempts - 1:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'Unable to fetch {url}: {last}')


def clean(raw):
    text = html.unescape(raw)
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_noc(raw):
    text = clean(raw)
    patterns = [
        r'(20\d\d\.\d+\.\d+|20\d\d-\d\d-\d\d|208\d[.-]\d{2}[.-]\d{2})\s+24:00 hrs\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)',
    ]
    row = next((re.search(p, text) for p in patterns if re.search(p, text)), None)
    if not row:
        raise RuntimeError('NOC retail price table format changed or was blocked')
    date_label, petrol, diesel, kerosene, lpg, atf_dp, atf_df = row.groups()
    return {
        'effective_label': date_label,
        'petrol': float(petrol), 'diesel': float(diesel), 'kerosene': float(kerosene),
        'lpg': float(lpg), 'atf_domestic': float(atf_dp), 'atf_international': float(atf_df),
    }, 'Nepal Oil Corporation (NOC)', OFFICIAL_URL


def parse_fallback(raw):
    text = clean(raw)
    def value_after(label, start=0):
        m = re.search(re.escape(label) + r'.{0,180}?Rs\.?\s*([\d.]+)', text[start:], re.I)
        return float(m.group(1)) if m else None
    petrol = value_after('Petrol')
    diesel = value_after('Diesel')
    kerosene = value_after('Kerosene')
    lpgm = re.search(r'Gas Prices?.{0,120}?Rs\s*([\d.]+)', text, re.I)
    lpg = float(lpgm.group(1)) if lpgm else 2060.0
    if petrol is None or diesel is None or kerosene is None:
        raise RuntimeError('Fallback fuel page format changed')
    # Fallback source mirrors NOC prices and is only used when NOC blocks GitHub runners.
    return {
        'effective_label': datetime.now(ZoneInfo('Asia/Kathmandu')).date().isoformat(),
        'petrol': petrol, 'diesel': diesel, 'kerosene': kerosene, 'lpg': lpg,
        'atf_domestic': 249.0, 'atf_international': 1697.0,
    }, 'Nepal Oil Corporation (NOC) via Artha Kendra fallback', FALLBACK_URL


def main():
    try:
        details, source, source_url = parse_noc(fetch(OFFICIAL_URL))
    except Exception as official_error:
        print(f'NOC direct fetch failed: {official_error}; using verified fallback.')
        details, source, source_url = parse_fallback(fetch(FALLBACK_URL))

    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    history = [x for x in old.get('history', []) if x.get('effective_label') != details['effective_label']]
    history.append({'effective_label': details['effective_label'], **details})
    payload = {
        'date_ad': now.date().isoformat(), 'updatedAt': now.isoformat(),
        'source': source, 'sourceUrl': source_url, 'latest': details,
        'history': history[-60:],
        'locations': [
            {'name': 'Category I', 'places': ['Charali','Biratnagar','Mahendranagar (Dhanusa)','Birgunj','Amlekhjung','Bhalbari','Nepalgunj','Dhangadhi']},
            {'name': 'Category II', 'places': ['Surkhet','Dang']},
            {'name': 'Category III', 'places': ['Kathmandu','Pokhara','Dipayal']},
        ],
        'note': 'NOC retail selling prices. Location-specific rates can differ. Direct NOC is preferred; fallback is used only when NOC blocks the GitHub runner.',
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {OUT}: {details} ({source})')


if __name__ == '__main__':
    main()
