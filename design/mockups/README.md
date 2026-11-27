# DY-D1 mockups (Phase 1) — rendered by Graphics Designer

Source spec: `../DY-D1-layout-spec.md` (+ SPEC §2). Theme: ENTERPRISE-UI dark tokens (§0.2) + Devyard amber override (§0.3).
Sample data: §0.6. Logo: `../brand/devyard-mark-24.svg` (header) and `devyard-mark-40.svg` (login).

## Rebuild
```
cd src && node extract-icons.mjs   # only if icons change (reads lucide-react 1.63.0 from /workspace/eui-fe/node_modules)
python3 build.py [name ...]        # writes src/html/*.html and ../*.png via headless google-chrome
```
Sources: `src/styles.css` (tokens + component styles), `src/lib.py` (icons, shell, nav), `src/screens.py` (all 16 frames), `src/icons.json`.

## Files
| File | Size | Spec section |
|---|---|---|
| 01-login.png | 1440×900 | Screen 1 — normal |
| 01-login-error.png | 1440×900 | Screen 1 — error state |
| 01-login-loading.png | 1440×900 | Screen 1 — loading state |
| 02-shell-desktop.png | 1440×900 | Screen 2 — shell, Dashboard active, skeleton main |
| 02-shell-desktop-notifications.png | 1440×900 | Screen 2 — NotificationCenter popover |
| 02-shell-desktop-account-menu.png | 1440×900 | Screen 2 — UserMenu |
| 02-shell-mobile.png | 390×844 | Screen 2 — mobile shell |
| 02-shell-mobile-nav-open.png | 390×844 | Screen 2 — mobile nav drawer |
| 03-dashboard.png | 1440×900 | Screen 3 |
| 04-projects-desktop.png | 1440×900 | Screen 4 — table |
| 04-projects-desktop-empty.png | 1440×900 | Screen 4 — empty |
| 04-projects-mobile.png | 390×844 | Screen 4 — mobile list |
| 04-projects-mobile-empty.png | 390×844 | Screen 4 — mobile empty |
| 05-create-project.png | 1440×900 | Screen 5 — normal (React + TypeScript selected) |
| 05-create-project-errors.png | 1440×900 | Screen 5 — validation errors (GitHub import) |
| 06-project-dashboard.png | 1440×900 | Screen 6 — Overview tab |

## Deviations
1. **Font**: '72' (first in `--eui-font-family`) is not installed on the render box; Geist substitutes. Mono = Geist Mono.
2. **Fit to 900 px height** (single viewport, no scroll):
   - 03 Recent activity shows 4 of 6 events (labelled "4 of 6 shown" + "Load more"); MetricCards 104 px; table rows 38 px.
   - 06 Recent activity shows 3 events (spec 5); table/commit rows 35 px; MetricCards 96 px.
3. **04 table column widths**: spec widths total 1168 px but content width is 1136 px. Used Name 240 / Template 172 / Deployment 110 / Last build 150 / Branch 90 / Owner 208 / Updated 110 / ⋯ 48.
4. **05 errors**: Description textarea is shorter (52 px vs 72 px) so the dialog fits with the extra GitHub URL field. The selected-template hint for GitHub import is my own sample copy (marked [sample copy]).
5. **Sample data I added** beyond §0.6 (all illustrative): versions for status-api/homelab-dash/docs-hub, deployment URLs, commit SHAs/messages other than a3f9c21, project descriptions other than portfolio-site, owner "Alex Rivera" on docs-hub and ledger-cli as the shared rows, build numbers other than #142/#87/#31/#85, "2 active sessions", "Mark all as read" in the notification header, and pagination "Rows per page".
6. "Admin only" annotation is drawn as a dashed orange tag inline on the Administration nav row instead of in the margin.
7. Status-api shows "Passed · #64" for its last build (health check fails at runtime, not in the build); dashboard "Active deployments 3 / 1 unhealthy" vs four rows in Deployments list (docs-hub is Building, not active).
8. Login background grid at ~25% layer opacity of the subtle border colour (visually ≈ the spec's faint 4% texture).

## Open questions
- Q1: Should the 03/06 frames be rendered taller (e.g. 1440×1200 full-page) to show all 6/5 activity events, or is fold-cropping fine?
- Q2: Header avatar/notification badge use amber (primary). Should the badge use error red instead?
- Q3: Is the 24 px simplified mark (2 px strokes, smaller chamfer) approved for header and favicon use?

## Brand mark update (2026-11-02)
- Swapped the Option A mark for the new primary mark (E3, open container + amber chevron) by regenerating `brand/devyard-mark-24.svg` (header) and `brand/devyard-mark-40.svg` (login). `src/lib.py` already inlines those files; no source changes.
- Re-rendered all 16 mockups with `python3 src/build.py`. No other mockup changes. Pre-swap copies kept in `/tmp/mockups-backup-*` on the render box; Option A marks archived in `brand/options/A/`.

## B6b mockups (2026-11-27), awaiting Ian's approval
Source: `src/screens_b6b.py`, registered in `build.py`. Rebuild with `CHROME=<chromium> python3 build.py 07-project-settings …`. Icons added to `src/icons.json`: archive, copy, user-plus, mail, laptop, smartphone, arrow-right-left, user-x, key, pencil. Existing icons are unchanged.

Every control maps to an existing Phase 1 endpoint (plan §6.2–6.4). Nothing here needs new backend work, except where Q4 says otherwise.

| File | Size | Screen | API |
|---|---|---|---|
| 07-project-settings.png | 1440×900 | Project ▸ **Settings** tab: General form, Members table with inline role select, role legend, Danger zone (archive, transfer, delete) | `PATCH /projects/:id`, `GET/PATCH/DELETE /projects/:id/members`, `POST /projects/:id/transfer`, `DELETE /projects/:id` |
| 07-project-add-member.png | 1440×900 | **Add member** dialog: user search (active users, name and @username only, no emails for non-admins), role select, Viewer-cap note | `GET /users?q=` (public summary), `POST /projects/:id/members` |
| 07-project-transfer.png | 1440×900 | **Transfer ownership** confirm: new owner select, type-the-slug confirmation | `POST /projects/:id/transfer` |
| 08-admin-users.png | 1440×900 | Administration ▸ **Users**: search, status and role filters, sort, table, row menu (edit, issue reset, view activity, disable, delete) | `GET /users`, `PATCH /users/:id`, `DELETE /users/:id`, `GET /users/:id/activity` |
| 08-admin-user-create.png | 1440×900 | **New user** dialog: name, username, email, roles, initial password (show and generate) | `POST /users` |
| 08-admin-user-reset.png | 1440×900 | **Password reset issued**: one-time link with copy, expiry (1 h), shown once | `POST /users/:id/password-reset` |
| 09-account.png | 1440×900 | **Account**: profile (display name), email change (needs current password), password change, active sessions with revoke and "sign out other sessions" | `PATCH /users/:id` (self), `POST /auth/password`, `GET/DELETE /auth/sessions[/:id]` |
| 09-account-mobile.png | 390×844 | Account on mobile: Profile / Security / Sessions segments, Sessions shown | same |

### Design decisions
- Project **Settings** is a tab of the project page (ObjectPage), not a separate route, which matches Screen 6. Members live there too: one place to manage a project.
- The **slug is read-only** after creation (the API has no slug update). Name, description, language and framework can be edited.
- **Roles in the members table** use an inline select. The owner row shows a badge instead, because ownership only changes through Transfer. Maintainer options are only offered to the owner, which the API enforces.
- **Destructive actions** are grouped in a Danger zone. Transfer uses type-to-confirm. Delete reuses the B6a confirm dialog.
- **User search for sharing** shows only display name and @username, because the API hides emails, statuses and roles from callers without `users.manage` (PR #4 review).
- **Password reset** follows D3: there's no email. The admin copies a one-time link that's shown once.

### Open questions for Ian
- **Q4:** The reset link needs a small "Set a new password" page at `/password-reset?token=…`, using the login card layout. The confirm endpoint already exists. OK to build it without a separate mockup?
- **Q5:** Should "View activity" (admin) be a side panel on the Users page, or its own page under Administration ▸ Users ▸ *name*?
- **Q6:** On mobile, Admin Users would reuse the B6a mobile list pattern (name, @username · role · status). Is a separate mockup needed?
