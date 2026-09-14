# NepDate Kundali → Nepali Patro parity map

This document records the feature set found in `khumnath/nepdate-web` and the corresponding implementation target in this repository.

## NepDate Kundali features audited

- Individual Janma Kundali
- BS / AD birth-date input
- Birth time with seconds and AM/PM
- Birth-place search / geocoding
- Latitude / longitude / timezone
- Modern, Analytical and Traditional/Solar-Siddhanta calculation modes
- Lahiri / alternative ayanamsa selection
- Whole-sign houses
- Mean / true lunar node selection
- D1 Rashi / Lagna chart
- Chandra chart
- Bhava Chalit chart
- D9 Navamsha
- D10 Dashamsha
- D27 Bhamsha
- Additional divisional charts: D2, D3, D4, D7, D12, D16, D20, D24, D30, D40, D45, D60
- Planetary position table with rashi, degree, nakshatra, pada and retrograde state
- Ascendant details
- Moon rashi and rashi lord
- Sun rashi
- Nakshatra timing, pada timing and suggested naming syllable
- Tithi, paksha, yoga and karana with timing
- Anandadi yoga
- Ishta Kaal / Bhayat / Bhabhog
- Sunrise / sunset
- Samvatsara, ritu, ayana, lunar month, Shaka year and Kali year
- Ahargana and Julian Day
- Ashtakoota birth attributes
- Vimshottari dasha + antardasha
- Yogini dasha
- Ashtottari dasha
- Jaimini dasha
- Tribhagi dasha
- Expandable dasha timelines and BS/AD date display
- Long Sanskrit Janma Patrika
- A4 Janma Patrika
- English Janma Patrika
- Gotra / father / mother / child / gender details
- Saved Kundalis using local storage
- Two-person Kundali comparison / Guna Milan
- Printable Kundali / PDF workflow
- Chart style choices
- Optional outer-planet display
- Calculation/audit details

## Repository implementation direction

The Nepali Patro implementation already has a dedicated Swiss Ephemeris browser engine (`kundali/kundali-v3.js`) and an accuracy/timezone guard (`kundali/kundali-accuracy.js`). Therefore this project should **extend the existing engine/UI rather than replace it with copied NepDate compiled JavaScript**.

The NepDate repository is GPLv3 and its web build contains compiled application code. This project uses the feature behavior as a compatibility target and keeps the implementation independent.

## Current target architecture

- `kundali/index.html` — public Kundali UI
- `kundali/kundali-v3.js` — Swiss Ephemeris calculation layer
- `kundali/kundali-loader.js` — browser engine loader
- `kundali/kundali-accuracy.js` — input/timezone/audit layer
- `kundali/kundali.css` — visual layer
- `kundali/NEPDATE-PARITY.md` — feature parity contract

## Priority parity work

1. Two-person Guna Milan mode
2. Saved Kundalis mode
3. Full Janma Patrika / Sanskrit / A4 output
4. Additional varga chart selector and rendering
5. Bhayat/Bhabhog + Ishta Kaal + naming syllable block
6. Samvatsara/ritu/ayana/lunar-month/epoch block
7. Alternative dasha systems and expanded antardasha tables
8. Chart format selector (Padma/Vajra/Chaturashra)
9. Outer-planet toggle
10. Final print/PDF parity and mobile polish
