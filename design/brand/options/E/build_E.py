import cairosvg,base64
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
G="/usr/share/fonts/truetype/sand-box/google/"
S,W,T,A,BG,TILE="#9AA4AE","#D6DBE0","#7C858E","#D19A3E","#16191C","#1E2226"
def text(s,font,size,x,y,fill,track=0):
    f=TTFont(G+font); gs=f.getGlyphSet(); cm=f.getBestCmap(); k=size/f['head'].unitsPerEm; out=[];cx=0
    for ch in s:
        g=cm[ord(ch)]; p=SVGPathPen(gs); gs[g].draw(TransformPen(p,(k,0,0,-k,x+cx,y))); out.append(p.getCommands()); cx+=gs[g].width*k+track
    return f'<path fill="{fill}" d="{" ".join(out)}"/>',cx-track
F=(27,31); U=(29.4,-17); V=(-20.8,-12); H=26
P=lambda a=0,b=0,c=0:(F[0]+a*U[0]+b*V[0],F[1]+a*U[1]+b*V[1]+c*H)
pts=lambda *q:" ".join(f"{x:.1f},{y:.1f}" for x,y in q)
poly=lambda q,fill="none",stroke="none",sw=0:f'<polygon points="{pts(*q)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="miter"/>'
line=lambda a,b,sw,c=S:f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c}" stroke-width="{sw}"/>'
top=[P(),P(1),P(1,1),P(0,1)]; door=[P(),P(0,1),P(0,1,1),P(0,0,1)]
hexo=[P(0,1),P(1,1),P(1),P(1,0,1),P(0,0,1),P(0,1,1)]
def mark(v,small=False):
    sw=5.5 if small else 4.5; o=[]
    if v in(1,): o.append(poly(top,A))
    if v==2: o.append(poly(door,A))
    if v==3:
        o.append(poly(door,BG))
        # chevron inside door opening (face coords: b along width, c down)
        ch=[P(0,.7,.22),P(0,.3,.5),P(0,.7,.78)]
        o.append(f'<polyline points="{pts(*ch)}" fill="none" stroke="{A}" stroke-width="{sw if small else 5}" stroke-linejoin="miter"/>')
    if v!=1 and not small or v==3: pass
    ribs=(v in(1,3)) and not small
    if ribs:
        for t in (.2,.35,.5,.65,.8): o.append(line(P(t,0,.16),P(t,0,.84),1.6))
    if v in(1,2):  # closed doors: centre seam + lock bars
        dc=BG if v==2 else S
        o.append(line(P(0,.5,0),P(0,.5,1),2.2 if not small else 3,dc))
        if not small:
            for b in(.25,.75): o.append(line(P(0,b,.12),P(0,b,.88),1.2,dc))
    o.append(poly(hexo,stroke=S,sw=sw)); o.append(f'<polyline points="{pts(P(0,1),P(),P(1))}" fill="none" stroke="{S}" stroke-width="{sw}"/>'+line(P(),P(0,0,1),sw))
    if v==3 and not small:  # open leaf swung outward from hinge at left edge
        hinge_t,hinge_b=P(0,1),P(0,1,1); lx=-9
        o.append(poly([hinge_t,(hinge_t[0]+lx,hinge_t[1]+9),(hinge_b[0]+lx,hinge_b[1]+9),hinge_b],BG,S,sw*0.7))
    return "".join(o)
desc={1:"Amber roof · corrugated side · closed doors",2:"Amber door face · plain side · closed doors",3:"Open door + amber › · corrugated side"}
for v in (1,2,3):
    n=f"devyard-E{v}"
    open(f"{n}-mark.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64">\n{mark(v)}\n</svg>\n')
    fav=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64"><rect x="1" y="1" width="62" height="62" rx="6" fill="{TILE}"/><g transform="translate(32 32) scale(1.0) translate(-31 -30)">{mark(v,True)}</g></svg>\n'
    open(f"{n}-favicon.svg","w").write(fav)
    cairosvg.svg2png(bytestring=fav.encode(),write_to=f"{n}-favicon-32.png",output_width=32)
    wp,ww=text("DEVYARD","Barlow Condensed/BarlowCondensed-SemiBold.ttf",62,140,74,W,1.5)
    tp,tw=text("BUILD. TEST. DEPLOY.","IBM Plex Mono/IBMPlexMono-Medium.ttf",14,141,104,T,3.2)
    w=int(max(140+ww,141+tw)+24)
    body=f'<g transform="translate(14 16) scale(1.5625)">{mark(v)}</g>{wp}<rect x="141" y="84" width="{ww-2:.0f}" height="2" fill="{A}"/>{tp}'
    open(f"{n}-lockup-dark.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 128" width="{w}">\n{body}\n</svg>\n')
    cairosvg.svg2png(url=f"{n}-lockup-dark.svg",write_to=f"{n}-lockup-dark-1024.png",output_width=1024)
from PIL import Image
for v in (1,2,3): Image.open(f'devyard-E{v}-favicon-32.png').resize((128,128),Image.NEAREST).save(f'/tmp/E{v}-4x.png')
# comparison
b64=lambda f:"data:image/png;base64,"+base64.b64encode(open(f,"rb").read()).decode()
parts=[]
for i,v in enumerate((1,2,3)):
    y=30+i*230; n=f"devyard-E{v}"
    lp,_=text(f"E{v}","Barlow Condensed/BarlowCondensed-SemiBold.ttf",40,60,y+50,A,1)
    cp,_=text(desc[v],"IBM Plex Mono/IBMPlexMono-Medium.ttf",15,120,y+44,T,0.5)
    l2,_=text("32px","IBM Plex Mono/IBMPlexMono-Medium.ttf",12,1040,y+190,T); l3,_=text("4x","IBM Plex Mono/IBMPlexMono-Medium.ttf",12,1150,y+190,T)
    parts.append(f'<rect x="30" y="{y}" width="1300" height="210" fill="{TILE}" stroke="#2C3238" stroke-width="2"/>{lp}{cp}'
      f'<image x="60" y="{y+60}" width="560" height="140" href="{b64(n+"-lockup-dark-1024.png")}"/>'
      f'<image x="1040" y="{y+120}" width="32" height="32" href="{b64(n+"-favicon-32.png")}"/>'
      f'<image x="1150" y="{y+42}" width="128" height="128" href="{b64(f"/tmp/E{v}-4x.png")}"/>{l2}{l3}')
sheet=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1360 720" width="1360"><rect width="1360" height="720" fill="{BG}"/>{"".join(parts)}</svg>'
cairosvg.svg2png(bytestring=sheet.encode(),write_to="comparison.png",output_width=1360)
