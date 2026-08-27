import json, re, sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import requests
from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'data' / 'rashifal'
SOURCE_URL = 'https://ramropatro.com/rashifal'
SIGNS = [('aries','मेष','Aries'),('taurus','वृष','Taurus'),('gemini','मिथुन','Gemini'),('cancer','कर्कट','Cancer'),('leo','सिंह','Leo'),('virgo','कन्या','Virgo'),('libra','तुला','Libra'),('scorpio','वृश्चिक','Scorpio'),('sagittarius','धनु','Sagittarius'),('capricorn','मकर','Capricorn'),('aquarius','कुम्भ','Aquarius'),('pisces','मीन','Pisces')]

def get_bs_for_ad(ad_date):
    for year in range(ad_date.year + 56, ad_date.year + 59):
        r = requests.get(f'https://apps.laxmannepal.com.np/Nepali-Patro/data/calendar/{year}.json', timeout=20)
        if r.ok:
            for day in r.json().get('days', []):
                if day.get('ad', {}).get('date') == ad_date.isoformat():
                    return day.get('bs', {}).get('display'), day.get('weekday', {}).get('nepali')
    raise RuntimeError(f'BS date not found for {ad_date}')

def extract_daily(html):
    soup = BeautifulSoup(html, 'html.parser')
    result = []
    for sid, nepali, english in SIGNS:
        marker = re.compile(rf'\b{re.escape(nepali)}\s+राशी.*-\s*{re.escape(english)}\s*$', re.I)
        node = soup.find(string=marker)
        if node is None:
            raise RuntimeError(f'Missing source heading for {english}')
        parent = node.parent
        prediction = None
        for nxt in parent.find_all_next(['p','div','span'], limit=12):
            text = ' '.join(nxt.get_text(' ', strip=True).split())
            if not text or text == parent.get_text(' ', strip=True):
                continue
            if len(text) >= 40 and 'राशी' not in text and 'मासिक राशिफल' not in text and 'बार्षिक राशिफल' not in text:
                prediction = text
                break
        if not prediction:
            raise RuntimeError(f'Missing prediction for {english}')
        result.append({'id': sid, 'nepali': nepali, 'english': english, 'prediction': prediction})
    return result

def main():
    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    ad_date = now.date()
    bs_date, weekday = get_bs_for_ad(ad_date)
    response = requests.get(SOURCE_URL, timeout=30, headers={'User-Agent':'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/1.0)'})
    response.raise_for_status()
    signs = extract_daily(response.text)
    if len(signs) != 12 or len({s['id'] for s in signs}) != 12:
        raise RuntimeError('Validation failed: expected 12 unique zodiac signs')
    payload = {'date': ad_date.isoformat(), 'bsDate': bs_date, 'weekday': weekday, 'source': 'Ramro Patro', 'sourceUrl': SOURCE_URL, 'astrologer': 'ज्यो. देवमणि बस्याल', 'fetchedAt': now.isoformat(), 'signs': signs}
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{ad_date.isoformat()}.json'
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {path} with {len(signs)} unique signs')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise
