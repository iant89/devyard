"""DY-D1 B6b mockups (Phase 1): project settings + members, admin Users, account & sessions.
Same helpers and styles as screens.py; only Phase 1 API capabilities are shown (plan §6.3–6.4)."""
from lib import ic, doc, st, shell_desktop, shell_mobile
from screens import S, D, M, REFRESH, MREF, page_head, sel

def card(title, body, actions='', pad=True, extra=''):
    return f'''<div class="card" style="{extra}"><div class="card-h">{title}<span class="sp"></span>{actions}</div>
<div style="{'padding:16px' if pad else ''}">{body}</div></div>'''

def field(label, value, desc='', req=False, mono=False, w=None, disabled=False, err=''):
    style = f'width:{w}px;' if w else ''
    style += 'opacity:.6;' if disabled else ''
    cls = 'input mono' if mono else 'input'
    if err: cls += ' err'
    return f'''<div class="field"><label class="label">{label}{'<span class="req">*</span>' if req else ''}</label>
<div class="{cls}" style="{style}{'font-size:13px;' if mono else ''}">{value}</div>
{f'<div class="ferr">{ic("circle-alert")}{err}</div>' if err else (f'<div class="fdesc">{desc}</div>' if desc else '')}</div>'''

def selfield(label, value, desc='', icon=''):
    return f'''<div class="field"><label class="label">{label}</label><div class="input select"><span class="row gap2">{icon}{value}</span>{ic("chevron-down",14)}</div>
{f'<div class="fdesc">{desc}</div>' if desc else ''}</div>'''

def role_tag(r):
    return f'<span class="tag{" amber" if r=="Owner" else ""}">{r}</span>'

def avatar(name, size='xs'):
    return f'<span class="avatar {size}">{"".join(x[0] for x in name.split())}</span>'

def dialog(title, body, footer, w=560, tone=''):
    return f'''<div class="scrim"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6">
<div style="width:{w}px;background:var(--eui-color-surface);border:1px solid var(--eui-color-border);border-radius:6px;box-shadow:0 24px 64px rgba(0,0,0,.6);overflow:hidden">
<div class="row gap2" style="height:56px;padding:0 12px 0 24px;border-bottom:1px solid var(--eui-color-border-subtle)">{tone}<b style="font-size:18px">{title}</b><span class="sp"></span><span class="ibtn">{ic('x',18)}</span></div>
<div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">{body}</div>
<div class="row gap2" style="height:60px;padding:0 24px;background:var(--eui-color-surface-alt);border-top:1px solid var(--eui-color-border-subtle)">{footer}</div>
</div></div>'''

BTN = lambda kind, label, icon='', extra='': f'<span class="btn {kind}" style="{extra}">{ic(icon,15) if icon else ""}{label}</span>'

# ---------- Screen 7: Project settings & members ----------
MEMBERS = [('Ian Thomas','ian','Owner','Nov 1, 2026',''),
           ('Alex Rivera','alex','Maintainer','Nov 3, 2026',''),
           ('Sam Patel','sam','Developer','Nov 12, 2026',''),
           ('Jordan Lee','jordan','Viewer','Nov 20, 2026','Platform Viewer (capped)')]

def proj_header(tab='Settings'):
    attrs = [('Owner','Ian Thomas'),('Template','Empty project'),('Language','TypeScript'),('Your role','Owner'),('Created','Nov 1, 2026'),('Updated','3 min ago')]
    at = ''.join(f'<div><div class="xs sec">{k}</div><div class="sm" style="margin-top:2px;font-weight:500;white-space:nowrap">{v}</div></div>' for k,v in attrs)
    tabs = ''.join(f'<span style="padding:10px 2px;{"border-bottom:2px solid var(--eui-color-primary);color:var(--eui-color-text);font-weight:600" if t==tab else "color:var(--eui-color-text-secondary)"}">{t}</span>' for t in ['Overview','Builds','Deployments','Repository','Settings'])
    return f'''<div style="margin:-20px -24px 0;padding:16px 24px 0;background:var(--eui-color-surface);border-bottom:1px solid var(--eui-color-border-subtle)">
<div class="row gap3" style="align-items:flex-start"><span style="width:44px;height:44px;border-radius:6px;background:#3d4955;border:1px solid var(--eui-color-border-strong);display:flex;align-items:center;justify-content:center;font-weight:700">PS</span>
<div><div class="row gap3"><h1 style="font-size:22px;line-height:28px;font-weight:700">portfolio-site</h1>{st('neutral','Not deployed')}</div><div class="sec sm" style="margin-top:2px">Personal portfolio built with React.</div></div>
<span class="sp"></span><div class="row gap2"><span class="btn primary" style="opacity:.5">{ic('code-xml')}Open in IDE</span><span class="ibtn" style="border:1px solid var(--eui-color-border)">{ic('ellipsis')}</span></div></div>
<div class="row" style="gap:32px;margin:14px 0 0 56px">{at}</div>
<div class="row" style="gap:24px;margin-top:12px;font-size:13.5px">{tabs}</div></div>'''

def members_table(menu_open=False):
    rows = ''
    for i,(n,u,r,added,note) in enumerate(MEMBERS):
        role = (role_tag(r) if r=='Owner'
                else f'<div class="input select" style="width:140px;height:30px;font-size:13px"><span>{r}</span>{ic("chevron-down",14)}</div>')
        act = '' if r=='Owner' else f'<span class="ibtn">{ic("ellipsis")}</span>'
        rows += f'''<tr><td><span class="row gap2">{avatar(n)}<span><b style="font-weight:600">{n}</b><span class="xs sec" style="display:block">@{u} · {note or 'added ' + added}</span></span></span></td>
<td>{role}</td><td style="text-align:right">{act}</td></tr>'''
    return f'<table style="table-layout:auto;width:100%"><tr><th>Member</th><th style="width:156px">Role</th><th style="width:44px"></th></tr>{rows}</table>'

def settings_body():
    general = card('General', f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
{field('Project name','portfolio-site',req=True,desc='Shown in lists and breadcrumbs.')}
{field('URL slug','<span class="mono" style="font-size:13px">portfolio-site</span>',disabled=True,desc='Set at creation; can’t be changed.')}
<div style="grid-column:1/-1">{field('Description','Personal portfolio built with React.')}</div>
{field('Primary language','TypeScript')}{field('Framework','React')}</div>''',
        actions=f'{BTN("tertiary","Reset")}{BTN("primary","Save changes",extra="margin-left:8px")}')
    members = card('Members <span class="xs sec" style="font-weight:400;margin-left:6px">4</span>', members_table(),
        actions=BTN('secondary','Add member','user-plus'), pad=False)
    roles = f'''<div class="xs sec" style="line-height:18px"><b style="color:var(--eui-color-text)">Owner</b> everything, incl. delete and transfer ·
<b style="color:var(--eui-color-text)">Maintainer</b> settings and non-owner members · <b style="color:var(--eui-color-text)">Developer</b> source and builds (later phases) ·
<b style="color:var(--eui-color-text)">Viewer</b> read-only. Platform Viewers are capped at Viewer.</div>'''
    danger_row = lambda t,d,b: f'<div class="row gap3" style="padding:12px 0;border-top:1px solid var(--eui-color-border-subtle)"><div style="flex:1"><b style="font-weight:600">{t}</b><div class="xs sec" style="margin-top:2px">{d}</div></div>{b}</div>'
    danger = f'''<div class="card" style="border-color:rgba(255,107,125,.45)"><div class="card-h" style="color:var(--eui-color-error)">Danger zone</div><div style="padding:0 16px 4px">
{danger_row('Archive project','Hides it from default lists and makes it read-only. You can unarchive any time.',BTN('secondary','Archive','archive'))}
{danger_row('Transfer ownership','Make another active member the owner. You become a Maintainer.',BTN('secondary','Transfer…','arrow-right-left'))}
{danger_row('Delete project','Removes the project for everyone. Only the owner can do this.',BTN('secondary','Delete project','trash','color:var(--eui-color-error);border-color:rgba(255,107,125,.6)'))}
</div></div>'''
    return f'''{proj_header()}<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px;margin-top:16px">
<div style="grid-column:span 7;display:flex;flex-direction:column;gap:16px">{general}{danger}</div>
<div style="grid-column:span 5;display:flex;flex-direction:column;gap:12px">{members}{roles}</div></div>'''

PS_CRUMBS = ['Devyard','Projects','portfolio-site','Settings']
def ps(overlay=''):
    return doc(shell_desktop(settings_body(), PS_CRUMBS, 'Projects', expanded=('Projects',), crumb_actions=REFRESH, project='portfolio-site', overlay=overlay), *D,
               'td{height:52px}.card-h{height:44px}')
S['07-project-settings'] = (ps(), *D)

def add_member():
    results = [('Riley Chen','riley','',False),('Morgan Diaz','morgan','',False),('Sam Patel','sam','Already a member',True)]
    res = ''.join(f'''<div class="row gap2" style="height:44px;padding:0 10px;{'background:var(--eui-color-surface-selected);' if i==0 else ''}{'opacity:.5;' if dis else ''}">{avatar(n)}<span style="flex:1"><b style="font-weight:600">{n}</b> <span class="xs sec">@{u}{' · ' + e if e else ''}</span></span>{ic('check',15) if i==0 else ''}</div>''' for i,(n,u,e,dis) in enumerate(results))
    body = f'''<div class="field"><label class="label">User<span class="req">*</span></label>
<div class="search" style="height:36px;background:var(--eui-color-surface);border-color:var(--eui-color-primary)">{ic('search',15)}<span style="color:var(--eui-color-text)">ri</span></div>
<div style="margin-top:4px;border:1px solid var(--eui-color-border);border-radius:6px;overflow:hidden;background:var(--eui-color-surface-alt)">{res}</div>
<div class="fdesc">Search active users by name or username.</div></div>
{selfield('Role','Developer','Maintainers can only be added by the owner.')}
<div class="strip" style="border:1px solid var(--eui-color-border);background:var(--eui-color-surface-alt);padding:10px 12px;border-radius:6px">{ic('info',16)}<span class="xs">Platform Viewers can only be added as <span style="font-weight:700">Viewer</span>; a higher role is lowered automatically.</span></div>'''
    foot = f'<span class="sp"></span>{BTN("tertiary","Cancel")}{BTN("primary","Add member","user-plus")}'
    return dialog('Add member to portfolio-site', body, foot, w=560)
S['07-project-add-member'] = (ps(add_member()), *D)

def transfer():
    body = f'''{selfield('New owner','Alex Rivera · @alex','Only active members who aren’t Platform Viewers can own a project.')}
<div class="field"><label class="label">Type <span class="mono">portfolio-site</span> to confirm<span class="req">*</span></label><div class="input mono" style="font-size:13px">portfolio-site</div></div>
<div class="xs sec">You’ll stay on the project as a <b style="color:var(--eui-color-text)">Maintainer</b>.</div>'''
    foot = f'<span class="sp"></span>{BTN("tertiary","Cancel")}{BTN("primary","Transfer ownership","arrow-right-left")}'
    return dialog('Transfer ownership', body, foot, w=520, tone=f'<span style="color:var(--eui-color-warning)">{ic("triangle-alert",18)}</span>')
S['07-project-transfer'] = (ps(transfer()), *D)

# ---------- Screen 8: Administration ▸ Users ----------
USERS = [('Ian Thomas','ian','ian@devyard.local',['Admin'],'active','Just now','Nov 1, 2026'),
         ('Alex Rivera','alex','alex@devyard.local',['Developer'],'active','2 h ago','Nov 2, 2026'),
         ('Sam Patel','sam','sam@devyard.local',['Developer'],'active','Yesterday','Nov 12, 2026'),
         ('Jordan Lee','jordan','jordan@devyard.local',['Viewer'],'active','3 days ago','Nov 20, 2026'),
         ('Riley Chen','riley','riley@devyard.local',['Developer'],'active','Never','Nov 25, 2026'),
         ('Casey Moore','casey','casey@devyard.local',['Developer'],'disabled','Oct 30, 2026','Oct 2, 2026')]

def users_table():
    rows = ''
    for n,u,e,roles,status,last,created in USERS:
        stt = st('success','Active') if status=='active' else st('neutral','Disabled')
        rows += f'''<tr style="{'opacity:.7' if status!='active' else ''}"><td><span class="row gap2">{avatar(n)}<span><b style="font-weight:600">{n}</b><span class="xs sec" style="display:block">@{u}</span></span></span></td>
<td>{e}</td><td>{''.join(f'<span class="tag{" amber" if r=="Admin" else ""}" style="margin-right:4px">{r}</span>' for r in roles)}</td><td>{stt}</td><td class="sec">{last}</td><td class="sec">{created}</td>
<td style="text-align:center;color:var(--eui-color-icon)">{ic('ellipsis')}</td></tr>'''
    sorth = lambda t,w: f'<th style="width:{w}px"><span class="row gap1">{t}{ic("arrow-up-down",12,style="opacity:.6")}</span></th>'
    return f'''<div class="card" style="overflow:hidden"><table style="table-layout:fixed">
<tr>{sorth('User',250)}{sorth('Email',240)}<th style="width:160px">Roles</th><th style="width:120px">Status</th>{sorth('Last sign-in',140)}{sorth('Created',130)}<th style="width:48px"></th></tr>{rows}</table>
<div class="card-f" style="height:44px"><span class="sec">1–6 of 6</span><span class="sp"></span><span class="row gap2 sec sm">Rows per page {sel('25',64)}<span class="ibtn" style="opacity:.4">{ic('chevron-left')}</span><span class="btn secondary sm" style="border-color:var(--eui-color-primary);color:var(--eui-color-primary)">1</span><span class="ibtn" style="opacity:.4">{ic('chevron-right')}</span></span></div></div>'''

def users_page(menu=False):
    toolbar = f'''<div class="row gap2" style="margin-bottom:12px">
<div class="search" style="width:280px;height:32px;background:var(--eui-color-surface)">{ic('search',15)}<span>Filter by name, username or email</span></div>
{sel('Status: All',140)}{sel('Role: All',130)}<span class="sp"></span>{sel('Name (A–Z)',150)}</div>'''
    m = ''
    if menu:
        items = [('pencil','Edit user',''),('key-round','Issue password reset',''),('activity','View activity',''),('','sep',''),('user-x','Disable user',''),('trash','Delete user','var(--eui-color-error)')]
        mi = ''.join('<div class="menu-sep"></div>' if l=='sep' else f'<div class="menu-i" style="{"color:"+c if c else ""}">{ic(i,15)}{l}</div>' for i,l,c in items)
        m = f'<div class="pop" style="position:absolute;right:56px;top:338px;width:220px;padding:4px 0;z-index:5">{mi}</div>'
    return page_head('Users','6 users · 1 disabled', BTN('primary','New user','user-plus')) + toolbar + users_table() + m

U_CRUMBS = ['Devyard','Administration','Users']
def up(overlay='', menu=False):
    return doc(shell_desktop(users_page(menu), U_CRUMBS, 'Administration', 'Users', expanded=('Administration',), crumb_actions=REFRESH, overlay=overlay), *D, 'td{height:52px}')
S['08-admin-users'] = (up(menu=True), *D)

def create_user():
    roles = ''.join(f'''<label class="row gap2" style="height:28px"><span class="check{' on' if r=='Developer' else ''}" style="width:16px;height:16px;border:1px solid var(--eui-color-border-strong);border-radius:3px;display:inline-flex;align-items:center;justify-content:center;{'background:var(--eui-color-primary);border-color:var(--eui-color-primary);color:#1b1d1f' if r=='Developer' else ''}">{ic('check',12) if r=='Developer' else ''}</span><b style="font-weight:600">{r}</b><span class="xs sec">{d}</span></label>'''
                    for r,d in [('Admin','Full platform administration'),('Developer','Create and work on projects'),('Viewer','Read-only; capped at project Viewer')])
    body = f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
{field('Full name','Riley Chen',req=True)}{field('Username','riley',req=True,desc='Lowercase letters, digits, dots, underscores and hyphens.')}
<div style="grid-column:1/-1">{field('Email','riley@devyard.local',req=True)}</div>
<div style="grid-column:1/-1" class="field"><label class="label">Roles<span class="req">*</span></label>{roles}</div>
<div style="grid-column:1/-1">{field('Initial password','<span style="letter-spacing:3px">••••••••••••••</span><span class="sp"></span><span class="row gap2 sec">'+ic('eye',15)+ic('refresh-cw',15)+'</span>',req=True,desc='At least 12 characters. Share it securely; they can change it from Account settings.')}</div></div>'''
    foot = f'<span class="xs sec">No email is sent in Phase 1.</span><span class="sp"></span>{BTN("tertiary","Cancel")}{BTN("primary","Create user","user-plus")}'
    return dialog('New user', body, foot, w=600)
S['08-admin-user-create'] = (up(create_user()), *D)

def reset_issued():
    body = f'''<div class="strip" style="border:1px solid rgba(93,193,34,.45);background:rgba(93,193,34,.08);padding:10px 12px;border-radius:6px">{ic('circle-check',16)}<span class="sm">One-time reset link created for <span style="font-weight:700">Sam Patel</span>.</span></div>
<div class="field"><label class="label">Reset link</label><div class="input mono" style="font-size:12.5px"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">https://devyard.home.lan/password-reset?token=dy_rst_7Qm2…kP9x</span><span class="row gap1 link sm" style="font-weight:600">{ic('copy',14)}Copy</span></div>
<div class="fdesc">Expires <b style="color:var(--eui-color-text)">Nov 27, 2026, 4:12 PM</b> (1 hour) and works once. Their current sessions stay signed in until they use it.</div></div>
<div class="strip" style="border:1px solid var(--eui-color-border);background:var(--eui-color-surface-alt);padding:10px 12px;border-radius:6px">{ic('triangle-alert',16)}<span class="xs">This link is shown only now. Send it to Sam over a channel you trust.</span></div>'''
    foot = f'<span class="sp"></span>{BTN("primary","Done")}'
    return dialog('Password reset issued', body, foot, w=600)
S['08-admin-user-reset'] = (up(reset_issued()), *D)

# ---------- Screen 9: Account & sessions ----------
SESSIONS = [('laptop','Firefox 132 on Linux','192.168.1.24','Nov 27, 2026, 9:02 AM','Active now',True),
            ('smartphone','Safari on iPhone','192.168.1.51','Nov 24, 2026, 7:45 PM','2 h ago',False),
            ('monitor','Chrome 131 on Windows','10.8.0.6','Nov 21, 2026, 1:10 PM','Yesterday',False)]

def account_body():
    profile = card('Profile', f'''<div class="row gap3" style="margin-bottom:16px">{avatar('Ian Thomas','')}<div><b>Ian Thomas</b><div class="xs sec">@ian · Admin · member since Nov 1, 2026</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">{field('Full name','Ian Thomas',req=True)}{field('Username','ian',disabled=True,desc='Ask an administrator to change it.')}</div>''',
        actions=BTN('primary','Save'))
    email = card('Email', f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">{field('Email','ian@devyard.local',req=True)}
{field('Current password','<span style="letter-spacing:3px">••••••••</span>',req=True,desc='Required to change your email.')}</div>''',
        actions=BTN('secondary','Update email','mail'))
    pw = card('Password', f'''<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">{field('Current password','',req=True)}{field('New password','',req=True,desc='At least 12 characters.')}{field('Confirm new password','',req=True)}</div>
<div class="xs sec" style="margin-top:10px">Changing your password signs out your other sessions.</div>''',
        actions=BTN('secondary','Change password','key-round'))
    rows = ''.join(f'''<tr><td><span class="row gap2"><span style="color:var(--eui-color-icon)">{ic(i,18)}</span><span><b style="font-weight:600">{ua}</b>{' <span class="tag amber" style="margin-left:6px">This device</span>' if cur else ''}<span class="xs sec" style="display:block">{ip} · signed in {created}</span></span></span></td>
<td class="sec">{seen}</td><td style="text-align:right">{'' if cur else BTN('tertiary','Revoke','log-out','color:var(--eui-color-error)')}</td></tr>''' for i,ua,ip,created,seen,cur in SESSIONS)
    sessions = card('Active sessions <span class="xs sec" style="font-weight:400;margin-left:6px">3</span>', f'''<table style="table-layout:auto;width:100%"><tr><th>Device</th><th style="width:110px">Last active</th><th style="width:104px"></th></tr>{rows}</table>
<div class="xs sec" style="padding:10px 16px">Sessions end after 7 days, or after 24 hours without activity.</div>''',
        actions=BTN('secondary','Sign out other sessions','log-out'), pad=False)
    return page_head('Account','Your profile, password and signed-in devices','') + f'''<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px">
<div style="grid-column:span 6;display:flex;flex-direction:column;gap:16px">{profile}{email}</div>
<div style="grid-column:span 6;display:flex;flex-direction:column;gap:16px">{pw}{sessions}</div></div>'''

S['09-account'] = (doc(shell_desktop(account_body(), ['Devyard','Account'], None, crumb_actions=REFRESH), *D, 'td{height:52px}.card-h{height:44px}'), *D)

def account_mobile():
    rows = ''.join(f'''<div style="padding:12px 0;border-bottom:1px solid var(--eui-color-border-subtle)"><div class="row gap2"><span style="color:var(--eui-color-icon)">{ic(i,18)}</span><b style="font-weight:600;font-size:14px">{ua}</b><span class="sp"></span>{'<span class="tag amber">This device</span>' if cur else f'<span class="btn tertiary" style="height:44px;color:var(--eui-color-error)">Revoke</span>'}</div>
<div class="xs sec" style="margin:4px 0 0 26px">{ip} · {seen}</div></div>''' for i,ua,ip,created,seen,cur in SESSIONS)
    seg = '<div class="seg" style="width:100%;height:40px;display:flex;margin-bottom:14px"><span style="flex:1;justify-content:center">Profile</span><span style="flex:1;justify-content:center">Security</span><span class="on" style="flex:1;justify-content:center">Sessions</span></div>'
    return f'''<h1 style="font-size:22px;line-height:28px;font-weight:700;margin-bottom:12px">Account</h1>{seg}
<div class="row" style="margin-bottom:4px"><b>Active sessions</b><span class="xs sec" style="margin-left:6px">3</span></div>{rows}
<span class="btn secondary lg full" style="margin-top:16px;height:44px">{ic('log-out',15)}Sign out other sessions</span>
<div class="xs sec" style="margin-top:10px">Sessions end after 7 days, or after 24 hours without activity.</div>'''
S['09-account-mobile'] = (doc(shell_mobile(account_mobile(), ('Devyard','Account'), crumb_actions=MREF), *M), *M)
