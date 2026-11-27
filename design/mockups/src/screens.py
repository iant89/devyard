from lib import *
D = (1440, 900); M = (390, 844)
S = {}  # name -> (html, w, h)

# ---------- Screen 1: Login ----------
def login(state):
    err = state=='error'; load = state=='loading'
    dis = ' style="opacity:var(--eui-disabled-opacity)"' if load else ''
    user_val = '<span>ian</span>' if err else ('<span>ian@devyard.local</span>' if load else '<span class="phd">ian@devyard.local</span>')
    pw_val = '<span style="letter-spacing:3px">••••••••••</span>' if load else '<span class="phd">Enter your password</span>'
    strip = f'''<div class="strip error" role="alert">{ic('circle-x',18)}<div><b>Sign-in failed</b>The username or password is incorrect. Check your details and try again.</div></div>''' if err else ''
    pw_err = f'<div class="ferr">{ic("circle-alert")}Incorrect username or password.</div>' if err else ''
    btn = f'<span class="btn primary lg full" style="opacity:.85">{ic("loader-circle",18)}Signing in…</span>' if load else '<span class="btn primary lg full">Sign in</span>'
    body = f'''<div style="position:absolute;inset:0;background-image:linear-gradient(var(--eui-color-border-subtle) 1px,transparent 1px),linear-gradient(90deg,var(--eui-color-border-subtle) 1px,transparent 1px);background-size:48px 48px;opacity:.25"></div>
<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
<div style="width:400px;display:flex;flex-direction:column;gap:24px">
 <div style="display:flex;flex-direction:column;align-items:center;gap:8px">{mark(40)}
  <div style="font-size:24px;font-weight:700;line-height:30px;margin-top:4px">Devyard</div><div class="sec sm">Build. Test. Deploy.</div></div>
 <div class="card" style="border-color:var(--eui-color-border);padding:32px;display:flex;flex-direction:column;gap:20px;box-shadow:0 8px 24px rgba(0,0,0,.35)">
  <div style="font-size:20px;font-weight:700;line-height:26px">Sign in</div>
  {strip}
  <div class="field"{dis}><label class="label">Username or email<span class="req">*</span></label>
   <div class="input lg">{ic('user')}{user_val}</div></div>
  <div class="field"{dis}><label class="label">Password<span class="req">*</span></label>
   <div class="input lg{" err" if err else ""}"><span style="flex:1;display:flex">{pw_val}</span>{ic('eye',18)}</div>{pw_err}</div>
  <div class="row sm"><label class="row gap2"{dis}><span class="check"></span>Keep me signed in</label><span class="sp"></span><span class="link"{dis}>Forgot password?</span></div>
  {btn}
 </div>
 <div class="row xs sec" style="justify-content:space-between;padding:0 2px"><span>Self-hosted instance · devyard.local</span><span>v0.1.0</span></div>
</div></div>'''
    return doc(body, *D)
S['01-login'] = (login('normal'), *D)
S['01-login-error'] = (login('error'), *D)
S['01-login-loading'] = (login('loading'), *D)

# ---------- Screen 2: Shell ----------
def skel_page():
    blk = lambda h: f'<div class="card" style="height:{h}px;padding:16px"><div class="skel" style="width:40%;height:12px"></div><div class="skel" style="width:60%;height:22px;margin-top:12px"></div></div>'
    rows = ''.join(f'<div class="skel" style="height:14px;width:{w}%;margin:14px 0"></div>' for w in (92,80,86,70,88,76,84))
    return f'''<div class="ph"><div><h1>Dashboard</h1><div class="subt">Welcome back, Ian</div></div></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">{blk(112)*4}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
<div class="card" style="height:300px;padding:16px">{rows}</div><div class="card" style="height:300px;padding:16px">{rows}</div></div>'''
REFRESH = f'<span class="btn secondary sm">{ic("refresh-cw",14)}Refresh</span>'
S['02-shell-desktop'] = (doc(shell_desktop(skel_page(), ['Devyard','Dashboard'], crumb_actions=REFRESH), *D), *D)

NOTIFS = [('error','Build #142 failed','homelab-dash','3 min ago',True),
          ('success','Deployment succeeded','portfolio-site v1.8.0','18 min ago',True),
          ('warning','Health check failing','status-api','1 h ago',True),
          ('neutral','Git sync conflict','docs-hub/main','Yesterday',False)]
def notif_pop():
    items=''
    for tone,t,obj,when,unread in NOTIFS:
        items += f'''<div style="display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--eui-color-border-subtle);{"background:#212830" if unread else ""}">
<span class="dot {tone}" style="margin-top:6px"></span>
<div style="flex:1;min-width:0"><div class="row"><b style="font-size:13.5px;font-weight:{600 if unread else 500}">{t}</b><span class="sp"></span><span class="xs sec">{when}</span></div>
<div class="sm sec mono" style="margin-top:2px">{obj}</div>
<div class="row gap4 xs" style="margin-top:8px">{'<span class="link">Mark as read</span>' if unread else ''}<span class="sec" style="font-weight:500">Dismiss</span></div></div></div>'''
    return f'''<div class="pop" style="top:46px;right:42px;width:380px;max-height:480px">
<div class="row" style="height:48px;padding:0 16px;border-bottom:1px solid var(--eui-color-border-subtle)"><b>Notifications</b><span class="sec sm" style="margin-left:6px">· 3 unread</span><span class="sp"></span><span class="link sm">Mark all as read</span></div>
{items}<div class="row" style="height:44px;justify-content:center"><span class="link sm">View all notifications</span></div></div>
<div style="position:absolute;top:40px;right:{42+380-332}px;width:12px;height:12px;background:var(--eui-color-surface);border-left:1px solid var(--eui-color-border);border-top:1px solid var(--eui-color-border);transform:rotate(45deg);z-index:11"></div>'''
S['02-shell-desktop-notifications'] = (doc(shell_desktop(skel_page(), ['Devyard','Dashboard'], crumb_actions=REFRESH, overlay=notif_pop()), *D), *D)

def acct_menu():
    mi = lambda icn,l,extra='': f'<div class="menu-i">{ic(icn)}<span>{l}</span>{extra}</div>'
    return f'''<div class="pop" style="top:46px;right:8px;width:280px;padding-bottom:6px">
<div class="row gap3" style="padding:16px;border-bottom:1px solid var(--eui-color-border-subtle)"><span class="avatar" style="width:40px;height:40px;line-height:38px;font-size:14px">IT</span>
<div><b style="font-size:14px">Ian Thomas</b><div class="sm sec">ian@devyard.local</div><div style="margin-top:4px"><span class="tag amber">Administrator</span></div></div></div>
<div style="padding:6px 0">{mi('user','Profile')}{mi('sliders-horizontal','Preferences')}{mi('monitor','Active sessions','<span class="sp"></span><span class="xs sec">2</span>')}
<div class="menu-sep"></div>{mi('user-cog','Manage account')}{mi('log-out','Sign out')}</div></div>'''
S['02-shell-desktop-account-menu'] = (doc(shell_desktop(skel_page(), ['Devyard','Dashboard'], crumb_actions=REFRESH, overlay=acct_menu()), *D), *D)

def skel_mobile():
    blk = '<div class="card" style="height:84px;padding:14px"><div class="skel" style="width:50%;height:12px"></div><div class="skel" style="width:35%;height:22px;margin-top:12px"></div></div>'
    rows = ''.join(f'<div class="skel" style="height:14px;width:{w}%;margin:14px 0"></div>' for w in (90,72,84,66,80))
    return f'''<div class="phd" style="margin-bottom:16px"><div><h1>Dashboard</h1><div class="subt">Welcome back, Ian</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">{blk*4}</div>
<div class="card" style="margin-top:12px;padding:16px">{rows}</div><div class="card" style="margin-top:12px;padding:16px">{rows}</div>'''
MREF = f'<span class="ibtn" style="width:32px;height:32px">{ic("refresh-cw",15)}</span>'
S['02-shell-mobile'] = (doc(shell_mobile(skel_mobile(), crumb_actions=MREF), *M), *M)
drawer = f'''<div class="scrim"></div><div style="position:absolute;top:0;left:0;bottom:0;width:300px;background:var(--eui-color-shell);border-right:1px solid var(--eui-color-border);z-index:6;display:flex;flex-direction:column;box-shadow:8px 0 24px rgba(0,0,0,.4)">
<div class="row" style="height:48px;padding:0 8px 0 16px;border-bottom:1px solid var(--eui-color-border-subtle)"><b>Navigation</b><span class="sp"></span><span class="ibtn" style="width:44px;height:44px">{ic('x',18)}</span></div>
<div style="padding:12px 16px 4px"><div class="input select" style="height:44px">{ic('folder-git-2',15)}<span style="flex:1">All projects</span>{ic('chevron-down',14)}</div></div>
<div style="flex:1;overflow:hidden;padding-bottom:8px">{nav_items('Dashboard', expanded=(), tall=True)}</div>
<div class="nav-foot"><span>Phase 1 · v0.1.0</span></div></div>'''
S['02-shell-mobile-nav-open'] = (doc(shell_mobile(skel_mobile(), crumb_actions=MREF, overlay=drawer), *M), *M)

# ---------- Screen 3: Dashboard ----------
def spark(pts, color, w=96, h=28):
    mx, mn = max(pts), min(pts); n=len(pts)
    xy = ' '.join(f'{i*(w-2)/(n-1)+1:.1f},{h-2-(p-mn)/(mx-mn or 1)*(h-4):.1f}' for i,p in enumerate(pts))
    return f'<svg width="{w}" height="{h}" style="flex:none"><polyline points="{xy}" fill="none" stroke="{color}" stroke-width="1.75" stroke-linejoin="round"/></svg>'
def metric(title, value, unit='', trend='', footer='', sp='', h=104):
    return f'''<div class="card" style="padding:14px 16px;height:{h}px;display:flex;flex-direction:column">
<div class="sm sec" style="font-weight:500">{title}</div>
<div class="row" style="margin-top:8px;align-items:flex-end"><span style="font-size:32px;line-height:36px;font-weight:700">{value}</span><span style="font-size:16px;color:var(--eui-color-text-secondary);margin:0 0 4px 2px">{unit}</span>
{f'<span style="margin:0 0 6px 10px">{trend}</span>' if trend else ''}<span class="sp"></span>{sp}</div>
<div class="xs sec" style="margin-top:auto">{footer}</div></div>'''
def trend(dir, txt, good):
    c = 'var(--eui-color-success)' if good else 'var(--eui-color-warning)'
    return f'<span class="row gap1 xs" style="color:{c};font-weight:600">{ic("trending-up" if dir=="up" else "trending-down",14)}{txt}</span>'
def page_head(title, sub, actions):
    return f'<div class="ph"><div><h1>{title}</h1><div class="subt" style="margin-top:4px">{sub}</div></div><span class="sp"></span><div class="row gap2">{actions}</div></div>'

builds = [('error','Failed','homelab-dash','#142','main','2m 08s','3 min ago'),
          ('success','Passed','portfolio-site','#87','main','1m 42s','18 min ago'),
          ('info','Running','docs-hub','#31','main','0m 54s','Just now'),
          ('success','Passed','status-api','#64','main','2m 31s','1 h ago'),
          ('success','Passed','portfolio-site','#86','feature/blog','1m 39s','3 h ago')]
def builds_table():
    r=''.join(f'<tr><td>{st(t,l)}</td><td><b style="font-weight:600">{p}</b></td><td>{b}</td><td class="mono">{br}</td><td>{d}</td><td class="sec">{w}</td></tr>' for t,l,p,b,br,d,w in builds)
    return f'<table><tr><th>Status</th><th>Project</th><th>Build</th><th>Branch</th><th>Duration</th><th>Started</th></tr>{r}</table>'
deps = [('portfolio-site','v1.8.0','Static','success','Healthy','portfolio.devyard.local'),
        ('status-api','v2.3.1','Node','error','Unhealthy','status-api.devyard.local:3000'),
        ('homelab-dash','v0.9.4','Docker','success','Healthy','dash.devyard.local'),
        ('docs-hub','v0.4.0','Static','info','Building','docs.devyard.local')]
def deps_list():
    return ''.join(f'''<div class="row gap3" style="height:58px;padding:0 16px;border-bottom:1px solid var(--eui-color-border-subtle)">
<div style="flex:1;min-width:0"><div class="row gap2"><b style="font-size:13.5px">{p}</b><span class="mono sec">{v}</span></div><div class="mono sec" style="font-size:12px;margin-top:2px">{u}</div></div>
<span class="tag" style="width:58px;justify-content:center">{t}</span><span style="width:96px">{st(s,l)}</span></div>''' for p,v,t,s,l,u in deps)
acts = [('git-commit-horizontal','<b>Ian Thomas</b> pushed 2 commits to <span class="mono">portfolio-site/main</span>','2 min ago'),
        ('circle-x','Build <b>#142</b> failed on <b>homelab-dash</b> — 3 tests failing','3 min ago'),
        ('rocket','<b>portfolio-site v1.8.0</b> deployed to Static hosting','18 min ago'),
        ('triangle-alert','Health check failing on <b>status-api</b> (HTTP 503)','1 h ago'),
        ('key-round','<b>Alex Rivera</b> was granted access to <b>docs-hub</b>','2 h ago'),
        ('git-commit-horizontal','<b>Ian Thomas</b> pushed 1 commit to <span class="mono">docs-hub/main</span>','3 h ago')]
def feed(items, more=True):
    r=''.join(f'''<div class="row gap3" style="padding:9px 16px;align-items:flex-start"><span style="width:26px;height:26px;border-radius:4px;background:var(--eui-color-surface-alt);display:flex;align-items:center;justify-content:center;flex:none;color:var(--eui-color-icon)">{ic(i,14)}</span>
<div style="flex:1;font-size:13px;line-height:18px;padding-top:4px">{t}</div><span class="xs sec" style="padding-top:5px;white-space:nowrap">{w}</span></div>''' for i,t,w in items)
    return r + (f'<div class="card-f" style="justify-content:center"><span class="link">Load more</span></div>' if more else '')
def attention():
    rows=[('homelab-dash','error','Build #142 failed','3 min ago · main','View logs'),('status-api','warning','Health check failing','1 h ago · HTTP 503 on /health','Open')]
    return ''.join(f'''<div class="row gap3" style="height:64px;padding:0 16px;border-bottom:1px solid var(--eui-color-border-subtle)">
<div style="flex:1"><b style="font-size:13.5px">{p}</b><div class="row gap2" style="margin-top:3px">{st(t,l,14)}<span class="xs sec">{d}</span></div></div><span class="btn tertiary sm">{a}</span></div>''' for p,t,l,d,a in rows)
def dashboard():
    return page_head('Dashboard','Welcome back, Ian', f'<span class="btn secondary">{ic("square-code")}New playground</span><span class="btn primary">{ic("plus")}New project</span>') + f'''
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
{metric('Projects','6',footer='2 shared with you')}
{metric('Builds (7 days)','38',trend=trend('up','+12%',True),sp=spark([4,6,5,7,5,6,5],'#5dc122'),footer='Last 7 days, all projects')}
{metric('Build success rate','89','%',trend=trend('down','−3 pts',False),footer='Target ≥ 90%')}
{metric('Active deployments','3',footer=st('error','1 unhealthy',14))}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
<div class="card"><div class="card-h">Recent builds</div>{builds_table()}<div class="card-f"><span class="link">View build history</span></div></div>
<div class="card"><div class="card-h">Deployments<span class="sp"></span><span class="link sm" style="font-weight:500">View all</span></div>{deps_list()}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
<div class="card"><div class="card-h">Recent activity<span class="sp"></span><span class="xs sec" style="font-weight:400">4 of 6 shown</span></div>{feed(acts[:4])}</div>
<div class="card" style="align-self:start"><div class="card-h">Projects needing attention<span class="tag" style="margin-left:8px">2</span></div>{attention()}</div>
</div>'''
S['03-dashboard'] = (doc(shell_desktop(dashboard(), ['Devyard','Dashboard'], crumb_actions=REFRESH), *D, '.page{padding-top:16px}.ph{margin-bottom:16px}td{height:38px}'), *D)

# ---------- Screen 4: Projects ----------
PROJ = [('portfolio-site','Personal portfolio','React + TypeScript','Static',('success','Passed · #87'),'Ian Thomas',False,'3 min ago'),
        ('status-api','Uptime & status endpoint','Node.js','Node',('success','Passed · #64'),'Ian Thomas',False,'1 h ago'),
        ('homelab-dash','Home lab dashboard','React','Docker',('error','Failed · #142'),'Ian Thomas',False,'3 min ago'),
        ('docs-hub','Team documentation site','HTML/CSS/JS','Static',('info','Running · #31'),'Alex Rivera',True,'Just now'),
        ('playground-sketches','Quick experiments','Quick Playground','—',('neutral','No builds'),'Ian Thomas',False,'2 days ago'),
        ('ledger-cli','Command-line ledger','Vanilla JS','—',('neutral','No builds'),'Alex Rivera',True,'5 days ago')]
NEWP = f'<span class="btn primary">{ic("plus")}New project</span>'
def sel(label, w):
    return f'<div class="input select" style="width:{w}px;height:32px;font-size:13px;background:var(--eui-color-surface)"><span>{label}</span>{ic("chevron-down",14)}</div>'
def projects_desktop():
    rows=''
    for n,d,tpl,dep,(t,l),own,sh,up in PROJ:
        ini = ''.join(x[0] for x in own.split())
        rows += f'''<tr><td class="oid"><b>{n}</b><span>{d}</span></td><td>{tpl}</td><td>{'<span class="tag">'+dep+'</span>' if dep!='—' else '<span class="sec">—</span>'}</td>
<td>{st(t,l)}</td><td class="mono">main</td><td><span class="row gap2"><span class="avatar xs">{ini}</span>{own}{'<span class="tag amber">Shared</span>' if sh else ''}</span></td><td class="sec">{up}</td><td style="text-align:center;color:var(--eui-color-icon)">{ic('ellipsis')}</td></tr>'''
    sorth = lambda t,w: f'<th style="width:{w}px"><span class="row gap1">{t}{ic("arrow-up-down",12,style="opacity:.6")}</span></th>'
    return page_head('Projects','6 projects',NEWP) + f'''
<div class="row gap2" style="margin-bottom:12px">
<div class="search" style="width:280px;height:32px;background:var(--eui-color-surface)">{ic('search',15)}<span>Filter by name or description</span></div>
<div class="seg"><span class="on">All</span><span>Mine</span><span>Shared</span></div>
{sel('Type: All',130)}{sel('Status: All',140)}<span class="sp"></span>
<div class="seg"><span class="on">{ic('list',14)}Table</span><span>{ic('layout-grid',14)}Cards</span></div>
{sel('Last activity',150)}</div>
<div class="card" style="overflow:hidden"><table style="table-layout:fixed">
<tr>{sorth('Name',240)}{sorth('Template / Framework',172)}<th style="width:110px">Deployment</th>{sorth('Last build',150)}<th style="width:90px">Branch</th>{sorth('Owner',208)}{sorth('Updated',110)}<th style="width:48px"></th></tr>{rows}</table>
<div class="card-f" style="height:44px"><span class="sec">1–6 of 6</span><span class="sp"></span><span class="row gap2 sec sm">Rows per page {sel('25',64)}<span class="ibtn" style="opacity:.4">{ic('chevron-left')}</span><span class="btn secondary sm" style="border-color:var(--eui-color-primary);color:var(--eui-color-primary)">1</span><span class="ibtn" style="opacity:.4">{ic('chevron-right')}</span></span></div></div>'''
def empty(size='md', stacked=False):
    btns = (f'<div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:20px"><span class="btn primary lg full">{ic("plus")}New project</span><span class="btn secondary lg full">{ic("git-branch")}Import repository</span></div>' if stacked
            else f'<div class="row gap2" style="margin-top:20px"><span class="btn primary">{ic("plus")}New project</span><span class="btn secondary">{ic("git-branch")}Import repository</span></div>')
    w = 440 if size=='md' else 320
    return f'''<div style="display:flex;flex-direction:column;align-items:center;text-align:center;width:{w}px;margin:0 auto">
<span style="color:var(--eui-color-icon)">{ic('folder-plus',48,style="stroke-width:1.5")}</span>
<div style="font-size:{18 if size=='md' else 16}px;font-weight:700;margin-top:16px">No projects yet</div>
<div class="sec" style="margin-top:8px;font-size:13.5px;line-height:20px">Create a project from a template, start from a Quick Playground, or import an existing Git or GitHub repository.</div>{btns}</div>'''
def projects_desktop_empty():
    return page_head('Projects','0 projects',NEWP) + f'<div class="card" style="height:640px;display:flex;align-items:center;justify-content:center;border-style:dashed;border-color:var(--eui-color-border)">{empty()}</div>'
PCRUMB = ['Devyard','Projects','All Projects']
S['04-projects-desktop'] = (doc(shell_desktop(projects_desktop(), PCRUMB, 'Projects', 'All Projects', crumb_actions=REFRESH), *D), *D)
S['04-projects-desktop-empty'] = (doc(shell_desktop(projects_desktop_empty(), PCRUMB, 'Projects', 'All Projects', crumb_actions=REFRESH), *D), *D)
def m_head(sub):
    return f'<div class="row" style="margin-bottom:14px"><div><h1 style="font-size:22px;line-height:28px;font-weight:700">Projects</h1><div class="subt sec sm">{sub}</div></div><span class="sp"></span><span class="ibtn" style="background:var(--eui-color-primary);color:var(--eui-color-on-primary);width:44px;height:44px">{ic("plus",20)}</span></div>'
def projects_mobile():
    rows=''.join(f'''<div style="height:72px;padding:14px 4px;border-bottom:1px solid var(--eui-color-border-subtle)">
<div class="row"><b style="font-size:14.5px">{n}</b>{'<span class="tag amber" style="margin-left:8px">Shared</span>' if sh else ''}<span class="sp"></span><span class="dot {t}" style="width:10px;height:10px"></span></div>
<div class="xs sec" style="margin-top:6px">{tpl} · {dep if dep!='—' else 'Not deployed'} · {up}</div></div>''' for n,d,tpl,dep,(t,l),own,sh,up in PROJ)
    return m_head('6 projects') + f'''<div class="search" style="height:44px;font-size:14px;background:var(--eui-color-surface)">{ic('search',16)}<span>Filter by name or description</span></div>
<div class="seg" style="width:100%;height:40px;margin-top:10px;display:flex"><span class="on" style="flex:1;justify-content:center">All</span><span style="flex:1;justify-content:center">Mine</span><span style="flex:1;justify-content:center">Shared</span></div>
<div class="row" style="margin:6px 0 2px"><span class="btn tertiary" style="height:44px;padding:0 4px">{ic('sliders-horizontal')}Filters (0)</span><span class="sp"></span><span class="xs sec">Last activity ▾</span></div>
<div style="border-top:1px solid var(--eui-color-border-subtle)">{rows}</div>'''
MP = ('Projects','All Projects')
S['04-projects-mobile'] = (doc(shell_mobile(projects_mobile(), MP), *M), *M)
S['04-projects-mobile-empty'] = (doc(shell_mobile(m_head('0 projects')+f'<div style="padding-top:110px">{empty("sm",True)}</div>', MP), *M), *M)

# ---------- Screen 5: Create project ----------
TPL = [('file','Empty project','Blank repository with no files'),('square-code','Quick Playground','HTML/CSS/JS sandbox you can promote later'),
       ('code-xml','HTML/CSS/JavaScript','Static site starter'),('braces','React','React app with Vite'),('file-code','React + TypeScript','Typed React starter'),
       ('braces','Vanilla JavaScript','Plain JS module starter'),('server','Node.js application','Fastify/Node service starter'),
       ('folder','Existing local Git repository','Point at a repository on this server'),('git-merge','GitHub repository import','Clone from GitHub')]
def create(errors=False):
    selected = 'GitHub repository import' if errors else 'React + TypeScript'
    cards=''
    for i,t,d in TPL:
        s = t==selected
        cards += f'''<div style="height:72px;border:1px solid {'var(--eui-color-primary)' if s else 'var(--eui-color-border-subtle)'};{'box-shadow:inset 0 0 0 1px var(--eui-color-primary);' if s else ''}background:{'var(--eui-color-surface-selected)' if s else 'var(--eui-color-surface-alt)'};border-radius:6px;padding:12px;display:flex;gap:10px;align-items:flex-start">
<span style="color:{'var(--eui-color-primary)' if s else 'var(--eui-color-icon)'};margin-top:1px">{ic(i,18)}</span><div style="min-width:0;flex:1"><div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{t}</div><div class="xs sec" style="margin-top:3px">{d}</div></div>
{('<span style="color:var(--eui-color-primary)">'+ic("circle-check",16)+'</span>') if s else ''}</div>'''
    hint = ('Clones the repository, then detects build, test and deployment settings from its files. <span class="annot">[sample copy]</span>' if errors else
            'Builds with <span class="mono">npm run build</span> · tests <span class="mono">npm test</span> · output <span class="mono">dist/</span> · deploys as Static site. <span class="annot">[sample copy]</span>')
    name_val = 'Portfolio Site!' if errors else 'portfolio-site'
    name_field = f'''<div class="field"><label class="label">Project name<span class="req">*</span></label><div class="input{' err focus' if errors else ''}" {'style="border-color:var(--eui-color-error);box-shadow:0 0 0 2px rgba(255,107,125,.35)"' if errors else ''}><span>{name_val}</span></div>
{f'<div class="ferr">{ic("circle-alert")}Use lowercase letters, numbers and hyphens only (e.g. portfolio-site).</div>' if errors else '<div class="fdesc">Lowercase letters, numbers and hyphens.</div>'}</div>'''
    vis = f'<div class="field"><label class="label">Visibility / access</label><div class="input select"><span class="row gap2">{ic("lock",15)}Private (only me)</span>{ic("chevron-down",14)}</div><div class="fdesc">Share with specific users after creation.</div></div>'
    desc = '<div class="field" style="grid-column:1/-1"><label class="label">Description</label><div class="input" style="height:72px;align-items:flex-start;padding-top:8px">Personal portfolio built with React.</div></div>'
    br = '<div class="field"><label class="label">Default branch</label><div class="input mono" style="font-size:13px">main</div></div>'
    gh = (f'<div class="field"><label class="label">GitHub repository URL<span class="req">*</span></label><div class="input err"><span class="phd mono" style="font-size:13px">https://github.com/owner/repo</span></div><div class="ferr">{ic("circle-alert")}Enter a GitHub repository URL.</div></div>' if errors else '')
    strip = f'<div class="strip error">{ic("circle-x",18)}<div><b>Fix 2 errors before creating the project.</b></div></div>' if errors else ''
    dlg = f'''<div class="scrim"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6">
<div style="width:800px;background:var(--eui-color-surface);border:1px solid var(--eui-color-border);border-radius:6px;box-shadow:0 24px 64px rgba(0,0,0,.6);overflow:hidden">
<div class="row" style="height:56px;padding:0 12px 0 24px;border-bottom:1px solid var(--eui-color-border-subtle)"><b style="font-size:18px">Create project</b><span class="sp"></span><span class="ibtn">{ic('x',18)}</span></div>
<div style="padding:20px 24px;display:flex;flex-direction:column;gap:{16 if errors else 20}px">{strip}
<div><div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--eui-color-text-secondary);margin-bottom:10px">Start from</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">{cards}</div><div class="xs sec" style="margin-top:10px">{hint}</div></div>
<div><div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--eui-color-text-secondary);margin-bottom:10px">Details</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:{12 if errors else 16}px 16px">{name_field}{vis}{(desc.replace('height:72px','height:52px')+gh+br) if errors else (desc+br)}</div></div></div>
<div class="row" style="height:60px;padding:0 24px;background:var(--eui-color-surface-alt);border-top:1px solid var(--eui-color-border-subtle)"><span class="xs sec">You can change build and deployment settings later.</span><span class="sp"></span><span class="btn tertiary" style="color:var(--eui-color-text)">Cancel</span><span class="btn primary" style="margin-left:8px">Create project</span></div>
</div></div>'''
    return doc(shell_desktop(projects_desktop(), PCRUMB, 'Projects', 'All Projects', crumb_actions=REFRESH, overlay=dlg), *D)
S['05-create-project'] = (create(False), *D)
S['05-create-project-errors'] = (create(True), *D)

# ---------- Screen 6: Project dashboard ----------
def proj_dash():
    attrs = [('Owner','Ian Thomas'),('Template','React + TypeScript'),('Language','TypeScript'),('Deployment','Static'),('Branch','<span class="mono">main</span>'),('Repository','local + <span class="mono">github.com/iant89/portfolio-site</span>'),('Updated','3 min ago')]
    at = ''.join(f'<div><div class="xs sec">{k}</div><div class="sm" style="margin-top:2px;font-weight:500;white-space:nowrap">{v}</div></div>' for k,v in attrs)
    b = [('success','Passed','#87','a3f9c21','Add project gallery filters','1m 42s','3 min ago'),('success','Passed','#86','9be04d7','Update hero copy','1m 39s','3 h ago'),
         ('error','Failed — tests','#85','51c7a0e','Refactor contact form','1m 12s','5 h ago'),('success','Passed','#84','e2d8b13','Bump Vite to 5.4','1m 47s','Yesterday'),('success','Passed','#83','7f10c9a','Fix dark mode contrast','1m 40s','2 days ago')]
    bt = ''.join(f'<tr><td>{st(t,l)}</td><td>{n}</td><td class="mono">{c}</td><td style="overflow:hidden;text-overflow:ellipsis;max-width:200px">{m}</td><td>{d}</td><td class="sec">{w}</td></tr>' for t,l,n,c,m,d,w in b)
    cm = ''.join(f'<div class="row gap3" style="height:44px;padding:0 16px;border-bottom:1px solid var(--eui-color-border-subtle)"><span class="mono" style="color:var(--eui-color-primary)">{c}</span><span class="sm" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{m}</span><span class="xs sec">Ian Thomas · {w}</span></div>' for t,l,n,c,m,d,w in b)
    cm = cm.replace('Fix dark mode contrast','Fix dark mode contrast').replace('· 3 min ago','· 4 min ago')
    tl = [('success','v1.8.0','Deployed 18 min ago · build #87 · Ian Thomas'),('neutral','v1.7.2','Rolled back · yesterday · Ian Thomas'),('error','v1.7.1','Health check failed · 2 days ago · auto-rollback')]
    tli = ''.join(f'''<div class="row gap3" style="align-items:flex-start;position:relative;padding-bottom:{8 if i<2 else 0}px">
<div style="display:flex;flex-direction:column;align-items:center;align-self:stretch"><span class="dot {t}" style="width:10px;height:10px;margin-top:5px;box-shadow:0 0 0 3px var(--eui-color-surface)"></span>{'<span style="flex:1;width:1px;background:var(--eui-color-border);margin-top:4px"></span>' if i<2 else ''}</div>
<div><b class="mono" style="font-size:13px">{v}</b><div class="xs sec" style="margin-top:2px">{d}</div></div></div>''' for i,(t,v,d) in enumerate(tl))
    pacts = [('git-commit-horizontal','<b>Ian Thomas</b> pushed <span class="mono">a3f9c21</span> to <span class="mono">main</span>','4 min ago'),('circle-check','Build <b>#87</b> passed (42 tests)','3 min ago'),('rocket','<b>v1.8.0</b> deployed','18 min ago')]
    head = f'''<div style="margin:-20px -24px 0;padding:16px 24px 0;background:var(--eui-color-surface);border-bottom:1px solid var(--eui-color-border-subtle)">
<div class="row gap3" style="align-items:flex-start"><span style="width:44px;height:44px;border-radius:6px;background:#3d4955;border:1px solid var(--eui-color-border-strong);display:flex;align-items:center;justify-content:center;font-weight:700">PS</span>
<div><div class="row gap3"><h1 style="font-size:22px;line-height:28px;font-weight:700">portfolio-site</h1>{st('success','Deployed · Healthy')}</div><div class="sec sm" style="margin-top:2px">Personal portfolio built with React.</div></div>
<span class="sp"></span><div class="row gap2"><span class="btn primary">{ic('code-xml')}Open in IDE</span>
<span class="row" style="border:1px solid var(--eui-color-border);border-radius:4px;height:36px"><span class="row gap2" style="padding:0 12px;font-weight:600">{ic('play',15)}Run build</span><span style="border-left:1px solid var(--eui-color-border);height:100%;display:flex;align-items:center;padding:0 8px">{ic('chevron-down',14)}</span></span>
<span class="btn secondary">{ic('rocket',15)}Deploy</span><span class="ibtn" style="border:1px solid var(--eui-color-border)">{ic('ellipsis')}</span></div></div>
<div class="row" style="gap:32px;margin:14px 0 0 56px">{at}</div>
<div class="row" style="gap:24px;margin-top:12px;font-size:13.5px">{''.join(f'<span style="padding:10px 2px;{"border-bottom:2px solid var(--eui-color-primary);color:var(--eui-color-text);font-weight:600" if i==0 else "color:var(--eui-color-text-secondary)"}">{t}</span>' for i,t in enumerate(['Overview','Builds','Deployments','Repository','Settings']))}</div></div>'''
    body = f'''<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px;margin-top:16px">
<div style="grid-column:span 4">{metric('Build success (30 days)','92','%',h=96,sp=spark([88,90,86,93,91,95,92,94],'#5dc122'),footer='26 of 28 builds passed')}</div>
<div style="grid-column:span 4">{metric('Last build','#87 · 1m 42s',h=96,footer=st('success','Passed 3 min ago',14)).replace('font-size:32px','font-size:26px')}</div>
<div style="grid-column:span 4">{metric('Current deployment · Application health','v1.8.0',h=96,footer=st('success','Healthy · 99.9% uptime',14))}</div>
<div class="card" style="grid-column:span 7"><div class="card-h">Recent builds<span class="sp"></span><span class="link sm" style="font-weight:500">View all</span></div><table style="table-layout:auto"><tr><th>Status</th><th>Build</th><th>Commit</th><th>Message</th><th>Duration</th><th>Started</th></tr>{bt}</table></div>
<div class="card" style="grid-column:span 5"><div class="card-h">Recent commits<span class="sp"></span><span class="mono sec">main</span></div>{cm.replace("<div class=\"row gap3\" style=\"height:44px","<div class=\"row gap3\" style=\"height:35.2px")}</div>
</div>'''
    # Row 3 below fold-limited; keep compact
    row3 = f'''<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px;margin-top:16px">
<div class="card" style="grid-column:span 7"><div class="card-h">Deployment history</div><div style="padding:10px 16px">{tli}</div></div>
<div class="card" style="grid-column:span 5"><div class="card-h">Recent activity</div>{feed(pacts, False)}</div></div>'''
    return head + body + row3
S['06-project-dashboard'] = (doc(shell_desktop(proj_dash(), ['Devyard','Projects','portfolio-site'], 'Projects', expanded=('Projects',), crumb_actions=REFRESH, project='portfolio-site'), *D, 'td{height:35px}.card-h{height:40px}'), *D)
