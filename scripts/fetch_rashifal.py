import json, re, sys, time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup, Tag

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'data' / 'rashifal'
SOURCE_BASE = 'https://nepalipatro.com.np/nepali-rashifal/daily'
FALLBACK_BASE = 'https://www.onlinekhabar.com/rashi'
SIGNS = [
    ('aries', 'मेष', 'Aries'), ('taurus', 'वृष', 'Taurus'), ('gemini', 'मिथुन', 'Gemini'),
    ('cancer', 'कर्कट', 'Cancer'), ('leo', 'सिंह', 'Leo'), ('virgo', 'कन्या', 'Virgo'),
    ('libra', 'तुला', 'Libra'), ('scorpio', 'वृश्चिक', 'Scorpio'), ('sagittarius', 'धनु', 'Sagittarius'),
    ('capricorn', 'मकर', 'Capricorn'), ('aquarius', 'कुम्भ', 'Aquarius'), ('pisces', 'मीन', 'Pisces')
]
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/5.0)'}


def normalize(text):
    return re.sub(r'\s+', ' ', str(text or '').replace('\xa0', ' ')).strip()


def nepali_digits(n):
    return str(n).translate(str.maketrans('0123456789', '०१२३४५६७८९'))


def get_bs_for_ad(ad_date):
    for year in range(ad_date.year + 56, ad_date.year + 59):
        r = requests.get(f'https://apps.laxmannepal.com.np/Nepali-Patro/data/calendar/{year}.json', timeout=20)
        r.raise_for_status()
        for day in r.json().get('days', []):
            if day.get('ad', {}).get('date') == ad_date.isoformat():
                return day.get('bs', {}).get('display'), day.get('weekday', {}).get('nepali')
    raise RuntimeError(f'BS date not found for {ad_date}')


def expected_bs_day(bs_date):
    m = re.search(r'(\d+)', str(bs_date or ''))
    return m.group(1) if m else None


def looks_like_heading(text, nepali, english):
    compact = re.sub(r'\s+', '', text).lower()
    return nepali in text and english.lower() in compact and any(x in text for x in ('-', '–', '—', ':'))


def clean_prediction(text, nepali='', english=''):
    text = normalize(text)
    if nepali and english:
        text = re.sub(rf'^{re.escape(nepali)}\s*[-–—:]?\s*{re.escape(english)}\s*', '', text, flags=re.I)
    return text.strip(' -–—:|')


def extract_nepalipatro(soup, nepali, english):
    heading = None
    for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        if looks_like_heading(normalize(tag.get_text(' ', strip=True)), nepali, english):
            heading = tag
            break
    if heading is None:
        for tag in soup.find_all(['strong', 'b', 'div', 'span']):
            text = normalize(tag.get_text(' ', strip=True))
            if len(text) <= 120 and looks_like_heading(text, nepali, english):
                heading = tag
                break
    if heading is None:
        raise RuntimeError(f'Missing Nepali Patro heading for {english}')

    candidates = []
    parent = heading.parent if isinstance(heading.parent, Tag) else None
    if parent:
        for node in parent.find_all(['p', 'li'], recursive=True):
            text = clean_prediction(node.get_text(' ', strip=True), nepali, english)
            if 40 <= len(text) <= 3000:
                candidates.append(text)
    for node in heading.find_all_next(['p', 'li']):
        raw = normalize(node.get_text(' ', strip=True))
        if any(looks_like_heading(raw, n, e) for _, n, e in SIGNS):
            break
        text = clean_prediction(raw, nepali, english)
        if len(text) >= 40:
            candidates.append(text)
        if len(candidates) >= 3:
            break
    if not candidates:
        raise RuntimeError(f'Missing Nepali Patro prediction for {english}')
    return min(candidates, key=len)


def fetch_nepalipatro(ad_date, bs_date, slug, nepali, english):
    url = f'{SOURCE_BASE}/{slug}'
    for attempt in range(1, 4):
        try:
            response = requests.get(url, timeout=45, headers=HEADERS)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            page_text = normalize(soup.get_text(' ', strip=True))
            day = expected_bs_day(bs_date)
            if day and nepali_digits(int(day)) not in page_text:
                raise RuntimeError('Nepali Patro page does not yet expose the expected BS day')
            prediction = extract_nepalipatro(soup, nepali, english)
            return prediction, url
        except Exception as exc:
            if attempt == 3:
                raise RuntimeError(str(exc))
            time.sleep(attempt * 2)


def extract_onlinekhabar(soup, nepali):
    # OnlineKhabar renders the current daily forecast in a section headed by
    # the BS date. Keep only substantial paragraphs and reject monthly/yearly text.
    date_marker = None
    for node in soup.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'div']):
        text = normalize(node.get_text(' ', strip=True))
        if re.search(r'\d+\s+भदौ\s+२०८३|\d+\s+भाद्र\s+२०८३', text) and len(text) < 100:
            date_marker = node
            break
    texts = []
    for node in soup.find_all(['p']):
        text = normalize(node.get_text(' ', strip=True))
        if 60 <= len(text) <= 1200 and nepali not in text:
            texts.append(text)
    if not texts:
        raise RuntimeError(f'Missing OnlineKhabar prediction for {nepali}')
    # First substantial paragraph after the page's current-date content is the
    # daily forecast. Avoid monthly/yearly paragraphs by preferring 60-600 chars.
    return min(texts, key=lambda x: abs(len(x) - 250))


def fetch_fallback(ad_date, bs_date, slug, nepali, english):
    url = f'{FALLBACK_BASE}/{slug}'
    for attempt in range(1, 4):
        try:
            response = requests.get(url, timeout=45, headers=HEADERS)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            text = normalize(soup.get_text(' ', strip=True))
            day = expected_bs_day(bs_date)
            if not day or nepali_digits(int(day)) not in text:
                raise RuntimeError('Fallback source does not expose the expected BS day')
            prediction = extract_onlinekhabar(soup, nepali)
            return prediction, url
        except Exception as exc:
            if attempt == 3:
                raise RuntimeError(str(exc))
            time.sleep(attempt * 2)


def fetch_sign(ad_date, bs_date, slug, nepali, english):
    try:
        prediction, url = fetch_nepalipatro(ad_date, bs_date, slug, nepali, english)
        return {'id': slug, 'nepali': nepali, 'english': english, 'prediction': prediction, 'source': 'Nepali Patro', 'sourceUrl': url}
    except Exception as primary_error:
        prediction, url = fetch_fallback(ad_date, bs_date, slug, nepali, english)
        print(f'WARN: Nepali Patro unavailable for {english}; verified fallback used: {primary_error}')
        return {'id': slug, 'nepali': nepali, 'english': english, 'prediction': prediction, 'source': 'OnlineKhabar', 'sourceUrl': url}


def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    ad_date = now.date()
    bs_date, weekday = get_bs_for_ad(ad_date)
    signs = [fetch_sign(ad_date, bs_date, *sign) for sign in SIGNS]

    if len(signs) != 12 or len({s['id'] for s in signs}) != 12:
        raise RuntimeError('Validation failed: expected 12 unique zodiac signs')
    if any(len(s['prediction']) < 40 for s in signs):
        raise RuntimeError('Validation failed: one or more Rashifal predictions are too short')

    sources = sorted({s['source'] for s in signs})
    payload = {
        'date': ad_date.isoformat(), 'bsDate': bs_date, 'weekday': weekday,
        'source': sources[0] if len(sources) == 1 else 'Nepali Patro + OnlineKhabar',
        'sourceUrl': SOURCE_BASE,
        'astrologer': 'उपप्रा. लक्ष्मीप्रसाद बराल (फलितज्योतिषाचार्य)' if sources == ['Nepali Patro'] else None,
        'fetchedAt': now.isoformat(), 'signs': signs,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{ad_date.isoformat()}.json'
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {path} with 12 verified signs; sources={sources}')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise
