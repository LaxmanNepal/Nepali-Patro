"""Official interest-rate source adapters.

This module keeps source-specific extraction rules separate from the daily
pipeline. It intentionally fails closed: an adapter must explicitly prove
that it found a supported table before data can be marked verified.
"""
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class SourceAdapter:
    bank_id: str
    url: str
    parser: str
    source_type: str = "official"
    enabled: bool = True


# Verified official source endpoints discovered for the first adapter batch.
# Parsing implementations are enabled only when their page structure has
# passed validation tests in the fetcher.
ADAPTERS = {
    "nabil-bank": SourceAdapter(
        bank_id="nabil-bank",
        url="https://www.nabilbank.com/interest-rate",
        parser="nabil_html_table_v1",
    ),
    "nic-asia-bank": SourceAdapter(
        bank_id="nic-asia-bank",
        url="https://www.nicasiabank.com/interest-rates/",
        parser="nic_asia_html_table_v1",
    ),
    "global-ime-bank": SourceAdapter(
        bank_id="global-ime-bank",
        url="https://www.globalimebank.com/interest-rates/",
        parser="global_ime_html_table_v1",
    ),
    "nepal-bank": SourceAdapter(
        bank_id="nepal-bank",
        url="https://www.nepalbank.com.np/interest-rate",
        parser="nepal_bank_html_table_v1",
    ),
}


def get_adapter(bank_id: str) -> SourceAdapter | None:
    return ADAPTERS.get(bank_id)
