import html
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

OFFICIAL_URL = 'https://noc.org.np/retailprice'
OUT = Path('feeds/petroleum_prices.json')


def fetch(url, attempts=3):
    last = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; Nepali-Patro/1.0)'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception as exc:
            last = exc
            if attempt < attempts - 1:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'Unable to fetch NOC: {last}')


def clean(raw):
    text = html.unescape(raw)
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse(raw):
    text = clean(raw)
    # NOC retailprice publishes a table with the latest effective date and prices.
    row = re.search(r'(20\d\d\.\d+\.\d+|20\d\d-\d\d-\d\d)\s+\|?\s*24:00 hrs\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)', text)
    if not row:
        # Fallback for flattened HTML where table separators disappear.
        row = re.search(r'(208\d[.-]\d{2}[.-]\d{2}|20\d\d[.-]\d{2}[.-]\d{2})\s+24:00 hrs\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)', text)
    if not row:
        raise RuntimeError('NOC retail price table format changed')
    date_label, petrol, diesel, kerosene, lpg, atf_dp, atf_df = row.groups()
    return {
        'effective_label': date_label,
        'petrol': float(petrol),
        'diesel': float(diesel),
        'kerosene': float(kerosene),
        'lpg': float(lpg),
        'atf_domestic': float(atf_dp),
        'atf_international': float(atf_df),
    }


def main():
    details = parse(fetch(OFFICIAL_URL))
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    history = [x for x in old.get('history', []) if x.get('effective_label') != details['effective_label']]
    history.append({'effective_label': details['effective_label'], **details})
    payload = {
        'date_ad': now.date().isoformat(),
        'updatedAt': now.isoformat(),
        'source': 'Nepal Oil Corporation (NOC)',
        'sourceUrl': OFFICIAL_URL,
        'latest': details,
        'history': history[-60:],
        'locations': [
            {'name': 'Category I', 'places': ['Charali','Biratnagar','Mahendranagar (Dhanusa)','Birgunj','Amlekhjung','Bhalbari','Nepalgunj','Dhangadhi']},
            {'name': 'Category II', 'places': ['Surkhet','Dang']},
            {'name': 'Category III', 'places': ['Kathmandu','Pokhara','Dipayal']},
        ],
        'note': 'Retail selling price from NOC. Location-specific rates may differ; the latest retailprice table is used for the main national rate display.'
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {OUT}: {details}')


if __name__ == '__main__':
    main()
