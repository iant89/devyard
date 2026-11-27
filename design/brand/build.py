"""Devyard primary brand (Option E3: open container + upright amber chevron).
Run from this folder: python3 build.py  -> all SVG/PNG at brand root + options/E chevron before/after."""
import cairosvg, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image
G="/usr/share/fonts/truetype/sand-box/google/"
PAL={'dark':dict(steel="#9AA4AE",word="#D6DBE0",tag="#7C858E",amber="#D19A3E",hole="#16191C",leaf="#16191C"),
     'light':dict(steel="#3A4149",word="#1E2226",tag="#5F6871",amber="#B07A22",hole="#1E2226",leaf="#E4E7EA")}
TILE="#1E2226"
def text(s,font,size,x,y,fill,track=0):
    f=TTFont(G+font); gs=f.getGlyphSet(); cm=f.getBestCmap(); k=size/f['head'].unitsPerEm; out=[];cx=0
    for ch in s:
        g=cm[ord(ch)]; p=SVGPathPen(gs); gs[g].draw(TransformPen(p,(k,0,0,-k,x+cx,y))); out.append(p.getCommands()); cx+=gs[g].width*k+track
    return f'<path fill="{fill}" d="{" ".join(out)}"/>',cx-track
# isometric container: F=top-front corner, U=long side axis, V=door-end axis, H=height
F=(27,31); U=(29.4,-17); V=(-20.8,-12); H=26
P=lambda a=0,b=0,c=0:(F[0]+a*U[0]+b*V[0],F[1]+a*U[1]+b*V[1]+c*H)
pts=lambda *q:" ".join(f"{x:.1f},{y:.1f}" for x,y in q)
def mark(c,small=False,leaf=True,ribs=None):
    sw=5.5 if small else 4.5; ribs=(not small) if ribs is None else ribs; o=[]
    door=[P(),P(0,1),P(0,1,1),P(0,0,1)]
    o.append(f'<polygon points="{pts(*door)}" fill="{c["hole"]}"/>')
    # upright, front-facing chevron centred in the door opening (screen-space, not skewed)
    cx,cy=P(0,.5,.5); hw,hh=(4,7) if not small else (4.2,7.5)
    o.append(f'<polyline points="{pts((cx-hw+0.5,cy-hh),(cx+hw+0.5,cy),(cx-hw+0.5,cy+hh))}" fill="none" stroke="{c["amber"]}" stroke-width="{sw}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4"/>')
    if ribs:
        for t in (.2,.35,.5,.65,.8):
            a,b=P(t,0,.16),P(t,0,.84); o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c["steel"]}" stroke-width="1.6"/>')
    hexo=[P(0,1),P(1,1),P(1),P(1,0,1),P(0,0,1),P(0,1,1)]
    o.append(f'<polygon points="{pts(*hexo)}" fill="none" stroke="{c["steel"]}" stroke-width="{sw}" stroke-linejoin="miter"/>')
    a,b=P(),P(0,0,1)
    o.append(f'<polyline points="{pts(P(0,1),P(),P(1))}" fill="none" stroke="{c["steel"]}" stroke-width="{sw}"/><line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c["steel"]}" stroke-width="{sw}"/>')
    if leaf:
        t,bt=P(0,1),P(0,1,1); lx=-9
        o.append(f'<polygon points="{pts(t,(t[0]+lx,t[1]+9),(bt[0]+lx,bt[1]+9),bt)}" fill="{c["leaf"]}" stroke="{c["steel"]}" stroke-width="{sw*.7:.2f}" stroke-linejoin="bevel"/>')
    return "".join(o)
FIT='translate(32 32) scale(0.9) translate(-26.5 -30)'   # fits mark incl. open leaf into 64x64
svg=lambda vb,w,h,body:f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">\n{body}\n</svg>\n'
def png(name,widths,bg=None):
    for w in widths: cairosvg.svg2png(url=name,write_to=name[:-4]+f"-{w}.png",output_width=w)
for v,c in PAL.items():
    n=f"devyard-mark-{v}.svg"; open(n,"w").write(svg("0 0 64 64",64,64,f'<g transform="{FIT}">{mark(c)}</g>')); png(n,[512,1024])
    wp,ww=text("DEVYARD","Barlow Condensed/BarlowCondensed-SemiBold.ttf",62,140,74,c["word"],1.5)
    tp,tw=text("BUILD. TEST. DEPLOY.","IBM Plex Mono/IBMPlexMono-Medium.ttf",14,141,104,c["tag"],3.2)
    w=int(max(140+ww,141+tw)+24)
    n=f"devyard-lockup-{v}.svg"
    open(n,"w").write(svg(f"0 0 {w} 128",w,128,f'<g transform="translate(14 16) scale(1.5625)">{mark(c)}</g>{wp}<rect x="141" y="84" width="{ww-2:.0f}" height="2" fill="{c["amber"]}"/>{tp}'))
    png(n,[512,1024])
D=PAL['dark']
# favicon: graphite tile, simplified (no ribs, no leaf)
fav=svg("0 0 64 64",64,64,f'<rect x="1" y="1" width="62" height="62" rx="6" fill="{TILE}"/><g transform="translate(32 32) scale(1.0) translate(-31 -30)">{mark(D,True,False)}</g>')
open("devyard-favicon.svg","w").write(fav); png("devyard-favicon.svg",[32,64])
# small marks for UI (transparent, dark UI). 24: no ribs/leaf. 40: no ribs, keeps leaf.
# NOTE mockups/src/lib.py strips line 1 and </svg>, so keep the body on its own lines.
for s,leaf,k in ((24,False,24/64),(40,True,40/64)):
    body=f'<g transform="scale({k:.4f})"><g transform="{"translate(32 32) scale(0.85) translate(-26.5 -30)" if leaf else "translate(32 32) scale(0.92) translate(-31 -30)"}">{mark(D,True,leaf)}</g></g>'
    n=f"devyard-mark-{s}.svg"; open(n,"w").write(svg(f"0 0 {s} {s}",s,s,body))
    cairosvg.svg2png(url=n,write_to=f"devyard-mark-{s}.png",output_width=s)
    cairosvg.svg2png(url=n,write_to=f"devyard-mark-{s}@2x.png",output_width=s*2)
    cairosvg.svg2png(url=n,write_to=f"devyard-mark-{s}-preview-8x.png",output_width=s*8,background_color="#12171c")
# chevron before/after sheets
def sheet(out,mark_png,fav_png,label):
    Image.open(fav_png).resize((128,128),Image.NEAREST).save("/tmp/_f4.png")
    import base64; b=lambda f:"data:image/png;base64,"+base64.b64encode(open(f,"rb").read()).decode()
    lp,_=text(label,"IBM Plex Mono/IBMPlexMono-Medium.ttf",16,30,40,"#7C858E",0.5)
    s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" width="900"><rect width="900" height="320" fill="#16191C"/>{lp}<image x="20" y="60" width="560" height="140" href="{b(mark_png)}"/><image x="640" y="140" width="32" height="32" href="{b(fav_png)}"/><image x="720" y="92" width="128" height="128" href="{b("/tmp/_f4.png")}"/></svg>'
    cairosvg.svg2png(bytestring=s.encode(),write_to=out,output_width=900)
os.makedirs("options/E",exist_ok=True)
if os.path.exists("/tmp/E3-before-lockup.png"):
    sheet("options/E/chevron-before.png","/tmp/E3-before-lockup.png","/tmp/E3-before-fav.png","BEFORE  E3 chevron skewed to door plane  |  32px  |  4x")
sheet("options/E/chevron-after.png","devyard-lockup-dark-1024.png","devyard-favicon-32.png","AFTER  upright front-facing chevron  |  32px  |  4x")
print("ok")
