"""Official interest-rate source adapters."""
from dataclasses import dataclass


@dataclass(frozen=True)
class SourceAdapter:
    bank_id: str
    url: str
    parser: str
    source_type: str = "official"
    enabled: bool = True


ADAPTERS = {
    "nabil-bank": SourceAdapter("nabil-bank", "https://www.nabilbank.com/interest-rate", "nabil_html_table_v1"),
    "nic-asia-bank": SourceAdapter("nic-asia-bank", "https://www.nicasiabank.com/interest-rates/", "nic_asia_html_table_v1"),
    "global-ime-bank": SourceAdapter("global-ime-bank", "https://www.globalimebank.com/interest-rates/", "global_ime_html_table_v1"),
    "nepal-bank": SourceAdapter("nepal-bank", "https://www.nepalbank.com.np/digital/interest-rate", "nepal_bank_html_table_v1"),
    "nmb-bank": SourceAdapter("nmb-bank", "https://nmb.com.np/interest-rate", "nmb_html_table_v1"),
    "rastriya-banijya-bank": SourceAdapter("rastriya-banijya-bank", "https://www.rbb.com.np/content/base-rate-and-spread-rate", "rbb_html_table_v1"),
}


def get_adapter(bank_id: str) -> SourceAdapter | None:
    return ADAPTERS.get(bank_id)
