import json
from pathlib import Path

SOURCE = Path('feeds/gold_silver.json')
OUT = Path('data/gold-price-history.json')
FIELDS = ('fine_gold_tola','gold_22k_tola','silver_tola','fine_gold_10g','gold_22k_10g','silver_10g')
SCHEMA = 'gold-price-history/v1'


def normalize_record(item):
    return {
        'date_ad': item.get('date_ad'),
        'date_bs': item.get('date_bs'),
        'prices': {key: item.get(key) for key in FIELDS},
        'availability': {key: item.get(key) is not None for key in FIELDS},
        'source': 'NEGOSIDA',
    }


def main():
    data = json.loads(SOURCE.read_text(encoding='utf-8'))
    rows = {}
    for item in data.get('history', []):
        if not item.get('date_ad'):
            continue
        rows[item['date_ad']] = normalize_record(item)

    # Ensure the current record is represented even if history was incomplete.
    current = {'date_ad': data.get('date_ad'), 'date_bs': data.get('date_bs'), **data.get('details', {})}
    if current['date_ad']:
        rows[current['date_ad']] = normalize_record(current)

    history = [rows[k] for k in sorted(rows)]
    payload = {
        'schema': SCHEMA,
        'source': data.get('source'),
        'sourceUrl': data.get('sourceUrl'),
        'generatedAt': data.get('updatedAt'),
        'recordCount': len(history),
        'fields': list(FIELDS),
        'records': history[-365:],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Normalized gold history: {len(payload["records"])} records')


if __name__ == '__main__':
    main()
