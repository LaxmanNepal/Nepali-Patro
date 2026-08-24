import json
import os
import urllib.error
import urllib.request
from pathlib import Path

FEED = Path('feeds/gold_silver.json')
STATE = Path('feeds/gold_daily/whatsapp_posted.json')
API_URL = 'https://gate.whapi.cloud/messages/text'
CHANNEL_ID = os.getenv('WHATSAPP_CHANNEL_ID', '').strip()
TOKEN = os.getenv('WHAPI_TOKEN', '').strip()
SITE_URL = 'https://apps.laxmannepal.com.np/Nepali-Patro/gold-price/'


def nepali_number(value):
    return str(value).translate(str.maketrans('0123456789', '०१२३४५६७८९'))


def money(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value or '—')
    return nepali_number(f'{number:,.2f}'.rstrip('0').rstrip('.'))


def load_json(path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return default


def build_message(data):
    details = data.get('details', {})
    gold = data.get('gold', {})
    silver = data.get('silver', {})
    date_bs = data.get('date_bs') or data.get('date_ad') or ''
    date_ad = data.get('date_ad') or ''
    gold_change = gold.get('change', '०')
    silver_change = silver.get('change', '०')
    gold_icon = '📈' if gold.get('trend') == 'up' else '📉' if gold.get('trend') == 'down' else '➖'
    silver_icon = '📈' if silver.get('trend') == 'up' else '📉' if silver.get('trend') == 'down' else '➖'

    return (
        f'🪙 *आजको सुनचाँदीको मूल्य*\n\n'
        f'📅 {date_bs} ({date_ad})\n\n'
        f'🥇 *Fine Gold (छापावाल)*\n'
        f'• प्रति तोला: *रू. {money(details.get("fine_gold_tola"))}* {gold_icon} {gold_change}\n'
        f'• प्रति १० ग्राम: रू. {money(details.get("fine_gold_10g"))}\n\n'
        f'💛 *22 KT Gold*\n'
        f'• प्रति तोला: रू. {money(details.get("gold_22k_tola"))}\n'
        f'• प्रति १० ग्राम: रू. {money(details.get("gold_22k_10g"))}\n\n'
        f'🥈 *Silver (चाँदी)*\n'
        f'• प्रति तोला: *रू. {money(details.get("silver_tola"))}* {silver_icon} {silver_change}\n'
        f'• प्रति १० ग्राम: रू. {money(details.get("silver_10g"))}\n\n'
        f'📌 स्रोत: नेपाल सुनचाँदी व्यवसायी संघ (NEGOSIDA)\n'
        f'🔗 थप विवरण: {SITE_URL}'
    )


def send(message):
    payload = json.dumps({'to': CHANNEL_ID, 'body': message}).encode('utf-8')
    request = urllib.request.Request(
        API_URL,
        data=payload,
        method='POST',
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode('utf-8', 'ignore')
            print(f'WhatsApp API response: HTTP {response.status} {body[:500]}')
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', 'ignore')
        raise RuntimeError(f'WhatsApp API failed: HTTP {exc.code} {detail[:1000]}') from exc


def main():
    if not TOKEN or not CHANNEL_ID:
        print('WHAPI_TOKEN or WHATSAPP_CHANNEL_ID is not configured; skipping WhatsApp post.')
        return

    data = load_json(FEED, {})
    date_ad = str(data.get('date_ad', '')).strip()
    if not date_ad:
        raise SystemExit('gold_silver.json has no date_ad')

    state = load_json(STATE, {'last_posted_date': None})
    if state.get('last_posted_date') == date_ad:
        print(f'WhatsApp gold post already sent for {date_ad}; skipping.')
        return

    message = build_message(data)
    response = send(message)

    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(
        json.dumps({
            'last_posted_date': date_ad,
            'message': message,
            'apiResponse': response,
        }, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    print(f'WhatsApp gold post sent for {date_ad}.')


if __name__ == '__main__':
    main()
