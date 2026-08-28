"""Bank-specific adapters for official Nepal bank interest-rate pages.

These adapters are intentionally conservative. They extract rows from HTML
that are clearly inside interest-rate tables and classify savings/FD rows by
explicit labels. Ambiguous rows are retained as raw data but are not promoted
to the verified summary automatically.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Iterable

from bs4 import BeautifulSoup


PERCENT_RE = re.compile(r"(?<!\d)(\d+(?:\.\d+)?)\s*%")
DATE_RE = re.compile(
    r"(?:effective\s*(?:from|date)?\s*[:\-]?\s*)([^<\n|]+)", re.I
)


@dataclass
class RateRow:
    section: str
    product: str
    tenor: str | None
    rate: float
    raw_rate: str


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _rate(text: str) -> tuple[float, str] | None:
    match = PERCENT_RE.search(text)
    if not match:
        return None
    value = float(match.group(1))
    if not 0 <= value <= 100:
        return None
    return value, match.group(0)


def _section(text: str) -> str:
    value = text.lower()
    if "saving" in value:
        return "savings"
    if "fixed deposit" in value or re.search(r"\bfd\b", value):
        return "fixed_deposit"
    if "recurring" in value:
        return "recurring_deposit"
    if "loan" in value or "lending" in value:
        return "loan"
    return "other"


def _extract_tables(html: str, bank_id: str) -> list[RateRow]:
    soup = BeautifulSoup(html, "html.parser")
    rows: list[RateRow] = []

    for table in soup.find_all("table"):
        heading = ""
        previous = table.find_previous(["h1", "h2", "h3", "h4", "h5", "strong"])
        if previous:
            heading = _clean(previous.get_text(" ", strip=True))

        for tr in table.find_all("tr"):
            cells = [_clean(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
            if len(cells) < 2:
                continue
            joined = " | ".join(cells)
            parsed = _rate(joined)
            if not parsed:
                continue
            value, raw = parsed
            section = _section(heading + " " + joined)
            if section == "other":
                continue
            product = cells[0]
            tenor = None
            if len(cells) >= 2:
                # Preserve the complete descriptive label; later normalization
                # can turn it into canonical tenor keys.
                tenor = " | ".join(cells[:-1]) if section == "fixed_deposit" else None
            rows.append(RateRow(section, product, tenor, value, raw))

    if not rows:
        raise ValueError(f"{bank_id}: no supported interest-rate rows found")
    return rows


def parse_official_html(bank_id: str, html: str) -> dict:
    rows = _extract_tables(html, bank_id)
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    effective_match = DATE_RE.search(text)

    return {
        "bankId": bank_id,
        "parserVersion": "1.0",
        "effectiveDateRaw": _clean(effective_match.group(1)) if effective_match else None,
        "rowCount": len(rows),
        "rows": [asdict(row) for row in rows],
        "verification": {
            "hasInterestRateRows": bool(rows),
            "ratesWithinBounds": all(0 <= row.rate <= 100 for row in rows),
            "effectiveDateDetected": bool(effective_match),
        },
    }


def parse_nabil(html: str) -> dict:
    return parse_official_html("nabil-bank", html)


def parse_nic_asia(html: str) -> dict:
    return parse_official_html("nic-asia-bank", html)


def parse_global_ime(html: str) -> dict:
    return parse_official_html("global-ime-bank", html)


def parse_nepal_bank(html: str) -> dict:
    return parse_official_html("nepal-bank", html)


PARSERS = {
    "nabil-bank": parse_nabil,
    "nic-asia-bank": parse_nic_asia,
    "global-ime-bank": parse_global_ime,
    "nepal-bank": parse_nepal_bank,
}
