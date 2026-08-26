# Production Kundali runtime

The public `/kundali/` page must not depend on runtime WebAssembly downloads. The previous implementation failed with `Aborted(both async and sync fetching of the wasm failed)` because the generated Emscripten loader could not retrieve its binary. This directory now contains a zero-WASM fallback engine so the static GitHub Pages deployment remains functional offline.

The fallback is intentionally labeled approximate. A future backend can provide authoritative Swiss Ephemeris results without changing the UI contract.
