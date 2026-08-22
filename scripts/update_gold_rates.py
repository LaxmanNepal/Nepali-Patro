import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

URL = 'https://negosida.org/'
OUT = Path('feeds/gold_silver.json')
CALENDAR_ROOT = Path('data/calendar')
REQ = urllib.request.Request(URL, headers={'User-Agent': 'Nepali-Patro-Gold-Rate/2.1'})


def nepali_number(value):
    return str(value).translate(str.maketrans('0123456789', '०१२३४५६७८९'))


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


def money(text, pattern):
    match = re.search(pattern, text, re.I)
    if not match:
        raise RuntimeError(f'missing NEGOSIDA field: {pattern}')
    return float(match.group(1).replace(',', ''))


def formatted(value):
    return nepali_number(f'{value:,.0f}')


def item(kind, price, change, unit='प्रति तोला'):
    return {
        'type': kind,
        'unit': unit,
        'price': formatted(price),
        'change': ('+' if change >= 0 else '-') + formatted(abs(change)),
        'trend': 'up' if change > 0 else ('down' if change < 0 else 'flat'),
        '_numeric': price,
    }


def main():
    with urllib.request.urlopen(REQ, timeout=30) as response:
        raw = response.read().decode('utf-8', 'ignore')
    text = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
    text = re.sub(r'\s+', ' ', text)

    fine_gold_tola = money(text, r'Fine Gold\s+per 1 Tola\s+NRs\s*([\d,]+(?:\.\d+)?)')
    gold_22k_tola = money(text, r'22 KT\s+per 1 Tola\s+NRs\s*([\d,]+(?:\.\d+)?)')
    silver_tola = money(text, r'Silver\s+per 1 Tola\s+NRs\s*([\d,]+(?:\.\d+)?)')
    fine_gold_10g = money(text, r'Fine Gold\s+Per 10 Gram\s+NRs\s*([\d,]+(?:\.\d+)?)')
    gold_22k_10g = money(text, r'22 KT\s+per 10 Gram\s+NRs\s*([\d,]+(?:\.\d+)?)')
    silver_10g = money(text, r'Silver\s+per 10 Gram\s+NRs\s*([\d,]+(?:\.\d+)?)')

    ad_date = datetime.now(timezone.utc).date().isoformat()
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    old_gold = old.get('gold', {})
    old_silver = old.get('silver', {})
    old_fine = float(old_gold.get('_numeric', fine_gold_tola)) if old_gold.get('_numeric') is not None else fine_gold_tola
    old_silver_value = float(old_silver.get('_numeric', silver_tola)) if old_silver.get('_numeric') is not None else silver_tola
    bs_date = find_bs(ad_date)
    gold = item('छापावाल', fine_gold_tola, int(fine_gold_tola-old_fine))
    silver = item('चाँदी', silver_tola, int(silver_tola-old_silver_value))
    details = {
        'fine_gold_tola': fine_gold_tola,
        'gold_22k_tola': gold_22k_tola,
        'silver_tola': silver_tola,
        'fine_gold_10g': fine_gold_10g,
        'gold_22k_10g': gold_22k_10g,
        'silver_10g': silver_10g,
    }
    history = [x for x in old.get('history', []) if x.get('date_ad') != ad_date]
    history.append({'date_ad': ad_date, 'date_bs': bs_date, **details})
    payload = {
        'date_bs': bs_date,
        'date_ad': ad_date,
        'source': 'Nepal Gold and Silver Dealers Association (NEGOSIDA)',
        'sourceUrl': URL,
        'updatedAt': datetime.now(timezone.utc).isoformat(),
        'gold': gold,
        'silver': silver,
        'details': details,
        'history': history[-30:],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {OUT}: {ad_date}, gold={fine_gold_tola}, silver={silver_tola}')


if __name__ == '__main__':
    main()
