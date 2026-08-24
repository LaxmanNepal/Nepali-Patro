# Live data feeds

All automated feeds should expose a common metadata contract where possible:

- `source`: official source URL/name
- `updated_at`: source/data update time
- `checked_at`: last successful collector check
- `status`: `ok`, `stale`, or `error`
- `data`: current values
- `history`: historical changes when available

Collectors must never invent values. If the official source cannot be verified, publish `status: error` or `stale` rather than replacing data with guesses.