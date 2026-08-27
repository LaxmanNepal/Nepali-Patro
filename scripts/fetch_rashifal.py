import json, re, sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'data' / 'rashifal'
SOURCE_BASE = 'https://nepalipatro.com.np/nepali-rashifal/daily'
SIGNS = [
    ('aries', 'मेष', 'Aries'), ('taurus', 'वृष', 'Taurus'), ('gemini', 'मिथुन', 'Gemini'),
    ('cancer', 'कर्कट', 'Cancer'), ('leo', 'सिंह', 'Leo'), ('virgo', 'कन्या', 'Virgo'),
    ('libra', 'तुला', 'Libra'), ('scorpio', 'वृश्चिक', 'Scorpio'), ('sagittarius', 'धनु', 'Sagittarius'),
    ('capricorn', 'मकर', 'Capricorn'), ('aquarius', 'कुम्भ', 'Aquarius'), ('pisces', 'मीन', 'Pisces')
]
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/2.0)'}


def get_bs_for_ad(ad_date):
    for year in range(ad_date.year + 56, ad_date.year + 59):
        r = requests.get(
            f'https://apps.laxmannepal.com.np/Nepali-Patro/data/calendar/{year}.json',
            timeout=20,
        )
        r.raise_for_status()
        for day in r.json().get('days', []):
            if day.get('ad', {}).get('date') == ad_date.isoformat():
                return day.get('bs', {}).get('display'), day.get('weekday', {}).get('nepali')
    raise RuntimeError(f'BS date not found for {ad_date}')


def extract_prediction(soup, nepali, english):
    heading_re = re.compile(rf'^{re.escape(nepali)}\s*-\s*{re.escape(english)}$', re.I)
    heading = None
    for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5']):
        text = ' '.join(tag.get_text(' ', strip=True).split())
        if heading_re.search(text):
            heading = tag
            break
    if heading is None:
        raise RuntimeError(f'Missing source heading for {english}')

    # The Nepali Patro page puts the actual forecast after the sign heading.
    # Walk forward and take the first substantial text block that is not navigation/meta text.
    for node in heading.find_all_next(['p', 'div', 'span', 'li']):
        text = ' '.join(node.get_text(' ', strip=True).split())
        if not text or text == heading.get_text(' ', strip=True):
            continue
        if len(text) < 80 or len(text) > 3000:
            continue
        lower = text.lower()
        if any(x in lower for x in ['daily rashifal', 'weekly rashifal', 'monthly rashifal', 'yearly rashifal']):
            continue
        if 'राशिफल' in text and len(text) < 150:
            continue
        return text
    raise RuntimeError(f'Missing prediction for {english}')


def fetch_sign(slug, nepali, english):
    url = f'{SOURCE_BASE}/{slug}'
    response = requests.get(url, timeout=30, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    prediction = extract_prediction(soup, nepali, english)
    return {
        'id': slug,
        'nepali': nepali,
        'english': english,
        'prediction': prediction,
        'sourceUrl': url,
    }


def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    ad_date = now.date()
    bs_date, weekday = get_bs_for_ad(ad_date)

    signs = [fetch_sign(*sign) for sign in SIGNS]
    ids = [s['id'] for s in signs]
    if len(signs) != 12 or len(set(ids)) != 12:
        raise RuntimeError('Validation failed: expected 12 unique zodiac signs')
    if any(len(s['prediction']) < 40 for s in signs):
        raise RuntimeError('Validation failed: one or more Rashifal predictions are too short')

    payload = {
        'date': ad_date.isoformat(),
        'bsDate': bs_date,
        'weekday': weekday,
        'source': 'Nepali Patro',
        'sourceUrl': SOURCE_BASE,
        'astrologer': 'उपप्रा. लक्ष्मीप्रसाद बराल (फलितज्योतिषाचार्य)',
        'fetchedAt': now.isoformat(),
        'signs': signs,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{ad_date.isoformat()}.json'
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {path} with {len(signs)} unique source-backed signs')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise
