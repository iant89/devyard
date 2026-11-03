# Devyard Roadmap: Checkpoint Save

> **Save point: Nov 2, 2026.** Any agent can resume from this file. Read it top to bottom, then go to **Resume here**.

## 1. Status snapshot

| Item          | State                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Current phase | **Phase 1, Foundation.** Backend done, frontend foundation done, frontend features (B6) not started |
| `main` head   | `0e863e0` (PR #7, B4 projects)                                                                      |
| Open PRs      | #6 `test/dy-b5-e2e-smoke` @ `42fee20` (e2e smoke: bootstrap/login/logout), not merged               |
| Work mode     | **Paused and usage-aware.** Each step is gated on Ian's go-ahead                                    |

## 2. Done (merged to `main`, squash)

| Batch                  | PR                                             | Merge SHA | Summary                                                                                                   |
| ---------------------- | ---------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| B1 Scaffold (DY-T1)    | [#1](https://github.com/iant89/devyard/pull/1) | `c09c9c8` | Workspaces, contracts, backend skeleton, Drizzle schema + migration 0000, CI, plan doc                    |
| DY-R1 Contributing     | [#2](https://github.com/iant89/devyard/pull/2) | `b471954` | Branching and PR conventions (`docs/CONTRIBUTING.md`)                                                     |
| B2 Auth                | [#3](https://github.com/iant89/devyard/pull/3) | `b4cbfa8` | Bootstrap, login/logout, sessions, CSRF, lockout, rate limit, password change/reset, audit                |
| B5 Frontend foundation | [#5](https://github.com/iant89/devyard/pull/5) | `13b6b41` | Vite + React, ENTERPRISE-UI, Devyard theme, AppShell, auth flows                                          |
| B3 Users & permissions | [#4](https://github.com/iant89/devyard/pull/4) | `36f208c` | Users module, `can()`/`requirePermission`/`requireProjectRole`, email re-auth with lockout and rate limit |
| B4 Projects            | [#7](https://github.com/iant89/devyard/pull/7) | `0e863e0` | Project CRUD, scope filters, members, transfer, archive, platform-viewer cap (121 backend tests)          |

## 3. Next steps, in order (resume here)

1. **Get Ian's go-ahead.** Don't start anything until Ian says to resume. Work one step at a time and check in after each one.
2. **PR #6 (e2e smoke):** rebase or merge `main` into `test/dy-b5-e2e-smoke` (no force-push without Ian's OK), get CI green, then Tech Lead review, then Maintainer merge.
3. **B6 Frontend features** (Front-End Dev, branch `feature/dy-b6-...`): projects list (All/Mine/Shared), create project, project settings and members, admin Users screens, account and sessions page. Build them from the approved mockups in `design/mockups/` (`03`–`06`). Any UI that has no mockup needs Ian's mockup approval first. Acceptance: the Phase 1 deliverable ("users can authenticate and manage projects") works end to end.
4. **Backlog fixes** (Back-End Dev, small PR, can run alongside B6): see §7.
5. **QA:** once B6 works end to end, add a QA Engineer bot. They test Phase 1 against the mockups and the plan's acceptance criteria (security and permission matrix, responsive, axe), and report to the PM.
6. **B7 Packaging** (DevOps, from `docs/phase1-plan.md` §7): production build, static serving, systemd unit, Caddy over HTTPS on a fresh host.
7. **Close Phase 1**, then plan Phase 2 (Tech Lead writes `docs/phase2-plan.md`).

## 4. Phases (docs/SPEC.md §24)

| #   | Phase                       | Deliverable                                 | Status                                       |
| --- | --------------------------- | ------------------------------------------- | -------------------------------------------- |
| 1   | Foundation                  | Users can authenticate and manage projects  | 🟡 In progress (B1–B5 done; B6, QA, B7 left) |
| 2   | Playground                  | Browser HTML/CSS/JS playground              | ⬜ Not started                               |
| 3   | Full IDE                    | Monaco, file explorer, xterm, isolated envs | ⬜ Not started                               |
| 4   | Git Integration             | Full repository management                  | ⬜ Not started                               |
| 5   | Build Engine                | Automated CI/build platform                 | ⬜ Not started                               |
| 6   | Deployment Engine           | Static/Node/Docker deploy, rollback         | ⬜ Not started                               |
| 7   | Monitoring & Administration | Logs, notifications, backup/restore         | ⬜ Not started                               |
| 8   | Hardening & Optimization    | Production-ready homelab platform           | ⬜ Not started                               |

## 5. Decisions log

- **Brand:** logo option E3, accent `#d9a441` (amber on graphite).
- **D1 ENTERPRISE-UI:** vendored pinned tarball `vendor/enterprise-ui-react-0.1.0-64fcbd0.tgz` (1.2 MB). Only upgrade it on purpose, so the repo doesn't keep growing.
- **D2 Theming:** Devyard override layer that only uses `--eui-*` tokens. No second component system.
- **D3 Password reset:** admin-issued one-time reset tokens. Email comes later.
- **D4 Registration:** no open signup. Admins create users, plus a first-run admin bootstrap.
- **D5 Sessions:** 7-day absolute and 24-hour idle timeout (configurable).
- **D6 Project roles:** `owner/maintainer/developer/viewer`. Platform Viewers are capped at project `viewer`.
- **D7 Deletion:** soft delete for users and projects. Hard purge comes later as an admin action.
- **Deploy notes:** set `DEVYARD_TRUST_PROXY` when running behind Caddy or another proxy. Set `DEVYARD_PUBLIC_ORIGINS` to the public origin(s), which the CSRF Origin check uses.

## 6. Team and process

**Roster:** Ian (owner, approves all gates) · Project Manager (orchestrates, talks to Ian) · Tech Lead (plans, code review) · Repository Maintainer (integration, merges) · Back-End Developer · Front-End Developer · UX/UI Designer and Graphics Designer (mockups, brand) · QA Engineer (to be added for Phase 1 QA) · DevOps (B7). Roles are defined in `docs/PM-CHARTER.md`.

**Rules:**

- `main` is protected. The CI `check` must pass. No approvals are required by GitHub, but agent approvals are still mandatory (next rule).
- The Tech Lead posts approval as a PR comment, then the Maintainer posts an integration approval comment and **squash-merges**. The approval must match the PR's head SHA.
- Each agent works in its own git worktree, on its own branch (`feature/dy-bN-*`, `test/*`, `docs/*`).
- **No force-push without Ian's explicit OK.** To update a branch, merge `main` into it.
- UI changes need Ian's mockup approval before anyone builds them.
- Usage-aware mode: one step at a time, gated on Ian. Push everything before stopping.

## 7. Backlog (non-blocking, from the PR #7 review)

- [ ] Move audit writes inside the mutation transactions (projects/members).
- [ ] Return 409 instead of 500 when two member adds race (unique constraint).
- [ ] Reject adding disabled users as project members.

## 8. Key paths

| Path                          | What                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `docs/phase1-plan.md`         | Phase 1 technical plan: schema, API contracts, batches B1–B7, risks                                 |
| `docs/CONTRIBUTING.md`        | Branching and PR conventions                                                                        |
| `apps/backend/`               | Fastify + Drizzle + SQLite API (`/api/v1`), with `modules/auth`, `users`, `permissions`, `projects` |
| `apps/frontend/`              | Vite + React + ENTERPRISE-UI app                                                                    |
| `packages/contracts/`         | Shared zod API contracts                                                                            |
| `vendor/`                     | Pinned ENTERPRISE-UI tarball                                                                        |
| `docs/SPEC.md`                | Product spec (phases in §24)                                                                        |
| `docs/PM-CHARTER.md`          | Team roles, process, merge policy                                                                   |
| `design/brand/`               | Final logo E3 assets (`options/` holds the alternatives)                                            |
| `design/mockups/`             | Approved Phase 1 mockups, README, `src/`                                                            |
| `design/DY-D1-layout-spec.md` | Layout spec                                                                                         |
