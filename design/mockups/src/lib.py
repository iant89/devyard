import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = json.load(open(os.path.join(HERE, 'icons.json')))
MARK24 = open(os.path.join(HERE, '../../brand/devyard-mark-24.svg')).read().split('\n',1)[1].rsplit('</svg>',1)[0]
MARK40 = open(os.path.join(HERE, '../../brand/devyard-mark-40.svg')).read().split('\n',1)[1].rsplit('</svg>',1)[0]

def ic(n, size=16, cls='', style=''):
    return f'<svg class="i {cls}" viewBox="0 0 24 24" style="width:{size}px;height:{size}px;{style}">{ICONS[n]}</svg>'

def mark(px=24):
    if px <= 32:
        return f'<svg viewBox="0 0 24 24" width="{px}" height="{px}" style="flex:none">{MARK24}</svg>'
    return f'<svg viewBox="0 0 40 40" width="{px}" height="{px}" style="flex:none">{MARK40}</svg>'

def doc(body, w, h, extra_css=''):
    return f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="styles.css">
<style>html,body{{width:{w}px;height:{h}px}} {extra_css}</style></head><body style="position:relative">{body}</body></html>'''

ST_ICON = {'success':'circle-check','error':'circle-x','warning':'triangle-alert','info':'loader-circle','neutral':'circle-alert'}
def st(tone, label, size=15):
    icon = ST_ICON[tone]
    if tone=='neutral': return f'<span class="st neutral"><span class="dot neutral" style="margin:0 3px"></span>{label}</span>'
    return f'<span class="st {tone}">{ic(icon,size)}{label}</span>'

NAV = [
 ('Build', [
  ('Dashboard','layout-dashboard',[]),
  ('Projects','folder-git-2',['All Projects','My Projects','Shared Projects']),
  ('Playground','square-code',['New Playground','Saved Playgrounds']),
  ('Development','monitor-cog',['Workspaces','Environments']),
  ('Git','git-branch',['Repositories','Branches','Remotes']),
  ('Pipelines','workflow',['All Pipelines','Build History','Runners']),
  ('Deployments','rocket',['Applications','Deployment History','Domains']),
  ('Monitoring','activity',['System','Applications','Logs']),
 ]),
 ('System', [
  ('Notifications','bell',[]),
  ('Administration','shield',['Users','Permissions','Storage','Infrastructure','Security','Settings']),
 ]),
]

def nav_items(active='Dashboard', active_sub=None, expanded=('Projects',), tall=False, annotate=True):
    out = []
    for gi,(g, items) in enumerate(NAV):
        out.append(f'<div class="ngrp{" div" if gi else ""}">{g}</div>')
        for label, icon, subs in items:
            sel = label==active and not active_sub
            h = ' style="height:44px"' if tall else ''
            extra = ''
            if label=='Notifications': extra = '<span class="nb">3</span>'
            elif subs: extra = ic('chevron-down' if label in expanded else 'chevron-right', 14, 'chev')
            ann = '<span class="ann">ADMIN ONLY</span>' if (label=='Administration' and annotate) else ''
            out.append(f'<div class="ni{" sel" if sel else ""}"{h}>{ic(icon)}<span>{label}</span>{ann}{extra}</div>')
            if label in expanded:
                for s in subs:
                    sh = ' style="height:44px"' if tall else ''
                    out.append(f'<div class="ni sub{" sel" if (label==active and s==active_sub) else ""}"{sh}>{s}</div>')
    return ''.join(out)

def header_desktop(project='All projects'):
    return f'''<header class="hdr">
 <span class="ibtn">{ic('menu')}</span>
 <div class="brand">{mark(24)}<b>Devyard</b><span class="tg">Build. Test. Deploy.</span></div>
 <div class="sp"></div>
 <div class="search" style="width:420px">{ic('search',15)}<span>Search projects, pipelines, deployments…</span><span class="kbd">⌘K</span></div>
 <div class="sp"></div>
 <div class="input select" style="width:180px;height:32px;font-size:13px">{ic('folder-git-2',15)}<span style="flex:1">{project}</span>{ic('chevron-down',14)}</div>
 <span class="ibtn">{ic('circle-question-mark')}</span>
 <span class="ibtn" id="bell">{ic('bell')}<span class="badge-count">3</span></span>
 <span class="avatar" style="margin:0 6px 0 4px">IT</span>
</header>'''

def shell_desktop(content, crumbs, active='Dashboard', active_sub=None, expanded=('Projects',), crumb_actions='', overlay='', project='All projects'):
    cr = ' <span class="sepr">/</span> '.join(
        f'<span class="{"cur" if i==len(crumbs)-1 else ""}">{c}</span>' for i,c in enumerate(crumbs))
    return f'''<div class="app">{header_desktop(project)}
<div class="body">
 <nav class="nav"><div class="nav-scroll">{nav_items(active, active_sub, expanded)}</div>
  <div class="nav-foot"><span>Phase 1 · v0.1.0</span><span class="sp"></span><span class="ibtn" style="width:28px;height:28px">{ic('panel-left-close')}</span></div></nav>
 <div class="main"><div class="crumbs">{cr}<span class="sp"></span>{crumb_actions}</div>
  <div class="page">{content}</div></div>
</div></div>{overlay}'''

def header_mobile():
    return f'''<header class="hdr" style="gap:2px;padding:0 4px">
 <span class="ibtn">{ic('menu')}</span>
 <div class="brand" style="gap:8px">{mark(24)}<b>Devyard</b></div>
 <div class="sp"></div>
 <span class="ibtn">{ic('search')}</span>
 <span class="ibtn">{ic('bell')}<span class="badge-count">3</span></span>
 <span class="avatar" style="margin:0 6px">IT</span>
</header>'''

def shell_mobile(content, crumbs=('Devyard','Dashboard'), crumb_actions='', overlay=''):
    return f'''<div class="app">{header_mobile()}
<div class="main"><div class="crumbs" style="padding:0 16px">{ic('chevron-left',15)}<span>{crumbs[0]}</span><span class="sepr">/</span><span class="cur">{crumbs[1]}</span><span class="sp"></span>{crumb_actions}</div>
<div class="page" style="padding:16px">{content}</div></div></div>{overlay}'''
