# Contributing to Devyard

> Status: **proposal** (DY-R1). Branch protection on `main` is **pending Ian's approval** and is not configured yet.

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
  - CI (`check` workflow: typecheck, lint, format, tests, audit) is green.
  - Code review approved by the **Tech Lead**.
  - Integration/repo-health review by the **Repository Maintainer**: no secrets, no generated or oversized files, sane lockfile, migrations included.
- **Merge method:** squash merge by default. Use a merge commit only for `release/` branches when individual commits must be kept.
- Never commit `.env` files, databases, `node_modules`, `dist`, or credentials. Use `.env.example` for configuration keys.

## Versioning and tags

- [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.
- Releases are tagged `vX.Y.Z` on `main` (annotated tags) after the release PR merges.
- Pre-releases use `vX.Y.Z-rc.N`.

## Branch protection (pending approval)

Proposed for `main`, **not yet applied, awaiting Ian's approval**: require a PR, require the `check` status, require 1 approving review, block force-pushes and deletion.
