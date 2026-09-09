# स्थानीय सरकार निर्देशिका

This directory is generated from the Ministry of Federal Affairs and General Administration (MoFAGA) local-contact directory.

- Official source: https://mofaga.gov.np/local-contact
- Expected records: 753 local governments
- Generator: `scripts/build-local-governments.mjs`
- Scheduled refresh: `.github/workflows/local-government-directory.yml`

The generator intentionally fails when fewer than 700 records are collected, so a source-page change does not silently publish a partial directory.
