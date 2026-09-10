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
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/3.0)',
    'Accept-Language': 'ne-NP,ne;q=0.9,en;q=0.8',
}


def norm(value):
    return re.sub(r'\s+', ' ', str(value or '').replace('\xa0', ' ')).strip()


def is_sign_heading(text, nepali, english):
    text = norm(text)
    if not text or len(text) > 180 or nepali not in text:
        return False
    # Upstream markup has changed between variants such as
    # "मेष - Aries", "मेष (Aries)", and Nepali-only headings.
    # Accept the Nepali sign as the stable identifier and use English
    # only as an optional confirmation signal.
    compact = re.sub(r'\s+', '', text).lower()
    return english.lower() in compact or compact.startswith(nepali.lower()) or nepali in text


def extract_sign(soup, nepali, english):
    heading = None
    heading_tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'a', 'div', 'span']
    for tag in soup.find_all(heading_tags):
        if is_sign_heading(tag.get_text(' ', strip=True), nepali, english):
            heading = tag
            break
    if heading is None:
        raise RuntimeError(f'Missing weekly heading: {english}')

    candidates = []
    for node in heading.find_all_next(['p', 'li', 'div'], limit=18):
        text = norm(node.get_text(' ', strip=True))
        if 60 <= len(text) <= 4000:
            low = text.lower()
            if any(x in low for x in ['weekly rashifal', 'daily rashifal', 'monthly rashifal', 'yearly rashifal']):
                continue
            if text == norm(heading.get_text(' ', strip=True)):
                continue
            candidates.append(text)
        if any(other_np in text for _, other_np, _ in SIGNS if other_np != nepali):
            break

    if not candidates:
        raise RuntimeError(f'Missing weekly prediction: {english}')
    return min(candidates, key=len)


def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    response = requests.get(SOURCE, timeout=45, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    page_text = norm(soup.get_text(' ', strip=True))

    label_match = re.search(r'([\u0900-\u097F]+\s+\d+\s*[–-]\s*\d+,\s*\d{4})', page_text)
    week_label = label_match.group(1) if label_match else ''

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
        'schemaVersion': 2,
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
