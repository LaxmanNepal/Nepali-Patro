"""Robust parser for Nepal bank interest-rate pages.

The parser deliberately keeps source-aware extraction while supporting the
common table/card layouts used by official bank websites.
"""
from __future__ import annotations

import re
from bs4 import BeautifulSoup

RATE_RE = re.compile(r"(?<!\d)(\d+(?:\.\d+)?)\s*(?:%|percent)\b", re.I)
RATE_CONTEXT_RE = re.compile(
    r"\b(saving|savings|deposit|fixed|fd|recurring|call|loan|advance|base\s+rate|"
    r"interest|remittance|fcy|nrn|बचत|निक्षेप|मुद्दती|सावधिक|आवधिक|कर्जा|ऋण|"
    r"आधार\s*दर|रेमिट्यान्स)\b", re.I,
)
DEPOSIT_CONTEXT_RE = re.compile(
    r"\b(saving|savings|deposit|fixed|fd|recurring|call|remittance|fcy|nrn|"
    r"बचत|निक्षेप|मुद्दती|सावधिक|आवधिक|कल डिपोजिट|रेमिट्यान्स)\b", re.I,
)
HEADER_RE = re.compile(r"(rate|interest|%|प्रतिशत|ब्याज|दर)", re.I)


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
    return {"label": label.strip(), "raw": raw.strip(), "rate": rate,
            "sourceKind": source_kind, "tableIndex": table_index,
            "rowIndex": row_index, "columnIndex": column_index,
            "columnLabel": column_label, "cells": cells or []}


def _table_headers(rows: list) -> list[str]:
    for row in rows[:3]:
        cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
        if any(HEADER_RE.search(c) for c in cells):
            return cells
    return [c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])] if rows else []


def parse_html_tables(html: str, *, deposit_only: bool = False) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    records: list[dict] = []
    for table_index, table in enumerate(soup.find_all("table")):
        rows = table.find_all("tr")
        if not rows:
            continue
        table_text = " ".join(table.stripped_strings)
        if deposit_only and not DEPOSIT_CONTEXT_RE.search(table_text):
            continue
        headers = _table_headers(rows)
        table_has_rate_header = any(HEADER_RE.search(h) for h in headers)
        table_has_context = bool(RATE_CONTEXT_RE.search(table_text))
        for row_index, row in enumerate(rows):
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            raw = " | ".join(cells)
            rate_cells = [(i, parse_rate(c)) for i, c in enumerate(cells)]
            rate_cells = [(i, rate) for i, rate in rate_cells if rate is not None]
            if not rate_cells:
                continue
            row_has_context = bool(RATE_CONTEXT_RE.search(raw))
            if not (row_has_context or table_has_context or table_has_rate_header):
                continue
            context_cells = [value for value in cells if value and not RATE_RE.search(value)]
            label = next((value for value in context_cells if RATE_CONTEXT_RE.search(value)),
                         context_cells[0] if context_cells else cells[0])
            for column_index, rate in rate_cells:
                records.append(_record(
                    label=label, raw=raw, rate=rate, source_kind="table",
                    table_index=table_index, row_index=row_index,
                    column_index=column_index,
                    column_label=headers[column_index] if column_index < len(headers) else None,
                    cells=cells,
                ))
    return records


def parse_html_blocks(html: str, *, deposit_only: bool = False) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    for unwanted in soup(["script", "style", "noscript", "svg", "template"]):
        unwanted.decompose()
    records: list[dict] = []
    seen: set[tuple[str, float]] = set()
    for node in soup.find_all(["article", "section", "li", "div", "p", "dd", "dt"]):
        text = " ".join(node.stripped_strings)
        if not text or len(text) > 900:
            continue
        if deposit_only and not DEPOSIT_CONTEXT_RE.search(text):
            continue
        if not RATE_CONTEXT_RE.search(text) and not RATE_RE.search(text):
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
        key = (str(record.get("label", "")).strip().lower(), float(record["rate"]),
               str(record.get("raw", "")).strip().lower())
        if key not in seen:
            seen.add(key)
            output.append(record)
    return output


def parse_html(html: str, parser: str = "html_auto_v2") -> list[dict]:
    strategy = (parser or "html_auto_v2").lower()
    if strategy in {"html_table_v1", "table", "html_table_v2"}:
        records = parse_html_tables(html, deposit_only=False)
    elif strategy in {"html_blocks_v1", "blocks", "html_card_v1"}:
        records = parse_html_blocks(html, deposit_only=False)
    else:
        records = parse_html_tables(html, deposit_only=False) + parse_html_blocks(html, deposit_only=False)
    return deduplicate(records)


def validate_rates(records: list[dict]) -> list[dict]:
    return [
        r for r in records
        if isinstance(r.get("rate"), (int, float))
        and 0 <= float(r["rate"]) <= 100
        and str(r.get("raw", "")).strip()
    ]
