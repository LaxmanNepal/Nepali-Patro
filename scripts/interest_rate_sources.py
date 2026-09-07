"""Official interest-rate source adapters.

URLs are restricted to official bank domains and point to the bank's
interest-rate/deposit publication where available.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class SourceAdapter:
    bank_id: str
    url: str
    parser: str
    source_type: str = "official"
    enabled: bool = True


ADAPTERS = {
    "nabil-bank": SourceAdapter("nabil-bank", "https://www.nabilbank.com/interest-rate", "html_table_v1"),
    "nic-asia-bank": SourceAdapter("nic-asia-bank", "https://www.nicasiabank.com/savings/", "html_table_v1"),
    "global-ime-bank": SourceAdapter("global-ime-bank", "https://www.globalimebank.com/pages/interest-rates/", "html_table_v1"),
    "nepal-bank": SourceAdapter("nepal-bank", "https://www.nepalbank.com.np/digital/interest-rate/interest-rates-on-deposits", "html_table_v1"),
    "nmb-bank": SourceAdapter("nmb-bank", "https://nmb.com.np/interest-rate", "html_table_v1"),
    "rastriya-banijya-bank": SourceAdapter("rastriya-banijya-bank", "https://www.rbb.com.np/content/rate-of-interest", "html_table_v1"),
    "sanima-bank": SourceAdapter("sanima-bank", "https://www.sanimabank.com/s/interest-rate", "html_table_v1"),
    "kumari-bank": SourceAdapter("kumari-bank", "https://www.kumaribank.com/interest-rate-deposits", "html_table_v1"),
    "prabhu-bank": SourceAdapter("prabhu-bank", "https://www.prabhubank.com/interest-rates", "html_table_v1"),
    "siddhartha-bank": SourceAdapter("siddhartha-bank", "https://www.siddharthabank.com/interest-rates", "html_table_v1"),
    "everest-bank": SourceAdapter("everest-bank", "https://everestbankltd.com/supports/interest-and-rates/interest-rates-deposit/", "html_table_v1"),
    "standard-chartered-bank-nepal": SourceAdapter("standard-chartered-bank-nepal", "https://www.sc.com/np/deposits/three-year-interest-rate/", "html_table_v1"),
}


def get_adapter(bank_id: str) -> SourceAdapter | None:
    return ADAPTERS.get(bank_id)
