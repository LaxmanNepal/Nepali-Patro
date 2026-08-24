import html
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

OFFICIAL_URL = 'https://negosida.org/'
OUT = Path('feeds/gold_silver.json')
CALENDAR_ROOT = Path('data/calendar')


def nepali_number(value):
    return str(value).translate(str.maketrans('0123456789', '०१२३४५६७८९'))


def fetch(url, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; Nepali-Patro/3.0; +https://apps.laxmannepal.com.np/Nepali-Patro/)'
                },
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.read().decode('utf-8', 'ignore')
        except Exception as exc:
            last_error = exc
            if attempt < attempts - 1:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'Unable to fetch {url}: {last_error}')


def find_bs(ad_date):
    for path in sorted(CALENDAR_ROOT.glob('*.json')):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
            for day in data.get('days', []):
                if day.get('ad', {}).get('date') == ad_date:
                    bs = day.get('bs', {})
                    return bs.get('display') or f"{bs.get('monthNepali', '')} {nepali_number(bs.get('day', ''))}, {bs.get('year', '')}"
        except Exception:
            continue
    return ''


def clean_text(raw):
    text = html.unescape(raw)
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def money(text, pattern):
    match = re.search(pattern, text, re.I)
    if not match:
        raise RuntimeError(f'missing NEGOSIDA field: {pattern}')
    return float(match.group(1).replace(',', ''))


def formatted(value):
    return nepali_number(f'{value:,.2f}'.rstrip('0').rstrip('.'))


def item(kind, price, change, unit='प्रति तोला'):
    return {
        'type': kind,
        'unit': unit,
        'price': formatted(price),
        'change': ('+' if change >= 0 else '-') + formatted(abs(change)),
        'trend': 'up' if change > 0 else ('down' if change < 0 else 'flat'),
        '_numeric': price,
    }


def parse_official(raw):
    text = clean_text(raw)
    # Match the labels and values independently of HTML layout/line breaks.
    patterns = {
        'fine_gold_tola': r'Fine\s+Gold\s+per\s+1\s+Tola\s+NRs\s*([\d,]+(?:\.\d+)?)',
        'gold_22k_tola': r'22\s*KT\s+per\s+1\s+Tola\s+NRs\s*([\d,]+(?:\.\d+)?)',
        'silver_tola': r'Silver\s+per\s+1\s+Tola\s+NRs\s*([\d,]+(?:\.\d+)?)',
        'fine_gold_10g': r'Fine\s+Gold\s+Per\s+10\s+Gram\s+NRs\s*([\d,]+(?:\.\d+)?)',
        'gold_22k_10g': r'22\s*KT\s+per\s+10\s+Gram\s+NRs\s*([\d,]+(?:\.\d+)?)',
        'silver_10g': r'Silver\s+per\s+10\s+Gram\s+NRs\s*([\d,]+(?:\.\d+)?)',
    }
    return {key: money(text, pattern) for key, pattern in patterns.items()}


def main():
    raw = fetch(OFFICIAL_URL)
    try:
        details = parse_official(raw)
    except Exception as exc:
        raise RuntimeError(f'NEGOSIDA page format changed; refusing to publish stale data: {exc}') from exc

    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    ad_date = now.date().isoformat()
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    old_gold = old.get('gold', {})
    old_silver = old.get('silver', {})
    old_fine = float(old_gold.get('_numeric', details['fine_gold_tola'])) if old_gold.get('_numeric') is not None else details['fine_gold_tola']
    old_silver_value = float(old_silver.get('_numeric', details['silver_tola'])) if old_silver.get('_numeric') is not None else details['silver_tola']
    bs_date = find_bs(ad_date)

    gold = item('छापावाल', details['fine_gold_tola'], int(details['fine_gold_tola'] - old_fine))
    silver = item('चाँदी', details['silver_tola'], int(details['silver_tola'] - old_silver_value))
    history = [x for x in old.get('history', []) if x.get('date_ad') != ad_date]
    history.append({'date_ad': ad_date, 'date_bs': bs_date, **details})

    payload = {
        'date_bs': bs_date,
        'date_ad': ad_date,
        'source': 'Nepal Gold and Silver Dealers Association (NEGOSIDA)',
        'sourceUrl': OFFICIAL_URL,
        'updatedAt': now.isoformat(),
        'gold': gold,
        'silver': silver,
        'details': details,
        'history': history[-30:],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {OUT}: {ad_date}, gold={details["fine_gold_tola"]}, silver={details["silver_tola"]}')


if __name__ == '__main__':
    main()
