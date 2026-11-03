import cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
G="/usr/share/fonts/truetype/sand-box/google/"
S,W,T,A,BG="#9AA4AE","#D6DBE0","#7C858E","#D19A3E","#16191C"
def text(s,font,size,x,y,fill,track=0):
    f=TTFont(G+font); gs=f.getGlyphSet(); cmap=f.getBestCmap(); k=size/f['head'].unitsPerEm
    out=[];cx=0
    for ch in s:
        g=cmap[ord(ch)]; p=SVGPathPen(gs)
        gs[g].draw(TransformPen(p,(k,0,0,-k,x+cx,y))); out.append(p.getCommands())
        cx+=gs[g].width*k+track
    return f'<path fill="{fill}" d="{" ".join(out)}"/>',cx-track
st=lambda c,w=4:f'fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="miter" stroke-miterlimit="4"'
marks={
'B':f'<path d="M16 56V12M8 12H56M16 26L30 12M24 56H8" {st(S)}/><path d="M46 12V28" {st(S,2.5)}/><rect x="37" y="30" width="18" height="13" fill="{A}"/><path d="M41 33V40M46 33V40M51 33V40" stroke="{BG}" stroke-width="1.5"/>',
'C':f'<path d="M32 6L54 19L32 32L10 19Z" fill="{A}"/><path d="M32 6L54 19V45L32 58L10 45V19Z M10 19L32 32L54 19 M32 32V58" {st(S,4.5)}/>',
'D':f'<path d="M14 32H50" {st(S,3)}/><rect x="4" y="25" width="14" height="14" stroke="{S}" stroke-width="4" fill="{BG}"/><rect x="25" y="25" width="14" height="14" fill="{S}"/><path d="M46 22H52L62 32L52 42H46Z" fill="{A}"/>',
}
fonts={'B':("Barlow Condensed/BarlowCondensed-SemiBold.ttf",62,1.5,"IBM Plex Mono/IBMPlexMono-Medium.ttf",14,3.2),
       'C':("Chakra Petch/ChakraPetch-SemiBold.ttf",50,5,"Rajdhani/Rajdhani-SemiBold.ttf",17,4.5),
       'D':("IBM Plex Sans Condensed/IBMPlexSansCondensed-Medium.ttf",56,2,"JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf",13.5,3)}
word={'B':"DEVYARD",'C':"DEVYARD",'D':"devyard"}
for o,m in marks.items():
    wf,ws,wt,tf,ts,tt=fonts[o]
    open(f"{o}/devyard-{o}-mark.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64">\n{m}\n</svg>\n')
    wp,ww=text(word[o],wf,ws,140,74,W,wt)
    tp,tw=text("BUILD. TEST. DEPLOY." if o!='D' else "Build. Test. Deploy.",tf,ts,141,104,T,tt)
    w=int(max(140+ww,141+tw)+24)
    body=f'<g transform="translate(16 14) scale(1.5625)">{m}</g>{wp}{tp}'
    if o=='B': body+=f'<rect x="141" y="84" width="{ww-2:.0f}" height="2" fill="{A}"/>'
    open(f"{o}/devyard-{o}-lockup-dark.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 128" width="{w}">\n{body}\n</svg>\n')
    cairosvg.svg2png(url=f"{o}/devyard-{o}-lockup-dark.svg",write_to=f"{o}/devyard-{o}-lockup-dark-1024.png",output_width=1024)
# comparison sheet 2x2
import base64
cells=[('A',"../devyard-lockup-dark.svg","Chamfered D + prompt chevron · custom monoline"),('B',"B/devyard-B-lockup-dark.svg","Gantry crane · Barlow Condensed"),
       ('C',"C/devyard-C-lockup-dark.svg","Isometric build-block monogram · Chakra Petch"),('D',"D/devyard-D-lockup-dark.svg","Pipeline stages · IBM Plex Sans Cond.")]
parts=[]
for i,(l,f,cap) in enumerate(cells):
    x=40+(i%2)*800; y=40+(i//2)*360
    uri="data:image/svg+xml;base64,"+base64.b64encode(open(f,"rb").read()).decode()
    lp,_=text(l,"Chakra Petch/ChakraPetch-SemiBold.ttf",40,x+28,y+64,A)
    cp,_=text(cap,"IBM Plex Mono/IBMPlexMono-Medium.ttf",16,x+80,y+58,T,0.5)
    parts.append(f'<rect x="{x}" y="{y}" width="760" height="320" fill="#1E2226" stroke="#2C3238" stroke-width="2"/>{lp}{cp}'
                 f'<image x="{x+40}" y="{y+110}" width="680" height="170" preserveAspectRatio="xMinYMid meet" href="{uri}"/>')
sheet=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1640 800" width="1640"><rect width="1640" height="800" fill="{BG}"/>{"".join(parts)}</svg>'
open("/tmp/comparison.svg","w").write(sheet)
cairosvg.svg2png(bytestring=sheet.encode(),write_to="comparison.png",output_width=1640)
