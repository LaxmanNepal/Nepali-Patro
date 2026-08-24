import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

FEED = Path('feeds/gold_silver.json')
OUT_DIR = Path('feeds/gold_daily')


def main():
    if not FEED.exists():
        raise SystemExit(f'Missing {FEED}')

    feed = json.loads(FEED.read_text(encoding='utf-8'))
    date_ad = str(feed.get('date_ad', '')).strip()
    if not date_ad:
        raise SystemExit('gold_silver.json has no date_ad')

    # Never create a future/invalid snapshot from malformed source data.
    datetime.strptime(date_ad, '%Y-%m-%d')

    now = datetime.now(ZoneInfo('Asia/Kathmandu'))
    snapshot = {
        'date_ad': date_ad,
        'date_bs': feed.get('date_bs', ''),
        'snapshotAt': now.isoformat(),
        'source': feed.get('source', 'Nepal Gold and Silver Dealers Association (NEGOSIDA)'),
        'sourceUrl': feed.get('sourceUrl', 'https://negosida.org/'),
        'updatedAt': feed.get('updatedAt'),
        'gold': feed.get('gold', {}),
        'silver': feed.get('silver', {}),
        'details': feed.get('details', {}),
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    target = OUT_DIR / f'{date_ad}.json'
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Gold daily snapshot written: {target}')


if __name__ == '__main__':
    main()
