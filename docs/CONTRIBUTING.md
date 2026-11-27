# Contributing to Devyard

> Status: **proposal** (DY-R1). Branch protection on `main` is applied (see below).

## Branching strategy

- `main` is always releasable. Nobody commits to it directly. All changes land through a PR.
- Short-lived branches off `main`, named `<type>/<short-kebab-description>`, optionally with a task ID:
  - `feature/` for new functionality (`feature/dy-t2-auth-routes`)
  - `fix/` for non-urgent bug fixes (`fix/session-idle-timeout`)
  - `hotfix/` for urgent fixes to a released version (`hotfix/1.2.1-login-crash`)
  - `release/` for release preparation (`release/1.3.0`)
  - `docs/`, `chore/`, `ci/`, `refactor/` for non-functional work
- Keep branches small and rebase or merge `main` in locally as needed. **Never force-push to `main` or rewrite shared history.**
- Head branches may be deleted after merge (by their author, or automatically once that is configured).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, for example
`feat(backend): add session middleware` or `fix(contracts): correct project slug regex`.
Types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `test`, `perf`, `build`. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.

## Pull requests

- **Title:** Conventional Commit format, because it becomes the squash commit message. Example: `feat(backend): auth routes (DY-T2)`.
- **Description template:**
  ```
  ## Summary
  What and why.
  ## Task
  DY-xx
  ## Changes
  - ...
  ## Testing
  How it was verified (commands, screenshots).
  ## Risk / rollout
  Migrations, config changes, breaking changes.
  ```
- **Required before merge:**
  - CI (`check` workflow: typecheck, lint, format, tests, audit, plus `e2e` where present) is green.
  - Code review approved by the **Tech Lead** (PR comment). Docs-only PRs skip this step (see below).
  - Integration/repo-health approval by the **Repository Maintainer** (PR comment): no secrets, no generated or oversized files, sane lockfile, migrations included.
- **Merge method:** squash merge by default. Use a merge commit only for `release/` branches when individual commits must be kept.
- Never commit `.env` files, databases, `node_modules`, `dist`, or credentials. Use `.env.example` for configuration keys.

## Versioning and tags

- [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.
- Releases are tagged `vX.Y.Z` on `main` (annotated tags) after the release PR merges.
- Pre-releases use `vX.Y.Z-rc.N`.

## Branch protection (applied)

Ian approved these rules for `main`, and they are now in effect:

- Pull request required. **0 required GitHub approvals**.
- Required status check: `check` (CI workflow), **strict**: the branch must be up to date with `main`.
- **Enforced for admins** (`enforce_admins: true`).
- Force-pushes blocked, branch deletion blocked. No push restrictions on specific users.

### Review and merge flow

- The **Tech Lead** reviews the code and approves it in a PR comment.
- The **Repository Maintainer** reviews integration and repo health (secrets, generated files, lockfile, migrations) and approves in a PR comment.
- Once both approvals are posted and CI is green, the Maintainer squash-merges.

### Docs-only PRs (per Ian)

A PR is **docs-only** when it changes only documentation: `*.md` files, `docs/`, and `design/` assets. A PR is not docs-only if it touches any code, config, CI workflow, lockfile, or `package.json`.

- A docs-only PR needs only the **Repository Maintainer's** integration check (PR comment) and green CI. No Tech Lead review is required.
- Every other PR still needs approval comments from both the Tech Lead and the Maintainer.
- If it's unclear whether a PR is docs-only, treat it as a full PR.
