import json, re, sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'data' / 'rashifal-weekly'
SOURCE = 'https://nepalipatro.com.np/rashifal/weekly'
SIGNS = [
    ('aries', 'मेष', 'Aries'), ('taurus', 'वृष', 'Taurus'), ('gemini', 'मिथुन', 'Gemini'),
    ('cancer', 'कर्कट', 'Cancer'), ('leo', 'सिंह', 'Leo'), ('virgo', 'कन्या', 'Virgo'),
    ('libra', 'तुला', 'Libra'), ('scorpio', 'वृश्चिक', 'Scorpio'), ('sagittarius', 'धनु', 'Sagittarius'),
    ('capricorn', 'मकर', 'Capricorn'), ('aquarius', 'कुम्भ', 'Aquarius'), ('pisces', 'मीन', 'Pisces')
]
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/2.0)'}


def extract_sign(soup, nepali, english):
    pattern = re.compile(rf'^{re.escape(nepali)}\s*-\s*{re.escape(english)}', re.I)
    heading = None
    for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5']):
        text = ' '.join(tag.get_text(' ', strip=True).split())
        if pattern.search(text):
            heading = tag
            break
    if heading is None:
        raise RuntimeError(f'Missing weekly heading: {english}')

    for node in heading.find_all_next(['p', 'div', 'span', 'li']):
        text = ' '.join(node.get_text(' ', strip=True).split())
        if len(text) < 100 or len(text) > 4000:
            continue
        low = text.lower()
        if any(x in low for x in ['weekly rashifal', 'daily rashifal', 'monthly rashifal', 'yearly rashifal']):
            continue
        if 'राशिफल' in text and len(text) < 180:
            continue
        return text
    raise RuntimeError(f'Missing weekly prediction: {english}')


def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    response = requests.get(SOURCE, timeout=30, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    page_text = ' '.join(soup.stripped_strings)

    label_match = re.search(r'([\u0900-\u097F]+\s+\d+\s*[–-]\s*\d+,\s*\d{4})', page_text)
    week_label = label_match.group(1) if label_match else ''

    # Weekly Rashifal is published for a Monday-Sunday cycle. Keep a stable
    # ISO date key so the UI can navigate week-by-week as snapshots accumulate.
    week_start = now.date() - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=6)
    signs = []
    for slug, nepali, english in SIGNS:
        signs.append({
            'id': slug,
            'nepali': nepali,
            'english': english,
            'prediction': extract_sign(soup, nepali, english),
        })

    if len(signs) != 12 or len({x['id'] for x in signs}) != 12:
        raise RuntimeError('Validation failed: expected 12 unique weekly signs')
    if any(len(x['prediction']) < 60 for x in signs):
        raise RuntimeError('Validation failed: one or more weekly predictions are too short')

    payload = {
        'weekStart': week_start.isoformat(),
        'weekEnd': week_end.isoformat(),
        'weekLabel': week_label,
        'source': 'Nepali Patro',
        'sourceUrl': SOURCE,
        'astrologer': 'उपप्रा. लक्ष्मीप्रसाद बराल (फलितज्योतिषाचार्य)',
        'fetchedAt': now.isoformat(),
        'signs': signs,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{week_start.isoformat()}.json'
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {path} with 12 weekly signs')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise
