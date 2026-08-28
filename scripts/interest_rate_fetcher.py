"""Live fetch/validate pipeline for Nepal bank interest-rate sources."""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from interest_rate_sources import ADAPTERS
from interest_rate_parser import parse_html_tables, validate_rates

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "feeds" / "interest_rates" / "current.json"
HISTORY = ROOT / "feeds" / "interest_rates" / "history.json"
HEADERS = {"User-Agent": "NepaliPatro-InterestRateBot/1.0 (+https://www.nepalipatro.com.np/)"}
TIMEOUT = 30


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def main() -> int:
    now = datetime.now(ZoneInfo("Asia/Kathmandu"))
    results = []
    for bank_id, adapter in ADAPTERS.items():
        item = {
            "bankId": bank_id,
            "status": "error",
            "fetchedAt": now.isoformat(),
            "source": {"url": adapter.url, "type": adapter.source_type},
            "rates": [],
        }
        try:
            html = fetch(adapter.url)
            records = validate_rates(parse_html_tables(html))
            if records:
                item["status"] = "review"
                item["rates"] = records
                item["note"] = "Rows extracted successfully; bank-specific semantic validation is required before publication."
            else:
                item["status"] = "review"
                item["error"] = "No validated interest-rate records extracted."
        except Exception as exc:
            item["error"] = f"{type(exc).__name__}: {exc}"
        results.append(item)

    payload = {
        "schemaVersion": "1.0",
        "country": "Nepal",
        "currency": "NPR",
        "updatedAt": now.isoformat(),
        "generatedBy": "Nepali Patro daily interest-rate pipeline",
        "banks": results,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    previous = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {"snapshots": []}
    previous.setdefault("snapshots", []).append(payload)
    previous["snapshots"] = previous["snapshots"][-365:]
    HISTORY.write_text(json.dumps(previous, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Fetched {len(results)} banks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
