import json, re, sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup, Tag

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'data' / 'rashifal'
SOURCE_BASE = 'https://nepalipatro.com.np/nepali-rashifal/daily'
SIGNS = [
    ('aries', 'मेष', 'Aries'), ('taurus', 'वृष', 'Taurus'), ('gemini', 'मिथुन', 'Gemini'),
    ('cancer', 'कर्कट', 'Cancer'), ('leo', 'सिंह', 'Leo'), ('virgo', 'कन्या', 'Virgo'),
    ('libra', 'तुला', 'Libra'), ('scorpio', 'वृश्चिक', 'Scorpio'), ('sagittarius', 'धनु', 'Sagittarius'),
    ('capricorn', 'मकर', 'Capricorn'), ('aquarius', 'कुम्भ', 'Aquarius'), ('pisces', 'मीन', 'Pisces')
]
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/4.0)'}


def normalize(text):
    return re.sub(r'\s+', ' ', str(text or '').replace('\xa0', ' ')).strip()


def get_bs_for_ad(ad_date):
    for year in range(ad_date.year + 56, ad_date.year + 59):
        r = requests.get(f'https://apps.laxmannepal.com.np/Nepali-Patro/data/calendar/{year}.json', timeout=20)
        r.raise_for_status()
        for day in r.json().get('days', []):
            if day.get('ad', {}).get('date') == ad_date.isoformat():
                return day.get('bs', {}).get('display'), day.get('weekday', {}).get('nepali')
    raise RuntimeError(f'BS date not found for {ad_date}')


def looks_like_heading(text, nepali, english):
    compact = re.sub(r'\s+', '', text).lower()
    return nepali in text and english.lower() in compact and any(x in text for x in ('-', '–', '—', ':'))


def clean_prediction(text, nepali, english):
    text = normalize(text)
    # Remove common UI/source prefixes without altering the actual forecast.
    text = re.sub(rf'^{re.escape(nepali)}\s*[-–—:]?\s*{re.escape(english)}\s*', '', text, flags=re.I)
    return text.strip(' -–—:|')


def extract_prediction(soup, nepali, english):
    # First pass: find the actual zodiac heading, regardless of whether the
    # source uses "मेष-Aries", "मेष - Aries", an en dash, or a colon.
    heading = None
    for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        text = normalize(tag.get_text(' ', strip=True))
        if looks_like_heading(text, nepali, english):
            heading = tag
            break
    if heading is None:
        # Some source revisions render the title in a non-heading element.
        for tag in soup.find_all(['strong', 'b', 'div', 'span']):
            text = normalize(tag.get_text(' ', strip=True))
            if len(text) <= 120 and looks_like_heading(text, nepali, english):
                heading = tag
                break
    if heading is None:
        raise RuntimeError(f'Missing source heading for {english}')

    # Prefer the nearest sibling content block. This avoids accidentally
    # selecting another zodiac card or footer text later in the document.
    candidates = []
    parent = heading.parent if isinstance(heading.parent, Tag) else None
    if parent:
        for node in parent.find_all(['p', 'li'], recursive=True):
            text = clean_prediction(node.get_text(' ', strip=True), nepali, english)
            if 40 <= len(text) <= 3000:
                candidates.append(text)
    for node in heading.find_all_next(['p', 'li']):
        text = clean_prediction(node.get_text(' ', strip=True), nepali, english)
        if not text or len(text) < 40:
            continue
        if any(looks_like_heading(normalize(node.get_text(' ', strip=True)), n, e) for _, n, e in SIGNS):
            break
        candidates.append(text)
        if len(candidates) >= 3:
            break

    if candidates:
        # Prefer the shortest substantial paragraph: source pages commonly
        # wrap the forecast into one or a few paragraphs.
        return min(candidates, key=len)
    raise RuntimeError(f'Missing prediction for {english}')


def fetch_sign(slug, nepali, english):
    url = f'{SOURCE_BASE}/{slug}'
    last_error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, timeout=45, headers=HEADERS)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            prediction = extract_prediction(soup, nepali, english)
            return {'id': slug, 'nepali': nepali, 'english': english, 'prediction': prediction, 'sourceUrl': url}
        except Exception as exc:
            last_error = exc
            if attempt < 3:
                import time
                time.sleep(attempt * 2)
    raise RuntimeError(f'Failed to fetch {english}: {last_error}')


def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    ad_date = now.date()
    bs_date, weekday = get_bs_for_ad(ad_date)
    signs = [fetch_sign(*sign) for sign in SIGNS]

    if len(signs) != 12 or len({s['id'] for s in signs}) != 12:
        raise RuntimeError('Validation failed: expected 12 unique zodiac signs')
    if any(len(s['prediction']) < 40 for s in signs):
        raise RuntimeError('Validation failed: one or more Rashifal predictions are too short')

    payload = {
        'date': ad_date.isoformat(), 'bsDate': bs_date, 'weekday': weekday,
        'source': 'Nepali Patro', 'sourceUrl': SOURCE_BASE,
        'astrologer': 'उपप्रा. लक्ष्मीप्रसाद बराल (फलितज्योतिषाचार्य)',
        'fetchedAt': now.isoformat(), 'signs': signs,
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
