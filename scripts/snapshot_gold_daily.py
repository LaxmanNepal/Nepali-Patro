import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

FEED = Path('feeds/gold_silver.json')
OUTPUT = Path('feeds/gold_daily.json')


def main():
    if not FEED.exists():
        raise SystemExit(f'Missing {FEED}')

    feed = json.loads(FEED.read_text(encoding='utf-8'))
    date_ad = str(feed.get('date_ad', '')).strip()
    if not date_ad:
        raise SystemExit('gold_silver.json has no date_ad')
    datetime.strptime(date_ad, '%Y-%m-%d')

    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    today = {
        'date_ad': date_ad,
        'date_bs': feed.get('date_bs', ''),
        'updatedAt': feed.get('updatedAt'),
        'gold': feed.get('gold', {}),
        'silver': feed.get('silver', {}),
        'details': feed.get('details', {})
    }

    data = {
        'name': 'Nepal Gold & Silver Daily Price History',
        'source': feed.get('source', 'Nepal Gold and Silver Dealers Association (NEGOSIDA)'),
        'sourceUrl': feed.get('sourceUrl', 'https://negosida.org/'),
        'updatedAt': now.isoformat(),
        'latest': today,
        'history': []
    }

    if OUTPUT.exists():
        try:
            existing = json.loads(OUTPUT.read_text(encoding='utf-8'))
            data['history'] = existing.get('history', [])
        except Exception:
            pass

    # Keep one record per date; if today's price changes, replace today's record.
    data['history'] = [item for item in data['history'] if item.get('date_ad') != date_ad]
    data['history'].append(today)
    data['history'].sort(key=lambda item: item.get('date_ad', ''))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    new_content = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    old_content = OUTPUT.read_text(encoding='utf-8') if OUTPUT.exists() else ''

    if new_content != old_content:
        OUTPUT.write_text(new_content, encoding='utf-8')
        print(f'Gold daily history updated: {OUTPUT} ({len(data["history"])} days)')
    else:
        print(f'Gold daily history unchanged: {OUTPUT}')


if __name__ == '__main__':
    main()
