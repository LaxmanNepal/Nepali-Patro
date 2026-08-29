"""Daily Nepal bank interest-rate data pipeline."""
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from interest_rate_scraper import build_record

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
OUTPUT = ROOT / "feeds" / "interest_rates" / "current.json"
HISTORY = ROOT / "feeds" / "interest_rates" / "snapshots"


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    previous = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    previous_by_id = {b.get("bankId"): b for b in previous.get("banks", [])}
    now = datetime.now(ZoneInfo("Asia/Kathmandu"))
    records = []
    for bank in registry.get("banks", []):
        record = build_record(bank)
        old = previous_by_id.get(bank["id"])
        if old and old.get("status") == "verified" and not record.get("rates"):
            record = {**old, "stale": True, "lastCheckedAt": now.isoformat()}
        else:
            record["lastCheckedAt"] = now.isoformat()
        records.append(record)

    data = {
        "schemaVersion": "1.1",
        "country": "Nepal",
        "currency": "NPR",
        "updatedAt": now.isoformat(),
        "timezone": "Asia/Kathmandu",
        "generatedBy": "Nepali Patro daily interest-rate scraper",
        "status": "live-scrape",
        "banks": records,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    HISTORY.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    HISTORY.joinpath(now.strftime("%Y-%m-%d.json")).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    verified = sum(1 for r in records if r.get("status") == "verified")
    print(f"Fetched {len(records)} banks; verified={verified}")


if __name__ == "__main__":
    main()
