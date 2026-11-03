#!/usr/bin/env python3
"""Build DY-D1 mockups: writes HTML to src/out/*.html and screenshots to ../<name>.png with headless Chrome.
Usage: python3 build.py [name ...]"""
import os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from screens import S
OUT = os.path.join(HERE, 'html'); os.makedirs(OUT, exist_ok=True)
CHROME = os.environ.get('CHROME', 'google-chrome')
only = sys.argv[1:]
import shutil; shutil.copy(os.path.join(HERE,'styles.css'), os.path.join(OUT,'styles.css'))
for name,(html,w,h) in S.items():
    if only and name not in only: continue
    p = os.path.join(OUT, name + '.html'); open(p,'w').write(html)
    png = os.path.abspath(os.path.join(HERE, '..', name + '.png'))
    subprocess.run([CHROME,'--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1',
                    f'--window-size={w},{h}', f'--screenshot={png}', 'file://'+p], check=True, capture_output=True)
    print(name, f'{w}x{h}')
