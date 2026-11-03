# @devyard/frontend

React 19 + TypeScript + Vite UI for Devyard, built on ENTERPRISE-UI (`@enterprise-ui/react`).

- **ENTERPRISE-UI** is installed from the pinned tarball `vendor/enterprise-ui-react-0.1.0-64fcbd0.tgz`
  (built with `npm run build:lib && npm pack` from iant89/ENTERPRISE-UI commit `64fcbd0`; sha256
  `7cbfa4ef6213ffb4d877b450d53ff9ada8390a07093a8696aed6cf2863c45869`). To upgrade, rebuild at a new commit,
  replace the tarball (keep the SHA in the filename) and update `package.json`.
- **Theme:** ENTERPRISE-UI `dark` + `src/theme/devyard-theme.css` (the only Devyard look-and-feel file:
  `--eui-*` token overrides for the amber accent G1 `#d9a441`, plus a few app-owned `dy-*` layout classes).
- **API:** `src/api/client.ts` — typed `/api/v1` client using `@devyard/contracts` schemas (runtime-validated,
  CSRF header on unsafe methods, 401 → session-expired handling).
- **Navigation:** `src/shell/navigation.ts` — SPEC §23 tree, filtered by `user.permissions` (Administration
  requires `admin.access`). The API still enforces every permission.

```sh
npm run build:contracts          # from repo root, once
npm run dev -w @devyard/frontend # http://localhost:5173, proxies /api → DEVYARD_API_URL (default :4000)
npm test -w @devyard/frontend    # vitest (jsdom)
npm run build -w @devyard/frontend
npx playwright install chromium && npm run test:e2e -w @devyard/frontend   # e2e + axe + screenshots (mocked API)
```
