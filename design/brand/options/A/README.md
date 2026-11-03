# Devyard brand — Option A (archived; superseded by E3 at brand root)

Moved here from the brand root on 2026-11-02. `build.py` and `build-marks.py` still run from this folder.

Mark: a chamfered steel "D" (machined plate / yard enclosure) holding a muted-amber
prompt chevron `>` (the build/deploy action). Wordmark is hand-built monoline geometry
(paths, no font dependency) with the same 45° chamfers. Tagline: BUILD. TEST. DEPLOY.

## Files
| File | Format | Size | Use |
|---|---|---|---|
| devyard-mark-dark.svg | SVG, transparent | viewBox 64×64 | Mark on dark backgrounds |
| devyard-mark-light.svg | SVG, transparent | viewBox 64×64 | Mark on light backgrounds |
| devyard-lockup-dark.svg | SVG, transparent | viewBox 520×128 | Horizontal lockup (mark + wordmark + tagline), dark bg |
| devyard-lockup-light.svg | SVG, transparent | viewBox 520×128 | Horizontal lockup, light bg |
| devyard-favicon.svg | SVG | viewBox 64×64 | Favicon source (mark on graphite tile, transparent corners) |
| devyard-mark-{dark,light}-{512,1024}.png | PNG, transparent | 512² / 1024² | Raster mark |
| devyard-lockup-{dark,light}-{512,1024}.png | PNG, transparent | 512×126 / 1024×252 | Raster lockup |
| devyard-favicon-{32,64}.png | PNG, transparent | 32² / 64² | Browser favicon / app icon |
| build.py | Python (cairosvg) | — | Regenerates all SVG + PNG: `python3 build.py` |

## Colors
| Role | Dark variant | Light variant |
|---|---|---|
| Mark steel | #9AA4AE | #3A4149 |
| Wordmark | #D6DBE0 | #1E2226 |
| Tagline | #7C858E | #5F6871 |
| Accent (muted amber) | #D19A3E | #B07A22 |
| Favicon tile / graphite | #1E2226 | — |
| Recommended dark bg | #16191C (graphite) | Recommended light bg #F2F3F4 |

## Usage notes
- Use `-dark` assets on graphite/charcoal surfaces, `-light` on white/light gray. Don't swap.
- Amber is the only accent; never recolor the chevron or add gradients/shadows.
- Clear space: at least the chevron height on all sides. Minimum: mark 16px, lockup 160px wide
  (below ~240px wide, drop the tagline and use mark + wordmark or mark only).
- Tagline is live `<text>` (Geist Mono → IBM Plex Mono → DejaVu Sans Mono fallback); convert to
  outlines before sending to print/external vendors. Wordmark and mark are pure paths.
- Favicon uses its own graphite tile so it reads on both light and dark browser tabs.

## Small-size marks (gap G2 — DY-D1)
| File | Size | Notes |
|---|---|---|
| devyard-mark-24.svg | 24×24 | Simplified: 2 px strokes on whole pixels, smaller chamfer, shorter chevron (crisp at 1×) |
| devyard-mark-40.svg | 40×40 | Master geometry scaled 40/64, strokes 3.5 / 3 px |
| devyard-mark-{24,40}.png / @2x.png | 1× / 2× | Transparent PNG previews |
| devyard-mark-{24,40}-preview-8x.png | 192² / 320² | Enlarged previews on #12171c |
| build-marks.py | — | `python3 build-marks.py` regenerates the above |
