# DY-D1 — Phase 1 UI Layout Spec (Devyard)

Owner: UX/UI Designer · Renderer: Graphics Designer · Status: **Draft for user approval (PM-CHARTER §5). No implementation.**
Sources: SPEC §2 (visual identity), §5.1 (auth), §6.1–6.4 (projects), §21.1 (notifications), §23 (navigation), §24 Phase 1.
Framework: ENTERPRISE-UI (`/workspace/ENTERPRISE-UI`, commit 64fcbd0, 2026-10-30). Only components that exist in `src/` are named below.

---

## 0. Global conventions

### 0.1 Canvases
- Desktop: **1440 × 900** px. Mobile: **390 × 844** px (desktop+mobile required for screens 2 and 4; other screens desktop only).
- Render with ENTERPRISE-UI `dark` theme tokens (`src/themes/dark.css`) **plus the Devyard accent override in §0.3** (SPEC §2.2 "dark graphite foundation", "muted amber" accents).

### 0.2 Tokens (real, from `src/tokens/tokens.css` and `themes/dark.css`)
| Use | Token | Value |
|---|---|---|
| App background | `--eui-color-background` | #12171c |
| Panels / cards / shell | `--eui-color-surface` / `--eui-color-shell` | #1d232a |
| Alt surface (table header, dialog footer) | `--eui-color-surface-alt` | #222930 |
| Sunken (inputs area, code/log) | `--eui-color-surface-sunken` | #171c22 |
| Hover / active | `--eui-color-surface-hover` / `-active` | #283039 / #313b46 |
| Borders | `--eui-color-border` / `-subtle` / `-strong` | #3a444f / #2c343d / #7d8a97 |
| Text / secondary | `--eui-color-text` / `-text-secondary` | #eaecee / #a9b4be |
| Success / Warning / Error / Info | `--eui-color-success` / `-warning` / `-error` / `-info` | #5dc122 / #ff9a3d / #ff6b7d / #4db1ff |
| Overlay (dialog scrim) | `--eui-color-overlay` | rgba(0,0,0,.6) |
| Spacing | `--eui-space-1..16` | 4,8,12,16,20,24,32,40,48,64 px (space-2=8 … space-6=24) |
| Radius | `--eui-radius-sm` (controls) / `-md` (cards, dialogs) | 4 / 6 px — avoid `-lg`/`-full` on containers (SPEC §2.3 "avoid excessive rounded cards") |
| Type | `--eui-font-family` ('72', Segoe UI…) ; mono `--eui-font-family-mono` for SHAs, branches, URLs | sizes xs 12, sm 13, **md 14 (base)**, lg 16, xl 20, 2xl 24, 3xl 32 |
| Controls | `--eui-control-height` 36 px; `-lg` 44 px; `--eui-row-height` 44 px | |
| Shell | `--eui-header-height` 48 px; `--eui-sidenav-width` 256 px; collapsed 56 px | |
| Breakpoints | sm 600, md 1024, lg 1440 | mobile render = below sm |

### 0.3 Devyard accent override (proposal — see Gap G1)
ENTERPRISE-UI `dark` primary is blue (#4db1ff). SPEC §2.2 calls for "restrained metallic, steel, muted amber". Mockups render primary actions with a **Devyard theme layer** overriding only:
`--eui-color-primary: #d9a441` (muted amber), `--eui-color-primary-hover: #e6b75c`, `--eui-color-primary-active: #c18e2f`, `--eui-color-on-primary: #1a1408`, `--eui-color-primary-subtle: #3a2f18`, `--eui-color-surface-selected: #2e2a20` (selected nav row, amber 2px left rule). Info stays blue (#4db1ff) so info ≠ action. Status colors unchanged. No gradients, no illustrations (SPEC §2.3).

### 0.4 Icons
ENTERPRISE-UI `Icon` (lucide set, as used by StatusIndicator: CheckCircle2, AlertTriangle, XCircle, Info). 16 px (`--eui-icon-size`) in nav/toolbar, single weight, `--eui-color-icon`.

### 0.5 Brand
Wordmark "Devyard" + tagline "Build. Test. Deploy." (SPEC §2.5). Logo mark is a Graphics Designer asset (Gap G2); placeholder: 24 px steel square with amber notch.

### 0.6 Sample data (use consistently)
User: **Ian Thomas**, ian@devyard.local, role **Administrator**. Projects: `portfolio-site` (React + TypeScript, Static, Deployed ✓), `status-api` (Node.js, Native Node, Deployed ✓), `homelab-dash` (React, Docker, Build failed ✗), `docs-hub` (HTML/CSS/JS, Static, Building…), `playground-sketches` (Quick Playground, not deployed), `ledger-cli` (Vanilla JS, none). Notifications (SPEC §21.1 types): "Build #142 failed — homelab-dash" (3 min ago, unread), "Deployment succeeded — portfolio-site v1.8.0" (18 min, unread), "Health check failing — status-api" (1 h, unread), "Git sync conflict — docs-hub/main" (yesterday, read).

---

## Screen 1 — Login (desktop 1440×900)
Files: `01-login.png`, `01-login-error.png`, `01-login-loading.png`

**Regions/grid:** full-bleed `--eui-color-background`; no shell. Centered column 400 px wide (`Stack` gap space-6), vertically centered. Faint 1 px `--eui-color-border-subtle` 48 px grid pattern at 4% opacity on background (industrial "workshop" texture; optional, no gradient).
1. Brand block (Stack, center): logo mark 40 px; `Title` level 1 size 2xl "Devyard"; `Text` secondary "Build. Test. Deploy."
2. `Card` (radius-md, padding space-8, border `--eui-color-border`), `title` "Sign in" (`Title` xl).
3. Inside a `Form` (`FormField` + controls, vertical labels, gap space-5):
   - `FormField` label "Username or email" (required) → `Input` placeholder "ian@devyard.local", startAdornment `Icon` user. (SPEC §5.1 username/email)
   - `FormField` label "Password" (required) → `Input` type password, endAdornment `IconButton` eye "Show password" (Gap G3 if a dedicated password input is wanted).
   - Row (`Flex` justify between): `Checkbox` "Keep me signed in" · `Link` "Forgot password?" (SPEC §5.1 reset workflow).
   - `Button` variant primary size lg, full width: "Sign in".
4. Footer `Text` xs secondary: "Self-hosted instance · devyard.local" and "v0.1.0".

**States**
- Normal (`01-login.png`): empty fields, button enabled.
- Error (`01-login-error.png`): `MessageStrip` tone error, announce assertive, above the form inside the card: title "Sign-in failed", body "The username or password is incorrect. Check your details and try again." Field level: username filled "ian", password field status error with message "Incorrect username or password." Password value cleared. (Generic message — don't reveal which field is wrong.)
- Loading (`01-login-loading.png`): fields filled & disabled (`--eui-disabled-opacity`), `Button` `loading` true, label "Signing in…"; "Forgot password?" link disabled.
- (Not rendered, note only) Session expired: `MessageStrip` tone warning "Your session expired. Sign in again to continue." (SPEC §5.1 session expiration).

---

## Screen 2 — App shell (desktop 1440×900 and mobile 390×844)
Files: `02-shell-desktop.png`, `02-shell-desktop-notifications.png`, `02-shell-desktop-account-menu.png`, `02-shell-mobile.png`, `02-shell-mobile-nav-open.png`

**Composition:** `AppShell` (`header`, `navigation`, children = main). SPEC §2.4 elements mapped:
| §2.4 element | Component |
|---|---|
| Top application toolbar | `ApplicationHeader` (48 px, `--eui-color-shell`, bottom border `--eui-color-shell-border`) |
| Primary nav sidebar | `SideNavigation` + `NavigationGroup` + `NavigationItem` (256 px; collapsed 56 px) |
| Breadcrumbs + context actions | `AppBreadcrumbBar` (`actions` slot) |
| Notifications | `ApplicationHeader` `notificationCount`/`notifications` → `NotificationCenter` in `Popover` |
| Account menu | `ApplicationHeader` `user` + `userMenuItems` (renders `UserMenu`) |
| Workspace/project context | `Select`-style project switcher in header `actions` (see below) |
| Main region | `Page` |

**Header (left→right):** nav toggle (`showNavToggle`), logo + `productName` "Devyard", `secondaryTitle` "Build. Test. Deploy." (desktop only); center `search` = `SearchField` width 420 placeholder "Search projects, pipelines, deployments…  ⌘K" (opens `CommandPalette`, not rendered); right `actions`: project context `Select` "All projects ▾" (180 px); `IconButton` help (`helpItems`: "Documentation", "Keyboard shortcuts", "About Devyard"); notifications bell with badge **3**; avatar "IT".

**Sidebar (SPEC §23, exact order & labels; icons lucide):**
Dashboard (layout-dashboard) — **active** on this frame
Projects (folder-git-2) ▸ All Projects · My Projects · Shared Projects
Playground (square-code) ▸ New Playground · Saved Playgrounds
Development (monitor-cog) ▸ Workspaces · Environments
Git (git-branch) ▸ Repositories · Branches · Remotes
Pipelines (workflow) ▸ All Pipelines · Build History · Runners
Deployments (rocket) ▸ Applications · Deployment History · Domains
Monitoring (activity) ▸ System · Applications · Logs
Notifications (bell) — `badge` 3
Administration (shield) ▸ Users · Permissions · Storage · Infrastructure · Security · Settings
Use `NavigationGroup` dividers: group "Build" (Dashboard→Monitoring), group "System" (Notifications, Administration). Projects expanded (`defaultExpanded`) in desktop frame. `footer`: `Text` xs "Phase 1 · v0.1.0" + collapse chevron.
Permission adaptation (SPEC §23 "adapt to the user's permissions"): wrap Administration in `PermissionGate` — hidden for Developer/Viewer. Annotate in the mockup margin: "Admin only".
Rows: 36 px, label sm 13/14 px, selected row `--eui-color-surface-selected` + 2 px amber left rule, hover `--eui-color-surface-hover`.

**Breadcrumb bar:** `AppBreadcrumbBar` items "Devyard / Dashboard"; actions: `Button` secondary sm "Refresh" (icon only on mobile).
**Main:** `Page` title "Dashboard" (content = Screen 3 placeholder in shell frames; grey `Skeleton` blocks acceptable for shell frames).

**Overlay frames**
- `02-shell-desktop-notifications.png`: `NotificationCenter` in `Popover` anchored under bell, 380 px wide, max 480 px tall; header "Notifications · 3 unread"; items from §0.6 with `StatusIndicator` dot tone (error/success/warning/neutral), timestamps right, "Mark as read" / "Dismiss" per item; footer `Link` "View all notifications" → Notifications page. Empty copy (note only): "No notifications."
- `02-shell-desktop-account-menu.png`: `UserMenu` with account {Ian Thomas, ian@devyard.local, description "Administrator"}; items: "Profile", "Preferences" (opens `UserSettingsDialog`), "Active sessions" (SPEC §5.1 revocation), separator; "Manage account"; "Sign out".

**Mobile (390×844)**
- `02-shell-mobile.png`: `AppShell` below md collapses nav to drawer. Header 48 px: hamburger, logo mark + "Devyard", right: search `IconButton`, bell with badge 3, avatar. No secondaryTitle, no project Select (moves into drawer top). `AppBreadcrumbBar` shows last two crumbs only ("‹ Devyard / Dashboard"). Content single column, page padding space-4.
- `02-shell-mobile-nav-open.png`: drawer (`drawerTitle` "Navigation") 300 px from left over `--eui-color-overlay`; top: project context `Select` full width; then same §23 tree; touch rows ≥ `--eui-touch-target-min`; Administration collapsed.

---

## Screen 3 — Dashboard (desktop) · `03-dashboard.png`
Shell as Screen 2 (Dashboard active). `Page` title "Dashboard", subtitle "Welcome back, Ian", actions: `Button` primary "New project" (opens Screen 5), `Button` secondary "New playground".
Body: `Dashboard` pattern `columns` 4, `gap` space-4 (Phase-1 scope: project-centric; data from §6.3/§21.1 aggregated).
Row 1 — four `MetricCard`s (`DashboardWidget` span 1):
- "Projects" value **6**, footer "2 shared with you".
- "Builds (7 days)" value **38**, `trend` {up, "+12%"}, `sparkline` 7 points, tone success.
- "Build success rate" value **89**, unit "%", trend {down, "−3 pts", upIsGood true}, tone warning.
- "Active deployments" value **3**, footer `StatusIndicator` error "1 unhealthy".
Row 2 — `DashboardWidget` span 2: `Card` "Recent builds" (noPadding) → `Table` columns: Status (`StatusIndicator`), Project (`ObjectIdentifier`), Build ("#142"), Branch (mono "main"), Duration ("1m 42s"), Started ("3 min ago"); 5 rows; footer `Link` "View build history".
   `DashboardWidget` span 2: `Card` "Deployments" → `List` rows: project, version, target type `Badge` (Static / Node / Docker — SPEC §12), `StatusIndicator` (Healthy/Unhealthy/Building), URL mono.
Row 3 — span 2: `Card` "Recent activity" → `ActivityFeed` (types: commit, build, deploy, access), 6 events, `hasMore`.
   span 2: `Card` "Projects needing attention" → `List`: homelab-dash "Build #142 failed" `Button` tertiary "View logs"; status-api "Health check failing" `Button` tertiary "Open".
Loading (note only): `MetricCard` `loading`, `Skeleton` rows in tables.

---

## Screen 4 — Projects list (desktop + mobile, populated + empty)
Files: `04-projects-desktop.png`, `04-projects-desktop-empty.png`, `04-projects-mobile.png`, `04-projects-mobile-empty.png`

Shell; nav Projects ▸ **All Projects** active. Breadcrumb "Devyard / Projects / All Projects".
`Page` title "Projects", subtitle "6 projects", actions `Button` primary "New project" (icon plus).
**Toolbar** — `FilterBar` (liveMode) with `search` = `SearchField` "Filter by name or description"; filters: `SegmentedButton` single [All · Mine · Shared] (mirrors §23 sub-items), `Select` "Type" (All, Static, Node.js, Docker), `Select` "Status" (All, Deployed, Building, Failed, Not deployed); right: `SegmentedButton` view toggle [Table · Cards] (table selected), `Select` sort "Last activity ▾".
**Table** — `DataGrid` (row height 44 px, sortable headers on `--eui-color-surface-alt`), columns:
| Column | Width | Content |
|---|---|---|
| Name | 280 | `ObjectIdentifier` title "portfolio-site", text = description "Personal portfolio" |
| Template / Framework | 180 | "React + TypeScript" |
| Deployment | 120 | `Badge` Static / Node / Docker / — |
| Last build | 160 | `StatusIndicator` success "Passed · #87" / error "Failed · #142" / information "Running · #31" / neutral "No builds" |
| Branch | 120 | mono "main" |
| Owner | 140 | `Avatar` xs + "Ian Thomas" (shared rows show owner "Alex Rivera" + `Badge` "Shared") |
| Updated | 120 | "3 min ago" |
| ⋯ | 48 | `OverflowMenu`: Open, Open in IDE, Settings, Delete (destructive) |
Footer: `Pagination` "1–6 of 6". Use all six sample projects (§0.6).

**Empty (`04-projects-desktop-empty.png`)**: FilterBar hidden; main shows `EmptyState` size md, centered in content area: icon folder-plus (48 px, `--eui-color-icon`), title "No projects yet", description "Create a project from a template, start from a Quick Playground, or import an existing Git or GitHub repository." (SPEC §6.1) actions: `Button` primary "New project", `Button` secondary "Import repository". Subtitle "0 projects".
(Note only) Filtered-empty: `EmptyState` sm "No projects match these filters" + `Button` tertiary "Clear filters".

**Mobile (`04-projects-mobile.png`)**: Header per 2-mobile. `Page` title "Projects" with `IconButton` primary "+" in actions. `SearchField` full width, then `SegmentedButton` [All · Mine · Shared] full width, `Button` tertiary "Filters (0)" opening sheet (not rendered). DataGrid replaced by `List` of rows (72 px): line 1 `ObjectIdentifier` name + right `StatusIndicator` dot; line 2 `Text` xs secondary "React + TypeScript · Static · 3 min ago". Rows separated by `--eui-color-border-subtle`.
**Mobile empty (`04-projects-mobile-empty.png`)**: same `EmptyState` (size sm), buttons stacked full width.

---

## Screen 5 — Create Project dialog (desktop) · `05-create-project.png`, `05-create-project-errors.png`
Over dimmed Projects list (`--eui-color-overlay`). `Dialog` size **lg** (≈ 800 px), title "Create project", `showClose`.
Body two sections (`Stack` gap space-6):
**A. "Start from"** — `Title` level 3 sm. Grid (`Grid` 3 columns, gap space-3) of 9 selectable `Card`s (`selected`, `onClick`, `flat`, radius-md, 72 px tall; icon + title + one-line description), exactly SPEC §6.1 list:
1. Empty project — "Blank repository with no files" 2. Quick Playground — "HTML/CSS/JS sandbox you can promote later" 3. HTML/CSS/JavaScript — "Static site starter" 4. React — "React app with Vite" 5. React + TypeScript — "Typed React starter" (**selected** in normal frame: amber border, `--eui-color-surface-selected`) 6. Vanilla JavaScript — "Plain JS module starter" 7. Node.js application — "Fastify/Node service starter" 8. Existing local Git repository — "Point at a repository on this server" 9. GitHub repository import — "Clone from GitHub"
Under the grid, `Text` xs secondary for the selected template (SPEC §6.4): "Builds with `npm run build` · tests `npm test` · output `dist/` · deploys as Static site." (Do not invent exact commands beyond what the template defines — label as sample copy.)
**B. "Details"** — `Form`, 2-column `Grid` (gap space-4):
- `FormField` "Project name" required → `Input` "portfolio-site", description "Lowercase letters, numbers and hyphens."
- `FormField` "Visibility / access" → `Select` "Private (only me)" / "Shared with users…" (SPEC §5.3 resource-level).
- Full width `FormField` "Description" → `TextArea` 3 rows "Personal portfolio built with React."
- Full width `FormField` "Default branch" → `Input` mono "main".
- Conditional (shown only when template 8/9): "Repository path" / "GitHub repository URL" `Input`.
Footer (`--eui-color-surface-alt`): left `Text` xs "You can change build and deployment settings later."; right `Button` tertiary "Cancel", `Button` primary "Create project".

**Errors (`05-create-project-errors.png`)**: after clicking Create with template "GitHub repository import" selected, Project name "Portfolio Site!" ; URL empty.
- `MessageStrip` tone error at top of body: "Fix 2 errors before creating the project."
- Project name `FormField` error: "Use lowercase letters, numbers and hyphens only (e.g. portfolio-site)."
- GitHub repository URL `FormField` required error: "Enter a GitHub repository URL."
- (alt note) duplicate name: "A project named portfolio-site already exists."
- Primary button stays enabled; focus moves to first invalid field (focus ring `--eui-focus-*`).
(Note only) Submitting: `Button` loading "Creating…", dialog `BusyIndicator` not used (keeps form visible). Success: `useToast` "Project portfolio-site created" and navigate to Screen 6.

---

## Screen 6 — Project dashboard (desktop) · `06-project-dashboard.png`
Shell; nav Projects active; breadcrumb "Devyard / Projects / portfolio-site"; header project `Select` shows "portfolio-site".
`ObjectPage` (navigation `tabs`):
- title "portfolio-site"; subtitle "Personal portfolio built with React."; `avatar` = `Avatar` square initials "PS"; `status` = `StatusIndicator` success "Deployed · Healthy";
- `actions`: `Button` primary "Open in IDE" (SPEC §6.3 quick access to IDE), `SplitButton` secondary "Run build" (menu: Run build, Run tests), `Button` secondary "Deploy", `OverflowMenu` (Settings, Share, Delete).
- `attributes`: Owner "Ian Thomas" · Template "React + TypeScript" · Language "TypeScript" · Deployment "Static" · Branch `main` (mono) · Repository "local + github.com/iant89/portfolio-site" · Updated "3 min ago".
- Tabs (sections): **Overview** (rendered) · Builds · Deployments · Repository · Settings.
Overview content — `Grid` 12 columns, gap space-4:
- Row 1 (3 × span 4) `MetricCard`s: "Build success (30 days)" **92 %** sparkline, tone success; "Last build" "#87 · 1m 42s" footer "Passed 3 min ago"; "Current deployment" "v1.8.0" footer `StatusIndicator` success "Healthy · 99.9% uptime" — label "Application health" in subtitle (SPEC §6.3).
- Row 2: span 7 `Card` "Recent builds" → `Table` (Status, Build, Commit mono "a3f9c21", Message, Duration, Started), 5 rows incl. one failed (#85 "Failed — tests"). (No per-day pass/fail bar chart: Phase 1 uses the `MetricCard` sparkline only, see Gap G4.) span 5 `Card` "Recent commits" → `List`: mono SHA, message, author, time (5 rows).
- Row 3: span 7 `Card` "Deployment history" → `Timeline` items: v1.8.0 success "Deployed 18 min ago", v1.7.2 neutral "Rolled back", v1.7.1 error "Health check failed". span 5 `Card` "Recent activity" → `ActivityFeed` (5 events).
Viewer role note: actions Run build/Deploy hidden via `PermissionGate` (SPEC §5.3).

---

## 7. ENTERPRISE-UI components used (all exist in `src/`)
Layouts: `AppShell`, `Page`, `Grid`/`GridItem`, `Stack`, `Flex`.
Navigation/shell: `ApplicationHeader`, `SideNavigation`, `NavigationGroup`, `NavigationItem`, `AppBreadcrumbBar` (Breadcrumbs), `UserMenu`, `NotificationCenter`, `Popover`, `SearchField`, `PermissionGate`, `UserSettingsDialog` (referenced), `CommandPalette` (referenced).
Content: `Card`, `MetricCard`, `Dashboard`/`DashboardWidget`, `ObjectPage`, `ObjectIdentifier`, `DataGrid`, `Table`, `List`, `Timeline`, `ActivityFeed`, `EmptyState`, `FilterBar`, `Pagination`, `Badge`, `Avatar`, `StatusIndicator`, `Title`, `Text`, `Link`, `Icon`, `Skeleton`.
Forms/actions: `Form`, `FormField`, `Input`, `TextArea`, `Select`, `Checkbox`, `SegmentedButton`, `Button` (primary/secondary/tertiary/destructive, `loading`), `IconButton`, `SplitButton`, `OverflowMenu`, `Dialog`, `MessageStrip`, `useToast`/`ToastProvider`.

## 8. Gaps & proposals
| # | Gap | Proposal |
|---|---|---|
| G1 | No graphite/amber theme — shipped `dark` primary is blue (#4db1ff); SPEC §2.2 asks muted amber/steel accents | Add a Devyard theme layer (app-level CSS overriding only `--eui-color-primary*`, `-surface-selected*`, values in §0.3) — no ENTERPRISE-UI change needed; optionally upstream as `graphite` theme with PM approval (charter §2.3) |
| G2 | No brand/logo asset or auth page layout (no `AuthLayout`/login template) | Graphics Designer produces logo mark (SVG, 24/40 px). Login composed from `Stack`+`Card`+`Form`; propose an `AuthLayout` pattern only if more auth screens (reset password) need it |
| G3 | No dedicated password input with reveal toggle | Compose `Input type=password` + `endAdornment` `IconButton`; candidate `PasswordInput` component if reused (login, reset, user admin) |
| G4 | No chart component (bar/area) for build success/failure statistics (SPEC §6.3); only `MetricCard.sparkline` | Phase 1: sparkline + success-rate metric. Propose a minimal `BarChart`/`StackedBar` (pass/fail per day) to ENTERPRISE-UI |
| G5 | No selectable "tile/option card" primitive for template picker | Use `Card` `selected`+`onClick` in a `Grid` with radiogroup semantics; propose `SelectableCardGroup` (keyboard arrow nav, `role=radiogroup`) if accessibility review requires |
| G6 | No mobile bottom-sheet for filters | Phase 1: open filters in `Dialog` size `full` on mobile; propose `Sheet` later |

## 9. Rationale
The shell maps SPEC §2.4 one-to-one onto ENTERPRISE-UI's `AppShell`/`ApplicationHeader`/`SideNavigation`/`AppBreadcrumbBar`, and the sidebar reproduces §23 verbatim with permission gating, so navigation stays predictable and needs no new framework code. Graphite surfaces come straight from the `dark` theme tokens; the only visual change is a narrow amber accent override, which keeps the "workshop" identity (§2.1–2.2) without forking the theme. Density is high but calm: 44 px rows, 36 px controls, 6 px corner radius at most, status shown with `StatusIndicator` tone plus icon (never color alone), and no gradients or illustrations (§2.3). Dashboards use the existing `Dashboard`/`MetricCard`/`ObjectPage` patterns so global and per-project views read the same way and cover every §6.3 item. Each gap lists a composable Phase-1 fallback, so mockups and implementation aren't blocked on framework additions.

## 10. Expected mockup files (`/workspace/devyard/design/mockups/`)
01-login.png · 01-login-error.png · 01-login-loading.png · 02-shell-desktop.png · 02-shell-desktop-notifications.png · 02-shell-desktop-account-menu.png · 02-shell-mobile.png · 02-shell-mobile-nav-open.png · 03-dashboard.png · 04-projects-desktop.png · 04-projects-desktop-empty.png · 04-projects-mobile.png · 04-projects-mobile-empty.png · 05-create-project.png · 05-create-project-errors.png · 06-project-dashboard.png
