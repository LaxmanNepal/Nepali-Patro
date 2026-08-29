# Nepali Patro Platform Architecture

## Rules

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

## Live TV flow

`external catalog -> normalization -> contract validation -> health metadata -> browser data client -> player/failover`

The external catalog remains the source of channel discovery. Health results are optional metadata and must never make the catalog disappear.

## Deployment checks

- JavaScript syntax validation
- JSON parsing validation
- Python syntax validation
- HTML accessibility sanity checks
- Live TV external catalog contract validation
- Existing site/data validation
- Concurrent workflow cancellation

## Refactor policy

New features should prefer small ES modules under `js/core` or a feature directory. Existing legacy scripts should be migrated incrementally rather than duplicated. Every migration should remove the old path after the new path has been proven by CI.
