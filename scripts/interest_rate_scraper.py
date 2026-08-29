#!/usr/bin/env python3
"""Scrape Nepal bank interest-rate pages into the site's JSON dataset.

Only official URLs from banks.json are fetched. The parser is intentionally
conservative: it extracts percentage values from HTML tables and headings,
but never invents missing rates. A failed/ambiguous source is retained as
source_to_verify so a bad scrape cannot destroy the last known good dataset.
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from html import unescape

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
CURRENT = ROOT / "feeds" / "interest_rates" / "current.json"
HISTORY_DIR = ROOT / "feeds" / "interest_rates" / "snapshots"

UA = "Mozilla/5.0 (compatible; NepaliPatroInterestRateBot/1.0; +https://apps.laxmannepal.com.np/Nepali-Patro/interest-rate/)"
RATE_RE = re.compile(r"(?<![\d.])\d{1,2}(?:\.\d{1,4})?\s*%")
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def fetch(url):
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=25) as response:
        return response.read().decode("utf-8", errors="replace")


def clean(html):
    html = re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html, flags=re.I | re.S)
    return WS_RE.sub(" ", unescape(TAG_RE.sub(" ", html))).strip()


def extract_rates(html):
    text = clean(html)
    values = []
    for match in RATE_RE.finditer(text):
        value = float(match.group(0).replace("%", "").strip())
        if 0 < value <= 30:
            values.append(value)
    # Deduplicate while preserving source order.
    return list(dict.fromkeys(values))


def build_record(bank):
    try:
        html = fetch(bank["rateSourceUrl"])
        values = extract_rates(html)
        if not values:
            return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "source_to_verify", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": [], "error": "No percentage values extracted"}

        # Generic extraction is not enough to label a rate as Savings/FD.
        # Keep the values explicitly unclassified until a bank-specific parser
        # is verified. This prevents incorrect account-type attribution.
        rates = [{"category": "unclassified", "rate": f"{v:g}%"} for v in values]
        return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "needs_parser_verification", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": rates}
    except Exception as exc:
        return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "fetch_error", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": [], "error": str(exc)[:240]}


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    previous = json.loads(CURRENT.read_text(encoding="utf-8")) if CURRENT.exists() else {}
    previous_by_id = {b.get("bankId"): b for b in previous.get("banks", [])}
    now = datetime.now(timezone.utc).astimezone()

    records = []
    for bank in registry.get("banks", []):
        record = build_record(bank)
        # Never replace a previously verified dataset with an empty scrape.
        old = previous_by_id.get(bank["id"])
        if old and old.get("status") == "verified" and not record.get("rates"):
            record = old
            record["stale"] = True
        records.append(record)

    data = {
        "schemaVersion": "1.1",
        "country": "Nepal",
        "currency": "NPR",
        "updatedAt": now.isoformat(),
        "timezone": "Asia/Kathmandu",
        "generatedBy": "Nepali Patro daily interest-rate scraper",
        "status": "scrape-completed-with-validation",
        "banks": records,
    }
    CURRENT.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    CURRENT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    HISTORY_DIR.joinpath(now.strftime("%Y-%m-%d.json")).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Scraped {len(records)} bank sources; wrote current.json")


if __name__ == "__main__":
    main()
