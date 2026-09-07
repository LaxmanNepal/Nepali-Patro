"""Fast offline quality checks for the daily interest-rate dataset."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
CURRENT = ROOT / "feeds" / "interest_rates" / "current.json"

VALID_STATUSES = {"verified", "review", "error"}
VALID_CATEGORIES = {
    "savings",
    "fixed_deposit",
    "recurring_deposit",
    "call_deposit",
    "loan",
    "base_rate",
    "other",
}


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

        banks = current.get("banks", [])
        assert isinstance(banks, list) and banks, "Current dataset contains no banks"

        verified_with_rates = 0
        for bank in banks:
            assert bank["status"] in VALID_STATUSES
            rates = bank.get("rates", [])
            assert isinstance(rates, list)

            if bank["status"] == "verified":
                assert rates, (
                    f"{bank.get('bankId')} is verified but contains no rates"
                )
                verified_with_rates += 1

            for rate in rates:
                value = float(rate["rate"])
                assert 0 <= value <= 100
                assert rate.get("category") in VALID_CATEGORIES

        health = current.get("health", {})
        if health:
            assert health.get("totalBanks") == len(banks)
            assert health.get("verifiedBanks") == verified_with_rates
            assert health.get("hasUsableRates") == (verified_with_rates > 0)

        print(
            f"Dataset health: {len(banks)} banks, "
            f"{verified_with_rates} verified with usable rates"
        )

    print("Interest-rate pipeline quality checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
