"""Fast offline quality checks for the daily interest-rate dataset."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
CURRENT = ROOT / "feeds" / "interest_rates" / "current.json"


def main() -> int:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    assert registry["country"] == "Nepal"
    ids = [b["id"] for b in registry["banks"]]
    assert len(ids) == len(set(ids)), "Duplicate bank IDs in registry"
    for bank in registry["banks"]:
        assert bank["name"] and bank["officialUrl"] and bank["rateSourceUrl"]
        assert bank["rateSourceUrl"].startswith("https://")

    if CURRENT.exists():
        current = json.loads(CURRENT.read_text(encoding="utf-8"))
        assert current["country"] == "Nepal"
        for bank in current.get("banks", []):
            assert bank["status"] in {"verified", "review", "error"}
            for rate in bank.get("rates", []):
                value = float(rate["rate"])
                assert 0 <= value <= 100
                assert rate.get("category") in {
                    "savings", "fixed_deposit", "recurring_deposit",
                    "call_deposit", "loan", "base_rate", "other"
                }
    print("Interest-rate pipeline quality checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
