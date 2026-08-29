#!/usr/bin/env python3
"""Fetch and normalize Nepal bank interest rates from official sources."""
import json
import re
from datetime import datetime
from html import unescape
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from interest_rate_parsers import PARSERS

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
CURRENT = ROOT / "feeds" / "interest_rates" / "current.json"
HISTORY_DIR = ROOT / "feeds" / "interest_rates" / "snapshots"
UA = "Mozilla/5.0 (compatible; NepaliPatroInterestRateBot/1.0)"
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def fetch(url):
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def clean(html):
    html = re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", "\n", html, flags=re.I | re.S)
    return WS_RE.sub(" ", unescape(TAG_RE.sub(" ", html))).strip()


def build_record(bank, previous=None):
    try:
        text = clean(fetch(bank["rateSourceUrl"]))
        parser = PARSERS.get(bank["id"])
        if not parser:
            return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "parser_pending", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": []}
        rates = parser(text)
        if not rates:
            if previous and previous.get("status") == "verified":
                return {**previous, "stale": True, "lastCheckedAt": datetime.now(ZoneInfo("Asia/Kathmandu")).isoformat()}
            return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "source_to_verify", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": []}
        return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "verified", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": rates, "lastCheckedAt": datetime.now(ZoneInfo("Asia/Kathmandu")).isoformat()}
    except Exception as exc:
        if previous and previous.get("status") == "verified":
            return {**previous, "stale": True, "lastCheckedAt": datetime.now(ZoneInfo("Asia/Kathmandu")).isoformat()}
        return {"bankId": bank["id"], "bankName": bank["name"], "category": bank["category"], "status": "fetch_error", "effectiveDate": None, "sourceUrl": bank["rateSourceUrl"], "rates": [], "error": str(exc)[:240]}


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    previous = json.loads(CURRENT.read_text(encoding="utf-8")) if CURRENT.exists() else {}
    old = {b.get("bankId"): b for b in previous.get("banks", [])}
    now = datetime.now(ZoneInfo("Asia/Kathmandu"))
    records = [build_record(bank, old.get(bank["id"])) for bank in registry.get("banks", [])]
    data = {"schemaVersion":"1.2","country":"Nepal","currency":"NPR","updatedAt":now.isoformat(),"timezone":"Asia/Kathmandu","generatedBy":"Nepali Patro daily interest-rate scraper","status":"live-scrape","banks":records}
    CURRENT.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    CURRENT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    HISTORY_DIR.joinpath(now.strftime("%Y-%m-%d.json")).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Fetched {len(records)} banks; verified={sum(r['status']=='verified' for r in records)}")


if __name__ == "__main__":
    main()
