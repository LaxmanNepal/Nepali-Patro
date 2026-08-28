"""Fetch and validate Nepal bank interest-rate data.

The pipeline is deliberately conservative: official sources are preferred and
unverified sources are never presented as current rates. Bank-specific parsers
can be added to PARSERS as source formats are verified.
"""
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
OUTPUT = ROOT / "feeds" / "interest_rates" / "current.json"


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    now = datetime.now(ZoneInfo("Asia/Kathmandu"))

    banks = []
    for bank in registry.get("banks", []):
        # Until an official source parser is verified, preserve the bank in the
        # dataset but explicitly mark the rate as unavailable rather than
        # inventing or carrying forward stale values.
        banks.append({
            "id": bank["id"],
            "name": bank["name"],
            "category": bank["category"],
            "status": "source_to_verify",
            "rates": {},
            "source": {
                "name": bank["name"],
                "url": bank.get("rateSourceUrl") or bank.get("officialUrl"),
                "type": "official",
                "verifiedAt": None,
            },
        })

    data = {
        "schemaVersion": "1.0",
        "country": "Nepal",
        "currency": "NPR",
        "updatedAt": now.isoformat(),
        "status": "initial-source-registry",
        "banks": banks,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} with {len(banks)} banks")


if __name__ == "__main__":
    main()
