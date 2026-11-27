import cairosvg
C=dict(dark=dict(steel="#9AA4AE",word="#D6DBE0",tag="#7C858E",amber="#D19A3E",tile="#1E2226"),
       light=dict(steel="#3A4149",word="#1E2226",tag="#5F6871",amber="#B07A22",tile="#1E2226"))
L={'D':"M0 0H18L28 10V30L18 40H0Z",'E':"M28 0H0V40H28M0 20H22",'V':"M0 0L14 40L28 0",
   'Y':"M0 0L14 20L28 0M14 20V40",'A':"M0 40V10L10 0H18L28 10V40M0 24H28",
   'R':"M0 40V0H18L28 10V14L18 24H0M14 24L28 40"}
def mark(c,sw=6): return (f'<path d="M14 12H40L52 24V40L40 52H14Z" fill="none" stroke="{c["steel"]}" stroke-width="{sw}" stroke-linejoin="miter"/>'
  f'<path d="M24 24L32 32L24 40" fill="none" stroke="{c["amber"]}" stroke-width="{sw-1}" stroke-linecap="square" stroke-linejoin="miter"/>')
def word(c): return "".join(f'<path transform="translate({i*40} 0)" d="{L[ch]}" fill="none" stroke="{c["word"]}" stroke-width="5" stroke-linejoin="miter" stroke-miterlimit="2" stroke-linecap="butt"/>' for i,ch in enumerate("DEVYARD"))
def svg(vb,body,w): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}">\n{body}\n</svg>\n'
files={}
for v,c in C.items():
    files[f"devyard-mark-{v}.svg"]=svg("0 0 64 64",mark(c),64)
    files[f"devyard-lockup-{v}.svg"]=svg("0 0 520 128",
      f'<g transform="translate(16 20) scale(1.5625)">{mark(c)}</g>'
      f'<g transform="translate(140 30) scale(1.2)">{word(c)}</g>'
      f'<rect x="140" y="92" width="24" height="3" fill="{c["amber"]}"/>'
      f'<text x="174" y="99" font-family="Geist Mono, IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="15" font-weight="500" letter-spacing="3.5" fill="{c["tag"]}">BUILD. TEST. DEPLOY.</text>',520)
# favicon: graphite tile so it reads on any tab
c=C['dark']; files["devyard-favicon.svg"]=svg("0 0 64 64",f'<rect x="2" y="2" width="60" height="60" rx="6" fill="{c["tile"]}"/>'+mark(c,7),64)
for n,s in files.items(): open(n,"w").write(s)
for n in files:
    b=n[:-4]
    sizes=[32,64] if "favicon" in n else [512,1024]
    for w in sizes: cairosvg.svg2png(url=n,write_to=f"{b}-{w}.png",output_width=w)
# previews on backgrounds for checking
for v,bg in (("dark","#16191C"),("light","#F2F3F4")):
    s=files[f"devyard-lockup-{v}.svg"].replace('width="520">',f'width="520"><rect width="520" height="128" fill="{bg}"/>')
    cairosvg.svg2string=None; cairosvg.svg2png(bytestring=s.encode(),write_to=f"/tmp/prev-{v}.png",output_width=1024)
