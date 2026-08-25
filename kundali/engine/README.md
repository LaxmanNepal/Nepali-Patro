# Kundali Backend Engine

The production architecture uses a server-side astronomy engine as the authoritative calculation layer. The browser UI must not assume that a WASM Swiss Ephemeris instance has already been initialized.

## Contract

`POST /api/kundali/calculate`

Input:
- `date`: Gregorian `YYYY-MM-DD`
- `time`: local `HH:mm:ss`
- `latitude`, `longitude`: decimal degrees
- `timezone`: IANA timezone when available
- `ayanamsa`: `lahiri`, `raman`, or `krishnamurti`
- `node`: `mean` or `true`
- `houseSystem`: `whole-sign`, `equal`, or `sripati`

Output:
- normalized UTC/JD metadata
- ascendant and houses
- Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu
- sidereal longitude/sign/degree
- nakshatra/pada
- dasha-ready Moon longitude
- calculation engine/version metadata

The browser UI may use a WASM fallback, but it must call `await swe.init()` before any calculation and must queue concurrent calculations behind the initialization promise.
