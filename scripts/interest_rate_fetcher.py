"""Live fetch, normalize and validate Nepal bank interest-rate sources."""
from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from interest_rate_sources import ADAPTERS
from interest_rate_parser import parse_html_tables, validate_rates
from interest_rate_normalizer import normalize

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "feeds" / "interest_rates" / "current.json"
HISTORY = ROOT / "feeds" / "interest_rates" / "history.json"
HEADERS = {"User-Agent": "NepaliPatro-InterestRateBot/1.0 (+https://www.nepalipatro.com.np/)"}
TIMEOUT = 30
EFFECTIVE_RE = re.compile(r"(?:effective|effective from|लागु|प्रभावकारी).{0,100}", re.I | re.S)


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def extract_effective_text(html: str) -> str | None:
    text = " ".join(re.sub(r"\s+", " ", html).split())
    match = EFFECTIVE_RE.search(text)
    return match.group(0)[:300] if match else None


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
            raw = validate_rates(parse_html_tables(html))
            rates = normalize(raw)
            item["rates"] = rates
            item["effectiveText"] = extract_effective_text(html)
            categories = {r["category"] for r in rates}
            # Verified means the page contains explicit rate rows and at least
            # one recognized deposit/FD category. Ambiguous rows remain visible
            # but are not silently promoted into a comparison metric.
            if rates and categories.intersection({"savings", "fixed_deposit", "recurring_deposit", "call_deposit"}):
                item["status"] = "verified"
            elif rates:
                item["status"] = "review"
                item["note"] = "Rates extracted but no recognized deposit category was found."
            else:
                item["status"] = "review"
                item["error"] = "No validated interest-rate records extracted."
        except Exception as exc:
            item["error"] = f"{type(exc).__name__}: {exc}"
        results.append(item)

    payload = {
        "schemaVersion": "1.1",
        "country": "Nepal",
        "currency": "NPR",
        "updatedAt": now.isoformat(),
        "timezone": "Asia/Kathmandu",
        "generatedBy": "Nepali Patro daily interest-rate pipeline",
        "publicationRule": "Only explicitly sourced and semantically recognized records are eligible for comparison.",
        "banks": results,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    previous = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {"snapshots": []}
    previous.setdefault("snapshots", []).append(payload)
    previous["snapshots"] = previous["snapshots"][-365:]
    HISTORY.write_text(json.dumps(previous, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    verified = sum(x["status"] == "verified" for x in results)
    print(f"Fetched {len(results)} banks; verified={verified}; review/error={len(results)-verified}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
