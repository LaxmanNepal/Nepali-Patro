"""Conservative parser for Nepal bank interest-rate pages.

Supports normal HTML tables plus rate-bearing cards, lists and simple text
blocks. It requires a nearby deposit/loan context so unrelated percentages
are not published as interest rates.
"""
from __future__ import annotations

import re
from bs4 import BeautifulSoup

RATE_RE = re.compile(r"(?<!\d)(\d+(?:\.\d+)?)\s*(?:%|percent)\b?", re.I)
RATE_CONTEXT_RE = re.compile(
    r"\b(saving|savings|deposit|fixed|fd|recurring|call|loan|advance|base\s+rate"
    r"|बचत|मुद्दती|सावधिक|आवधिक|कर्जा|ऋण|आधार\s*दर)\b",
    re.I,
)


def parse_rate(value: str) -> float | None:
    match = RATE_RE.search(value.replace(",", ""))
    if not match:
        return None
    rate = float(match.group(1))
    return rate if 0 <= rate <= 100 else None


def _record(*, label: str, raw: str, rate: float, source_kind: str,
            table_index: int | None = None, row_index: int | None = None,
            column_index: int | None = None, column_label: str | None = None,
            cells: list[str] | None = None) -> dict:
    return {
        "label": label.strip(),
        "raw": raw.strip(),
        "rate": rate,
        "sourceKind": source_kind,
        "tableIndex": table_index,
        "rowIndex": row_index,
        "columnIndex": column_index,
        "columnLabel": column_label,
        "cells": cells or [],
    }


def parse_html_tables(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    records: list[dict] = []

    for table_index, table in enumerate(soup.find_all("table")):
        rows = table.find_all("tr")
        headers = ([c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])]
                   if rows else [])
        for row_index, row in enumerate(rows):
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            raw = " | ".join(cells)
            if not RATE_CONTEXT_RE.search(raw):
                continue
            for column_index, cell in enumerate(cells):
                rate = parse_rate(cell)
                if rate is None:
                    continue
                label = next((value for value in cells if value != cell and RATE_CONTEXT_RE.search(value)), cells[0])
                records.append(_record(
                    label=label, raw=raw, rate=rate, source_kind="table",
                    table_index=table_index, row_index=row_index,
                    column_index=column_index,
                    column_label=headers[column_index] if column_index < len(headers) else None,
                    cells=cells,
                ))
    return records


def parse_html_blocks(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    for unwanted in soup(["script", "style", "noscript", "svg", "template"]):
        unwanted.decompose()

    records: list[dict] = []
    seen: set[tuple[str, float]] = set()
    candidates = soup.find_all(["article", "section", "li", "div", "p", "dd", "dt"])

    for node in candidates:
        text = " ".join(node.stripped_strings)
        if not text or len(text) > 700 or not RATE_CONTEXT_RE.search(text):
            continue
        matches = list(RATE_RE.finditer(text.replace(",", "")))
        if not matches:
            continue
        label_node = node.find_previous(["h1", "h2", "h3", "h4", "h5", "strong", "b"])
        label = " ".join(label_node.stripped_strings) if label_node else text[:180]
        for match in matches:
            rate = float(match.group(1))
            if not 0 <= rate <= 100:
                continue
            key = (text, rate)
            if key in seen:
                continue
            seen.add(key)
            records.append(_record(label=label, raw=text, rate=rate, source_kind="block"))
    return records


def deduplicate(records: list[dict]) -> list[dict]:
    output: list[dict] = []
    seen: set[tuple[str, float, str]] = set()
    for record in records:
        key = (str(record.get("label", "")).strip().lower(),
               float(record["rate"]), str(record.get("raw", "")).strip().lower())
        if key in seen:
            continue
        seen.add(key)
        output.append(record)
    return output


def parse_html(html: str) -> list[dict]:
    return deduplicate(parse_html_tables(html) + parse_html_blocks(html))


def validate_rates(records: list[dict]) -> list[dict]:
    return [r for r in records if isinstance(r.get("rate"), (int, float))
            and 0 <= float(r["rate"]) <= 100 and str(r.get("raw", "")).strip()]
