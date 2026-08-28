"""Normalize raw bank-rate rows into a stable, auditable schema.

The normalizer is intentionally conservative. It classifies only explicit
labels and never invents a tenure, product type, or rate from context.
"""
from __future__ import annotations

import re
from typing import Iterable

SAVINGS = ("saving", "savings", "bachat", "बचत")
FD = ("fixed deposit", "fd", "muddati", "muddat", "मुद्दती", "सावधिक")
RECURRING = ("recurring deposit", "recurring", "rd", "आवधिक")
CALL = ("call deposit", "call account", "कल डिपोजिट")
LOAN = ("loan", "advance", "lending", "credit", "कर्जा", "ऋण")
BASE = ("base rate", "average base rate", "आधार दर")


def _contains(text: str, terms: Iterable[str]) -> bool:
    text = text.lower()
    return any(term.lower() in text for term in terms)


def _tenure(text: str) -> str | None:
    t = text.lower()
    patterns = [
        (r"3\s*months?.*6\s*months?|3\s*to\s*below\s*6", "3-6_months"),
        (r"6\s*months?.*1\s*year|6\s*to\s*below\s*1", "6-12_months"),
        (r"1\s*year.*2\s*years?|1\s*to\s*below\s*2", "1-2_years"),
        (r"2\s*years?.*3\s*years?|2\s*to\s*below\s*3", "2-3_years"),
        (r"3\s*years?.*5\s*years?|3\s*to\s*below\s*5", "3-5_years"),
        (r"5\s*years?.*(above|and above)|5\s*years?\+", "5_years_plus"),
        (r"above\s*2\s*years?.*5\s*years?", "2-5_years"),
    ]
    for pattern, value in patterns:
        if re.search(pattern, t):
            return value
    return None


def classify_record(record: dict) -> dict:
    label = str(record.get("label", ""))
    raw = str(record.get("raw", ""))
    text = f"{label} {raw}"
    category = "other"
    if _contains(text, LOAN):
        category = "loan"
    elif _contains(text, BASE):
        category = "base_rate"
    elif _contains(text, FD):
        category = "fixed_deposit"
    elif _contains(text, RECURRING):
        category = "recurring_deposit"
    elif _contains(text, CALL):
        category = "call_deposit"
    elif _contains(text, SAVINGS):
        category = "savings"

    normalized = dict(record)
    normalized["category"] = category
    normalized["tenure"] = _tenure(text) if category == "fixed_deposit" else None
    normalized["rateType"] = "percentage_per_annum" if record.get("rate") is not None else "unknown"
    return normalized


def normalize(records: list[dict]) -> list[dict]:
    return [classify_record(r) for r in records if r.get("rate") is not None]
