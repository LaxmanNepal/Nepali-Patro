# Nepali Patro Platform Architecture

## Purpose
Nepali Patro is a static-first Nepali calendar platform. Calendar and page content are generated into deployable HTML/JSON, while scheduled GitHub Actions refresh selected live datasets.

## Core rules

1. **Canonical data contracts:** generated and external datasets must be validated before use.
2. **Single client contract:** browser features should use `js/core/data-client.js` for JSON retrieval where practical.
3. **UI owns presentation, not transport:** page scripts should not duplicate retry/cache/error policies.
4. **Stable identifiers:** use `id` or `slug`; never depend on display names as permanent identifiers when a stable ID exists.
5. **External sources are untrusted:** validate shape, URLs and freshness before rendering.
6. **Health never suppresses catalog data:** health is metadata; the catalog remains authoritative for channel discovery.
7. **Generated files are disposable:** generators must be deterministic and validate their output before publication.
8. **CI is a guardrail, not the runtime backend:** workflows generate/validate data; the browser remains usable from published artifacts.
9. **Progressive enhancement:** offline/cache failures must degrade to readable UI rather than blank screens.
10. **No permanent patch layer:** fixes should be folded into the owning module; `*-fixes.*` files are temporary migration targets.

## Data flow

```text
External sources
   ↓
Python/Node fetchers in scripts/
   ↓
data/ + feeds/
   ↓
validation + contract tests
   ↓
static generation / Pages deployment
   ↓
web routes
```

## Dataset map

| Dataset | Updater | Output | Validation |
|---|---|---|---|
| Daily Rashifal | `scripts/fetch_rashifal.py` | `data/rashifal/` | 12 signs, source, prediction length, freshness |
| Weekly Rashifal | `scripts/fetch_weekly_rashifal.py` | `data/rashifal-weekly/` | 12 signs, week bounds, freshness |
| NRB Forex | `scripts/update_forex.py` | `feeds/forex.json` | source, dates, positive rates, freshness |
| Gold/Silver | `scripts/update_gold_rates.py` | `feeds/gold_silver.json` | positive required fields, freshness |
| Bank rates | `scripts/interest_rate_fetcher.py` | `feeds/interest_rates/` | non-empty dataset + pipeline tests |
| Itihas | `scripts/update_history.py` | `data/itihas/` | one current-day record + list fields |
| Calendar | generation scripts | `data/calendar/` | BS/AD uniqueness, metadata and round trips |

## Live TV flow

`external catalog -> normalization -> contract validation -> health metadata -> browser data client -> player/failover`

The external catalog remains the source of channel discovery. Health results are optional metadata and must never make the catalog disappear.

## Deployment and quality checks

- JavaScript syntax validation
- JSON parsing validation
- Python syntax validation
- HTML accessibility sanity checks
- CSS structural sanity checks
- Live TV external catalog contract validation
- Dataset freshness and structural validation
- Data contract tests
- SEO checks
- Concurrent workflow serialization for automated writers

Run the complete static audit with `npm run audit`.

## Reliability policy

Refresh jobs isolate individual external sources so one upstream outage does not block unrelated feeds. Failures are written to the GitHub Actions step summary. Publishable datasets still pass a fail-closed validation gate before automated commits.

The long-term target is a single data-orchestration workflow that owns automated writes to `main`. Until all writers are migrated, every workflow that writes to `main` should use the shared concurrency group `nepali-patro-main-writer` with `cancel-in-progress: false`.

For NEPSE and other derived third-party datasets, the UI should clearly distinguish official-source information from community/derived feeds and display the data timestamp/source.

## Refactor policy

New features should prefer small ES modules under `js/core` or a feature directory. Existing legacy scripts should be migrated incrementally rather than duplicated. Every migration should remove the old path after the new path has been proven by CI.
