import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup, Tag

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'data' / 'rashifal'
SOURCE_URLS = [
    'https://nepalipatro.com.np/en/rashifal/daily',
    'https://nepalipatro.com.np/nepali-rashifal/daily',
]
SIGNS = [
    ('aries', 'मेष', 'Aries'), ('taurus', 'वृष', 'Taurus'), ('gemini', 'मिथुन', 'Gemini'),
    ('cancer', 'कर्कट', 'Cancer'), ('leo', 'सिंह', 'Leo'), ('virgo', 'कन्या', 'Virgo'),
    ('libra', 'तुला', 'Libra'), ('scorpio', 'वृश्चिक', 'Scorpio'), ('sagittarius', 'धनु', 'Sagittarius'),
    ('capricorn', 'मकर', 'Capricorn'), ('aquarius', 'कुम्भ', 'Aquarius'), ('pisces', 'मीन', 'Pisces')
]
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/6.0)',
    'Accept-Language': 'ne-NP,ne;q=0.9,en;q=0.8',
}


def normalize(text):
    return re.sub(r'\s+', ' ', str(text or '').replace('\xa0', ' ')).strip()


def nepali_to_ascii(text):
    return str(text).translate(str.maketrans('०१२३४५६७८९', '0123456789'))


def get_bs_for_ad(ad_date):
    for year in range(ad_date.year + 56, ad_date.year + 59):
        r = requests.get(
            f'https://apps.laxmannepal.com.np/Nepali-Patro/data/calendar/{year}.json',
            timeout=20,
        )
        r.raise_for_status()
        for day in r.json().get('days', []):
            if day.get('ad', {}).get('date') == ad_date.isoformat():
                bs = day.get('bs', {})
                return bs.get('display'), day.get('weekday', {}).get('nepali')
    raise RuntimeError(f'BS date not found for {ad_date}')


def date_tokens(bs_date):
    """Return robust tokens for the expected BS day/month/year."""
    raw = normalize(bs_date)
    ascii_raw = nepali_to_ascii(raw)
    day_match = re.search(r'\b(\d{1,2})\b', ascii_raw)
    year_match = re.search(r'\b(20\d{2})\b', ascii_raw)
    if not day_match or not year_match:
        raise RuntimeError(f'Cannot parse expected BS date: {bs_date}')
    day = int(day_match.group(1))
    year = int(year_match.group(1))
    return day, year, raw, ascii_raw


def heading_matches(text, nepali, english):
    text = normalize(text)
    compact = re.sub(r'\s+', '', text).lower()
    return nepali in text and english.lower() in compact


def is_forecast_candidate(text, nepali, english):
    text = normalize(text)
    if not 60 <= len(text) <= 2500:
        return False
    if heading_matches(text, nepali, english):
        return False
    # Reject obvious navigation/metadata rather than accepting arbitrary page text.
    bad = ('share', 'facebook', 'twitter', 'subscribe', 'copyright', 'menu')
    lower = text.lower()
    return not any(x in lower for x in bad)


def clean_prediction(text, nepali='', english=''):
    text = normalize(text)
    if nepali and english:
        text = re.sub(
            rf'^{re.escape(nepali)}\s*[-–—:]?\s*{re.escape(english)}\s*',
            '', text, flags=re.I,
        )
    return text.strip(' -–—:|')


def find_sign_block(soup, nepali, english):
    """Locate the smallest DOM block containing exactly this sign heading."""
    headings = []
    for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'a', 'div', 'span']):
        text = normalize(tag.get_text(' ', strip=True))
        if len(text) <= 160 and heading_matches(text, nepali, english):
            headings.append(tag)
    if not headings:
        raise RuntimeError(f'Missing consolidated Nepali Patro heading: {english}')

    heading = headings[0]
    # Prefer a nearby card/article/container over walking the whole document.
    for parent in heading.parents:
        if not isinstance(parent, Tag):
            continue
        text = normalize(parent.get_text(' ', strip=True))
        if 80 <= len(text) <= 3500:
            return parent, heading
    return heading.parent, heading


def extract_sign_prediction(soup, nepali, english):
    block, heading = find_sign_block(soup, nepali, english)

    candidates = []
    if isinstance(block, Tag):
        # First prefer direct paragraph/list content inside the card.
        for node in block.find_all(['p', 'li'], recursive=True):
            text = clean_prediction(node.get_text(' ', strip=True), nepali, english)
            if is_forecast_candidate(text, nepali, english):
                candidates.append(text)

    # If the card has no semantic paragraphs, inspect nearby siblings.
    if not candidates and isinstance(heading, Tag):
        for node in heading.find_all_next(['p', 'li', 'div'], limit=12):
            raw = normalize(node.get_text(' ', strip=True))
            if any(heading_matches(raw, n, e) for _, n, e in SIGNS if not (n == nepali and e == english)):
                break
            text = clean_prediction(raw, nepali, english)
            if is_forecast_candidate(text, nepali, english):
                candidates.append(text)

    if not candidates:
        raise RuntimeError(f'Missing prediction content for {english}')

    # Avoid selecting a huge container with navigation + forecast.
    return min(candidates, key=len)


def fetch_source(url, expected_bs):
    day, year, raw_bs, ascii_bs = date_tokens(expected_bs)
    last_error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, headers=HEADERS, timeout=45)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            page_text = normalize(soup.get_text(' ', strip=True))
            ascii_page = nepali_to_ascii(page_text)

            # The consolidated page must expose today's exact BS year/day.
            if str(year) not in ascii_page or str(day) not in ascii_page:
                raise RuntimeError(f'Nepali Patro source is not on expected BS date {raw_bs}')

            signs = []
            for slug, nepali, english in SIGNS:
                prediction = extract_sign_prediction(soup, nepali, english)
                signs.append({
                    'id': slug,
                    'nepali': nepali,
                    'english': english,
                    'prediction': prediction,
                    'source': 'Nepali Patro',
                    'sourceUrl': url,
                })
            return signs
        except Exception as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(attempt * 2)
    raise RuntimeError(str(last_error))


def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    ad_date = now.date()
    bs_date, weekday = get_bs_for_ad(ad_date)

    last_error = None
    signs = None
    used_url = None
    for url in SOURCE_URLS:
        try:
            signs = fetch_source(url, bs_date)
            used_url = url
            break
        except Exception as exc:
            last_error = exc

    if signs is None:
        # Do NOT substitute another publisher. A missing source means the
        # current Nepali Patro snapshot is not safely available yet.
        raise RuntimeError(f'Nepali Patro daily Rashifal unavailable for {ad_date}: {last_error}')

    if len(signs) != 12 or len({s['id'] for s in signs}) != 12:
        raise RuntimeError('Validation failed: expected 12 unique zodiac signs')
    if any(len(s['prediction']) < 40 for s in signs):
        raise RuntimeError('Validation failed: one or more predictions are too short')
    if {s['source'] for s in signs} != {'Nepali Patro'}:
        raise RuntimeError('Validation failed: mixed or non-Nepali Patro source detected')

    payload = {
        'date': ad_date.isoformat(),
        'bsDate': bs_date,
        'weekday': weekday,
        'source': 'Nepali Patro',
        'sourceUrl': used_url,
        'astrologer': 'उपप्रा. लक्ष्मीप्रसाद बराल (फलितज्योतिषाचार्य)',
        'fetchedAt': now.isoformat(),
        'signs': signs,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{ad_date.isoformat()}.json'
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {path} with 12 Nepali Patro signs from {used_url}')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise
