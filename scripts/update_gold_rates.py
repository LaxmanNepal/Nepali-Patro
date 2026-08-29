import html
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

OFFICIAL_URL = "https://negosida.org/"
FEED_OUT = Path("feeds/gold_silver.json")
LEGACY_OUT = Path("data/gold-price.json")
CALENDAR_ROOT = Path("data/calendar")
MAX_HISTORY = 365

MONTH_ALIASES = {
    "बैशाख": 1, "जेठ": 2, "असार": 3, "साउन": 4, "श्रावण": 4,
    "भदौ": 5, "भाद्र": 5, "आश्विन": 6, "आसोज": 6,
    "कार्तिक": 7, "मंसिर": 8, "पुष": 9, "पौष": 9,
    "माघ": 10, "फागुन": 11, "फाल्गुन": 11, "चैत": 12, "चैत्र": 12,
}


def nepali_number(value):
    return str(value).translate(str.maketrans("0123456789", "०१२३४५६७८९"))


def nepali_int(value):
    return int(str(value).translate(str.maketrans("०१२३४५६७८९", "0123456789")))


def fetch(url, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (compatible; Nepali-Patro-GoldSync/1.0; "
                        "+https://apps.laxmannepal.com.np/Nepali-Patro/gold-price/)"
                    ),
                    "Accept": "text/html,application/xhtml+xml",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                body = response.read().decode("utf-8", "ignore")
                if not body.strip():
                    raise RuntimeError("official source returned an empty response")
                return body
        except Exception as exc:
            last_error = exc
            if attempt < attempts - 1:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Unable to fetch {url}: {last_error}")


def clean_text(raw):
    text = html.unescape(raw)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def money(text, pattern):
    match = re.search(pattern, text, re.I)
    if not match:
        raise RuntimeError(f"missing official NEGOSIDA field: {pattern}")
    return float(match.group(1).replace(",", ""))


def formatted(value):
    return nepali_number(f"{value:,.2f}".rstrip("0").rstrip("."))


def find_published_bs(text):
    month_pattern = "|".join(map(re.escape, sorted(MONTH_ALIASES, key=len, reverse=True)))
    pattern = rf"([०-९0-9]{{1,2}})\s*({month_pattern})\s*([०-९0-9]{{4}})"
    matches = re.findall(pattern, text)
    if not matches:
        raise RuntimeError("could not identify the official published Bikram Sambat date")
    for day_raw, month_name, year_raw in matches:
        day, year = nepali_int(day_raw), nepali_int(year_raw)
        month = MONTH_ALIASES[month_name]
        if 1 <= day <= 32 and 2000 <= year <= 2200:
            return {"year": year, "month": month, "day": day}
    raise RuntimeError("official published BS date was malformed")


def bs_to_ad(bs):
    target = (bs["year"], bs["month"], bs["day"])
    calendar_file = CALENDAR_ROOT / f"{bs['year']}.json"
    if not calendar_file.exists():
        raise RuntimeError(f"calendar mapping missing for BS {bs['year']}")
    data = json.loads(calendar_file.read_text(encoding="utf-8"))
    for day in data.get("days", []):
        item = day.get("bs", {})
        if (item.get("year"), item.get("month"), item.get("day")) == target:
            return day["ad"]["date"], item.get("display", "")
    raise RuntimeError(f"calendar mapping missing for BS {target}")


def item(kind, price, change, unit="प्रति तोला"):
    return {
        "type": kind,
        "unit": unit,
        "price": formatted(price),
        "change": ("+" if change > 0 else "-") + formatted(abs(change)),
        "trend": "up" if change > 0 else ("down" if change < 0 else "flat"),
        "_numeric": price,
    }


def parse_official(raw):
    text = clean_text(raw)
    patterns = {
        "fine_gold_tola": r"Fine\s+Gold\s+per\s+1\s+Tola\s+NRs\s*([\d,]+(?:\.\d+)?)",
        "gold_22k_tola": r"22\s*KT\s+per\s+1\s+Tola\s+NRs\s*([\d,]+(?:\.\d+)?)",
        "silver_tola": r"Silver\s+per\s+1\s+Tola\s+NRs\s*([\d,]+(?:\.\d+)?)",
        "fine_gold_10g": r"Fine\s+Gold\s+Per\s+10\s+Gram\s+NRs\s*([\d,]+(?:\.\d+)?)",
        "gold_22k_10g": r"22\s*KT\s+per\s+10\s+Gram\s+NRs\s*([\d,]+(?:\.\d+)?)",
        "silver_10g": r"Silver\s+per\s+10\s+Gram\s+NRs\s*([\d,]+(?:\.\d+)?)",
    }
    details = {key: money(text, pattern) for key, pattern in patterns.items()}
    if details["fine_gold_tola"] <= 0 or details["silver_tola"] <= 0:
        raise RuntimeError("official source returned non-positive rates")
    published_bs = find_published_bs(text)
    date_ad, date_bs = bs_to_ad(published_bs)
    return details, date_ad, date_bs


def load_json(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_write(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def build_feed(details, old, ad_date, bs_date, now):
    old_details = old.get("details", {})
    old_gold = float(old_details.get("fine_gold_tola", details["fine_gold_tola"]))
    old_silver = float(old_details.get("silver_tola", details["silver_tola"]))
    changed = (
        old.get("date_ad") != ad_date
        or any(float(old_details.get(k, -1)) != float(v) for k, v in details.items())
    )
    published_at = now.isoformat() if changed else old.get("updatedAt", now.isoformat())

    current = {
        "date_ad": ad_date,
        "date_bs": bs_date,
        "updatedAt": published_at,
        "gold": item("छापावाल", details["fine_gold_tola"], details["fine_gold_tola"] - old_gold),
        "silver": item("चाँदी", details["silver_tola"], details["silver_tola"] - old_silver),
        "details": details,
    }

    history = [x for x in old.get("history", []) if x.get("date_ad") != ad_date]
    history.append({"date_ad": ad_date, "date_bs": bs_date, **details})
    history.sort(key=lambda x: x.get("date_ad", ""))

    return {
        "date_bs": bs_date,
        "date_ad": ad_date,
        "source": "Nepal Gold and Silver Dealers Association (NEGOSIDA)",
        "sourceUrl": OFFICIAL_URL,
        "updatedAt": published_at,
        "gold": current["gold"],
        "silver": current["silver"],
        "details": details,
        "history": history[-MAX_HISTORY:],
    }


def build_legacy(feed):
    return {
        "source": feed["sourceUrl"],
        "source_name": feed["source"],
        "updated_at": feed["updatedAt"],
        "current": feed["details"],
        "history": feed["history"],
    }


def main():
    raw = fetch(OFFICIAL_URL)
    try:
        details, ad_date, bs_date = parse_official(raw)
    except Exception as exc:
        raise RuntimeError(
            "NEGOSIDA page format changed; refusing to publish stale or guessed data: " + str(exc)
        ) from exc

    now = datetime.now(ZoneInfo("Asia/Kathmandu"))
    old = load_json(FEED_OUT)
    feed = build_feed(details, old, ad_date, bs_date, now)
    legacy = build_legacy(feed)

    atomic_write(FEED_OUT, feed)
    atomic_write(LEGACY_OUT, legacy)
    print(
        f"Official gold feed: {bs_date} / {ad_date}; "
        f"fine={details['fine_gold_tola']}; 22k={details['gold_22k_tola']}; "
        f"silver={details['silver_tola']}"
    )


if __name__ == "__main__":
    main()
