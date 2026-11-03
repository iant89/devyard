"""Gap G2: small-size Devyard marks (24 px and 40 px), pixel-snapped, plus PNG previews.
Run: python3 build-marks.py"""
import cairosvg
STEEL, AMBER, BG = "#9AA4AE", "#D19A3E", "#12171c"
# 24 px: simplified — 2 px strokes on whole-pixel centres, smaller chamfer, shorter chevron
M24 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<path d="M5 4H14L19 9V15L14 20H5Z" fill="none" stroke="{STEEL}" stroke-width="2" stroke-linejoin="miter"/>
<path d="M9 9L12 12L9 15" fill="none" stroke="{AMBER}" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>
'''
# 40 px: master geometry scaled 40/64, strokes rounded to 3.5 / 3
M40 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
<path d="M9 7.5H25L32.5 15V25L25 32.5H9Z" fill="none" stroke="{STEEL}" stroke-width="3.5" stroke-linejoin="miter"/>
<path d="M15 15L20 20L15 25" fill="none" stroke="{AMBER}" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>
'''
for n, svg in (("24", M24), ("40", M40)):
    open(f"devyard-mark-{n}.svg", "w").write(svg)
    s = int(n)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"devyard-mark-{n}.png", output_width=s, output_height=s)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"devyard-mark-{n}@2x.png", output_width=s*2, output_height=s*2)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"devyard-mark-{n}-preview-8x.png", output_width=s*8, output_height=s*8, background_color=BG)
print("ok")
