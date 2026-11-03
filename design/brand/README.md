# Devyard brand — primary logo (Option E3)

Mark: isometric shipping container in steel outline, door end swung open, an upright amber `>`
prompt chevron inside the dark opening ("your software, shipped from the yard"). Corrugation ribs on
the long side. Wordmark: Barlow Condensed SemiBold caps with a thin amber underline rule; tagline
BUILD. TEST. DEPLOY. in IBM Plex Mono Medium. **All text is outlined to paths** (no font dependency).

Previous logo (Option A) is archived in `options/A/` with its own README and build scripts.
Other explorations: `options/B`–`options/E` (see `options/comparison.png`, `options/E/comparison.png`).

## Files (regenerate everything with `python3 build.py`)
| File | Format | Size | Use |
|---|---|---|---|
| devyard-mark-dark.svg / -512.png / -1024.png | SVG, PNG transparent | 64 viewBox; 512², 1024² | Mark on dark bg |
| devyard-mark-light.svg / -512.png / -1024.png | SVG, PNG transparent | 64 viewBox; 512², 1024² | Mark on light bg |
| devyard-lockup-dark.svg / -512.png / -1024.png | SVG, PNG transparent | ~382×128 viewBox | Horizontal lockup, dark bg |
| devyard-lockup-light.svg / -512.png / -1024.png | SVG, PNG transparent | ~382×128 viewBox | Horizontal lockup, light bg |
| devyard-favicon.svg / -32.png / -64.png | SVG, PNG | 32², 64² | Graphite tile; simplified (no ribs, no open leaf) |
| devyard-mark-24.svg / .png / @2x.png / -preview-8x.png | SVG, PNG | 24² | UI header mark; no ribs, no leaf, heavier strokes |
| devyard-mark-40.svg / .png / @2x.png / -preview-8x.png | SVG, PNG | 40² | Login mark; no ribs, keeps open leaf |
| build.py | Python (cairosvg + fontTools + Pillow) | — | Builds all of the above + options/E/chevron-before/after.png |

## Colors
| Role | Dark | Light |
|---|---|---|
| Steel outline | #9AA4AE | #3A4149 |
| Wordmark | #D6DBE0 | #1E2226 |
| Tagline | #7C858E | #5F6871 |
| Amber (chevron, rule) | #D19A3E | #B07A22 |
| Door opening | #16191C | #1E2226 |
| Open door leaf | #16191C | #E4E7EA |
| Favicon tile | #1E2226 | — |
Recommended backgrounds: dark #16191C, light #F2F3F4.

## Usage notes
- Dark assets on graphite/charcoal, light assets on white/light gray.
- Amber is the only accent; the chevron is always upright/front-facing (not skewed to the door plane).
- Under 48 px use devyard-mark-40 / -24 / favicon (simplified), never the full mark.
- Clear space ≥ chevron height; lockup minimum 160 px wide (drop tagline below ~240 px).
- The 24/40 SVGs keep their body on separate lines: `mockups/src/lib.py` inlines them by stripping line 1 and `</svg>`.
