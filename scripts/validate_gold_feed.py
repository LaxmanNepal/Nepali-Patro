import json
import sys
from datetime import date, datetime
from pathlib import Path

FEED = Path('feeds/gold_silver.json')
LEGACY = Path('data/gold-price.json')
REQUIRED = ('fine_gold_tola','gold_22k_tola','silver_tola','fine_gold_10g','gold_22k_10g','silver_10g')


def fail(message):
    print(f'GOLD FEED ERROR: {message}', file=sys.stderr)
    raise SystemExit(1)


def main():
    if not FEED.exists(): fail(f'missing {FEED}')
    data = json.loads(FEED.read_text(encoding='utf-8'))
    details = data.get('details')
    if not isinstance(details, dict): fail('details must be an object')
    for key in REQUIRED:
        value = details.get(key)
        if not isinstance(value, (int, float)) or value <= 0:
            fail(f'{key} must be a positive number')

    for key in ('date_ad','date_bs','sourceUrl','source','updatedAt'):
        if not data.get(key): fail(f'missing {key}')
    try:
        source_date = date.fromisoformat(data['date_ad'])
    except ValueError:
        fail('date_ad must be YYYY-MM-DD')

    try:
        updated = datetime.fromisoformat(data['updatedAt'].replace('Z', '+00:00'))
    except ValueError:
        fail('updatedAt must be ISO-8601')
    if updated.date() < source_date:
        fail('updatedAt predates the source date')

    history = data.get('history')
    if not isinstance(history, list): fail('history must be a list')
    dates = [x.get('date_ad') for x in history if isinstance(x, dict)]
    if dates != sorted(set(dates)):
        fail('history dates must be unique and sorted')
    if len(history) > 365:
        fail('history exceeds 365 records')
    if history and history[-1].get('date_ad') != data['date_ad']:
        fail('latest history record does not match current date_ad')

    if not LEGACY.exists(): fail(f'missing {LEGACY}')
    legacy = json.loads(LEGACY.read_text(encoding='utf-8'))
    if legacy.get('current') != details:
        fail('legacy current data differs from primary feed')
    if legacy.get('history') != history:
        fail('legacy history differs from primary feed')
    print(f'Gold feed healthy: {data["date_bs"]} / {data["date_ad"]}; {len(history)} history records')


if __name__ == '__main__':
    main()
