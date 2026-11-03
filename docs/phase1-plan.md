# Devyard — Phase 1 Technical Plan (DY-T1)

Author: Technical Lead · Status: Draft for PM review · Date: 2026-11-02
Repo: `github.com/iant89/devyard` (default branch `main`) · Scaffold branch: `feat/phase1-scaffold`

Scope is spec §24 Phase 1 ("Users can authenticate and manage projects"). The stack is fixed by spec §27 and §3 and is not substituted anywhere below. Section references like (§5.1) point to `SPEC.md`.

---

## 1. Goals and non-goals

**In scope (§24 Phase 1):** React + TS frontend init, Fastify backend init, ENTERPRISE-UI integration, SQLite + Drizzle, authentication, multi-user permissions, application shell, visual design system, project creation and management.

**Out of scope for Phase 1:** playground, IDE, Git, pipelines, deployments, secrets (Phases 2–7). Phase 1 runs no project code, which keeps §4.2 and §19.1 satisfied trivially. The project templates in §6.1 other than `empty` are reserved in the contracts and rejected by the API with `VALIDATION_FAILED` until their phases land.

**UI gate (PM-CHARTER §5):** no frontend or UI code ships until the PM confirms the user has approved the mockups. The backend and contracts can go ahead now.

---

## 2. Monorepo layout (§26.1 "frontend, backend, infrastructure, and shared contracts logically separated")

```
devyard/
├── package.json              # npm workspaces root; scripts: typecheck, lint, test, check, format
├── tsconfig.base.json        # strict, ES2022, NodeNext (§3.2 Node ES2022+, §26.1 strict mode)
├── eslint.config.js          # flat config, typescript-eslint
├── .prettierrc.json  .nvmrc (22)  .gitignore
├── .github/workflows/ci.yml  # typecheck, lint, format, test, prod dependency audit (§19.4)
├── packages/
│   └── contracts/            # @devyard/contracts — zod schemas + inferred TS types for /api/v1
│       └── src/{common,auth,users,projects,index}.ts
├── apps/
│   ├── backend/              # @devyard/backend — Fastify modular monolith (control plane, §4.2)
│   │   ├── drizzle.config.ts
│   │   ├── drizzle/          # versioned SQL migrations (§18), committed
│   │   ├── src/
│   │   │   ├── app.ts        # buildApp(config): plugins, error envelope, /api/v1 prefix
│   │   │   ├── server.ts     # listen + graceful shutdown (§26.2)
│   │   │   ├── config/       # env -> AppConfig; every path configurable (§4.3)
│   │   │   ├── db/           # schema.ts, client.ts (WAL, FKs on), seed.ts (RBAC), migrate.ts
│   │   │   ├── lib/          # errors (ApiError), crypto (scrypt, tokens), ids (UUIDv7)
│   │   │   └── modules/      # one folder per §4.1 module: health/ now; auth/, users/, permissions/, projects/, audit/ next
│   │   └── test/             # vitest + fastify.inject against in-memory SQLite
│   └── frontend/             # @devyard/frontend — placeholder only until mockups are approved
└── docs/phase1-plan.md
```

Module rule (§4.1): each `modules/<name>/` exposes `routes.ts` (a Fastify plugin) and `service.ts` (plain functions that take `db`). Modules don't import other modules' internals. Cross-module calls go through the exported service API. Authorization lives in `modules/permissions/` as `can(user, action, resource)`.

Later layout (not created yet): `apps/runner/` for the Phase 5 execution plane, `apps/deployer/` for the privileged deploy service in §12.3/§19.2, and `infra/` for Caddy and systemd units. Phase 1 doesn't add them.

### 2.1 ENTERPRISE-UI consumption (§3.1, §27; inspected at github.com/iant89/ENTERPRISE-UI)

| Item       | Finding                                                                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package    | `@enterprise-ui/react` v0.1.0, ESM, typed, tree-shakeable                                                                                                                                                                          |
| Published? | **No.** The README says it isn't on npm yet. Install it from a tarball built with `npm run build:lib && npm pack` (gives `enterprise-ui-react-0.1.0.tgz`)                                                                          |
| Peer deps  | `react >=18.2.0`, `react-dom >=18.2.0` (19 supported). Runtime dep is `lucide-react` (icons), which the README tells consumers to install alongside                                                                                |
| CSS        | `import '@enterprise-ui/react/styles.css'` once. `tokens.css` and `sap-fonts.css` are optional exports                                                                                                                             |
| Theming    | `<ThemeProvider theme density>`. Themes: `light`, `dark`, `high-contrast` (plus SAP Horizon and Quartz variants). Density: `cozy`/`compact`. Every value is a `--eui-*` CSS custom property, and themes can be scoped to a subtree |
| Shell      | `AppShell`, `ApplicationHeader`, `SideNavigation`, `NavigationItem`, `Page` cover the §2.4 shell. Patterns include `ObjectPage`, `FilterBar`, `MasterDetail`, `Dashboard`                                                          |
| Toolchain  | Built with Vite 8 and TS 6, Node ≥ 20.19 or ≥ 22.12, so it lines up with Devyard's Vite (§3.1)                                                                                                                                     |

**Proposed approach (needs a PM decision, see §9):** vendor a pinned tarball at `vendor/enterprise-ui-react-<version>-<sha>.tgz` and depend on it as `"@enterprise-ui/react": "file:vendor/…tgz"`. Builds are reproducible and offline, and CI needs no auth. Alternatives are a `github:iant89/ENTERPRISE-UI#<sha>` dependency (it ships no `dist`, so it would need a `prepare` build) or waiting for an npm publish. Devyard's graphite and industrial-amber identity (§2.1–2.3) goes in one `devyard-theme.css` that overrides `--eui-*` tokens on top of the `dark` theme. No second component system (§3.1, "use ENTERPRISE-UI wherever practical"). We don't modify ENTERPRISE-UI itself (PM-CHARTER §2.3). Gaps go to the PM as framework-addition requests.

---

## 3. Tooling and scripts

| Concern                   | Choice                                                                  | Grounding                                                                    |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Runtime                   | Node 22 LTS (`.nvmrc`), `engines >=22.12`                               | §3.2 ES2022+. Also satisfies ENTERPRISE-UI/Vite 8's Node requirement         |
| Package manager           | npm workspaces                                                          | Matches ENTERPRISE-UI (npm, package-lock) and keeps dependencies few (§26.1) |
| Language                  | TypeScript ~6.0, `strict`, `noUncheckedIndexedAccess`                   | §26.1                                                                        |
| API                       | Fastify 5 + `@fastify/cookie`, `@fastify/helmet`, `@fastify/rate-limit` | §3.2, §17 rate limiting, §19.4 secure headers                                |
| DB                        | SQLite via `better-sqlite3` + `drizzle-orm` / `drizzle-kit`             | §3.2, §18, §27                                                               |
| Validation / contracts    | `zod` v4 schemas in `@devyard/contracts`, shared by FE and BE           | §17 input validation, §26.1 typed API contracts                              |
| Tests                     | Vitest 5, `fastify.inject`, in-memory SQLite                            | Matches ENTERPRISE-UI                                                        |
| Lint / format             | ESLint 10 flat config + typescript-eslint, Prettier                     | Matches ENTERPRISE-UI                                                        |
| Dev runner                | `tsx watch`                                                             |                                                                              |
| Frontend (after approval) | Vite + React 19 + `@enterprise-ui/react` + `react-router`               | §3.1                                                                         |

Root scripts: `npm run typecheck | lint | test | check | format | format:check | build | dev:backend | db:generate | db:migrate`. `pretypecheck` and `pretest` build `@devyard/contracts` first, so the backend resolves its `dist` types.

CI (`.github/workflows/ci.yml`, on PRs and pushes to main): `npm ci`, then typecheck, lint, format check, test, and `npm audit --omit=dev --audit-level=high` (§19.4 "dependency vulnerability checks").

---

## 4. Drizzle schema (§5, §6.2, §18)

The committed source is `apps/backend/src/db/schema.ts`, and the generated migration is `apps/backend/drizzle/0000_init.sql`. Conventions: text UUIDv7 primary keys (sortable by time), integer-millisecond timestamps, `PRAGMA foreign_keys=ON`, WAL mode, and an explicit index on every FK and lookup column (§18, §26.3).

```ts
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
};

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(), // lowercase
    email: text('email').notNull(), // lowercase
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(), // scrypt$N$r$p$salt$hash
    status: text('status', { enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: integer('locked_until', { mode: 'timestamp_ms' }),
    passwordChangedAt: integer('password_changed_at', { mode: 'timestamp_ms' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_username_uq').on(t.username),
    uniqueIndex('users_email_uq').on(t.email),
    index('users_status_idx').on(t.status),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // public id, never the secret
    tokenHash: text('token_hash').notNull(), // sha256(cookie token)
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    csrfSecret: text('csrf_secret').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    revokedReason: text('revoked_reason'),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_uq').on(t.tokenHash),
    index('sessions_user_idx').on(t.userId),
    index('sessions_expires_idx').on(t.expiresAt),
  ],
);

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    issuedBy: text('issued_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex('prt_token_hash_uq').on(t.tokenHash), index('prt_user_idx').on(t.userId)],
);

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(), // 'admin' | 'developer' | 'viewer'
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(), // 'projects.create', 'users.manage', ...
  description: text('description').notNull().default(''),
});

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoles = sqliteTable(
  'user_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    grantedBy: text('granted_by').references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] }), index('user_roles_role_idx').on(t.roleId)],
);

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    projectType: text('project_type').notNull().default('empty'),
    primaryLanguage: text('primary_language'),
    framework: text('framework'),
    archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('projects_slug_uq').on(t.slug),
    index('projects_owner_idx').on(t.ownerId),
    index('projects_updated_idx').on(t.updatedAt),
  ],
);

export const projectMembers = sqliteTable(
  'project_members',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'maintainer', 'developer', 'viewer'] }).notNull(),
    addedBy: text('added_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    index('project_members_user_idx').on(t.userId),
  ],
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    // §21.2 (actor, action, target, timestamp, outcome)
    id: text('id').primaryKey(),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    outcome: text('outcome', { enum: ['success', 'failure'] }).notNull(),
    ip: text('ip'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index('audit_actor_idx').on(t.actorId),
    index('audit_target_idx').on(t.targetType, t.targetId),
    index('audit_created_idx').on(t.createdAt),
  ],
);
```

**RBAC seed (§5.3):** the global permissions are `users.read`, `users.manage`, `projects.create`, `projects.read_all`, `projects.manage_all`, `admin.access`, and `audit.read`. `admin` gets all of them. `developer` gets `projects.create` and `users.read` (so they can pick share targets). `viewer` gets `users.read`. Global roles decide what a user may do on the platform. **Project access comes only from `project_members`** (§5.3, "resource-level permissions"), and admins get it through `projects.*_all`.

**Project roles:** `owner` can do everything, including delete, transfer, and manage members. `maintainer` can edit settings and manage non-owner members. `developer` can edit source and build in later phases. `viewer` is read-only. A global Viewer can't hold `developer` or higher on a project. The API caps the project role at `viewer` for them, which keeps §5.3 ("no source modification") intact.

**Future teams (§5.4):** add a `teams` table and a `team_members` table, then put a nullable `team_id` on `project_members` with a CHECK that exactly one of `user_id`/`team_id` is set. `can()` already resolves through a membership lookup, so authentication doesn't change.

Deliberate deviations: `project_settings` (§18) is deferred to the phases that need build and deploy config. `audit_logs` is pulled forward from Phase 7 because §21.2 requires login and sharing audits, and those events start in Phase 1.

---

## 5. Auth and session design (§5.1, §16, §19.4)

1. **Passwords:** scrypt from Node's built-in `crypto` (N=2^16, r=8, p=1, 16-byte salt, 64-byte key; at most 4 hashes in flight via a semaphore in `lib/crypto.ts`), with a self-describing hash string so parameters can be upgraded on login. This needs no native dependency (§26.1). The policy is at least 12 characters, NFKC-normalised, at most 256. Implemented and tested in `lib/crypto.ts`.
2. **Sessions:** opaque server-side sessions, not JWTs, because revocation (§5.1) is required. The cookie `dy_session` holds a 256-bit random token. The DB stores only `sha256(token)`, so a DB leak can't be replayed. Cookie flags: `HttpOnly; SameSite=Lax; Secure` (configurable off for plain-HTTP dev); `Path=/`; host-only, no `Domain`. Whenever the cookie is Secure it uses the `__Host-` prefix. Production forces Secure: `loadConfig` throws if `NODE_ENV=production` and `DEVYARD_COOKIE_SECURE=false`.
3. **Expiry:** an absolute TTL of 7 days (`DEVYARD_SESSION_TTL_HOURS`) and an idle timeout of 24 hours (`DEVYARD_SESSION_IDLE_HOURS`). `lastSeenAt` updates at most once a minute. Expired or revoked rows are purged hourly.
4. **Rotation:** a new session is issued on login and on password change. A password change or reset revokes every other session for that user. Disabling or deleting a user revokes all of their sessions.
5. **CSRF (§19.4):** SameSite=Lax plus a synchronizer token. `GET /auth/me` and `POST /auth/login` return `csrfToken = HMAC(session.csrfSecret, sessionId)`. Every unsafe method needs an `X-CSRF-Token` header that matches, otherwise the API returns `403 CSRF_FAILED`. Every unsafe request (including the session-less login, bootstrap and reset-confirm) must also carry an `Origin` that exactly matches (scheme, host and port) an entry in `DEVYARD_PUBLIC_ORIGINS`. Without `Origin` the `Referer`'s origin is used, and the request is rejected with `403 CSRF_FAILED` when both are missing or `Origin: null`. `DEVYARD_PUBLIC_ORIGINS` is required in production. Dev defaults to `http://localhost:4000,http://127.0.0.1:4000,http://localhost:5173`, and test defaults to `http://localhost`.
6. **Password reset (§5.1, §5.2):** Confirm validates the token before hashing the new password, then consumes it with a conditional `UPDATE … WHERE used_at IS NULL`, so only one concurrent redemption can win. There's no email channel in the MVP (§21.1 defers delivery channels). An admin calls `POST /users/:id/password-reset`, which returns a single-use 256-bit token, valid for 1 hour and stored hashed. The user redeems it at `POST /auth/password-reset/confirm`. Email delivery can be added later without changing the API.
7. **Brute force (§17, §19.4):** `@fastify/rate-limit` allows 10 attempts per minute per IP on `/auth/login` and `/auth/password-reset/confirm`, 5 per minute per IP on `/auth/bootstrap`, and 5 per minute **per user** on `POST /auth/password`. Client IPs come from the socket unless `DEVYARD_TRUST_PROXY` lists the proxy (IPs/CIDRs; off by default), so a spoofed `X-Forwarded-For` can't buy new rate buckets. After 10 consecutive failures, counting both login and `POST /auth/password` failures, the account is locked for 15 minutes (`failedLoginCount`, `lockedUntil`). The increment is a single atomic `UPDATE … SET failed_login_count = failed_login_count + 1 RETURNING`, and the lock is a conditional update, so parallel attempts can't lose counts or lock twice. Disabled accounts don't accumulate failures. Unknown, disabled and locked accounts still run one dummy verify against a hash computed at startup, so timing doesn't reveal account state. Failures return the same generic `UNAUTHENTICATED` either way, so they don't reveal whether the user exists. Every attempt is audited (§21.2).
8. **Bootstrap:** `GET /auth/bootstrap` returns `{ required: boolean }`. `POST /auth/bootstrap` creates the first admin only while the `users` table is empty, and it runs in a transaction so two requests can't both succeed. A CLI `npm run user:create-admin` is the recovery path. **Operators must finish bootstrap before exposing the server** beyond localhost, because until then anyone who reaches it can claim the first admin.
9. **Authorization:** a `preHandler` resolves `request.user` (with roles and permissions) from the cookie. Route options declare `{ auth: true, permission?: 'users.manage' }`. Project routes call `requireProjectRole(projectId, minRole)`. Admins with `projects.manage_all` pass. Anyone else who isn't a member gets **404**, not 403, so project existence doesn't leak (§25 "users cannot access unauthorized projects"). Everything is enforced server-side (§16, §17).
10. **WebSockets (§16):** Phase 1 has no WebSockets. When they arrive, the upgrade handler reuses the same cookie session lookup and `can()` check.
11. **Logging:** Fastify redacts `cookie` and `authorization` headers. Passwords and tokens are never logged (§19.5, §21.2).

---

## 6. /api/v1 contracts (§17)

The source of truth is `packages/contracts/src/*.ts` (zod). Every route validates its input with these schemas, and the frontend imports the same types.

### 6.1 Conventions

- JSON only. Success: `{ data: T }`. Lists: `{ data: T[], meta: { page, pageSize, total } }`.
- List query: `page` (default 1), `pageSize` (default 25, max 100), `sort` (`field` or `-field`, checked against an allow-list), `q` (search). Endpoints add their own filters.
- Errors (every non-2xx, including 404 and 429):
  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Request validation failed",
      "requestId": "0193…",
      "details": [{ "path": "email", "message": "Invalid email" }]
    }
  }
  ```
  `code` ∈ `VALIDATION_FAILED 400 · UNAUTHENTICATED 401 · FORBIDDEN 403 · CSRF_FAILED 403 · NOT_FOUND 404 · CONFLICT 409 · RATE_LIMITED 429 · INTERNAL 500`. Implemented in `apps/backend/src/lib/errors.ts`.
- Timestamps are ISO-8601 UTC strings. IDs are opaque strings.
- Unsafe methods need `X-CSRF-Token`. Every route except health, bootstrap, login, and reset-confirm needs a session.

### 6.2 Auth — `/api/v1/auth`

| Method | Path                      | Request                                                  | 2xx response                     | Notes                                                                                   |
| ------ | ------------------------- | -------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/bootstrap`              | –                                                        | `{data:{required:boolean}}`      | public                                                                                  |
| POST   | `/bootstrap`              | `BootstrapRequest {username,email,displayName,password}` | 201 `{data: AuthState}` + cookie | 409 if any user exists                                                                  |
| POST   | `/login`                  | `LoginRequest {login, password}` (username or email)     | 200 `{data: AuthState}` + cookie | 401 generic, 429                                                                        |
| POST   | `/logout`                 | –                                                        | 204, cookie cleared              | revokes current session                                                                 |
| GET    | `/me`                     | –                                                        | `{data: AuthState}`              | `AuthState = {user: PublicUser, session: SessionInfo, csrfToken}`                       |
| POST   | `/password`               | `{currentPassword, newPassword}`                         | 204                              | rotates session, revokes others. Client must re-fetch `GET /me` for the new `csrfToken` |
| POST   | `/password-reset/confirm` | `{token, newPassword}`                                   | 204                              | public, single use                                                                      |
| GET    | `/sessions`               | –                                                        | `{data: SessionInfo[]}`          | own sessions                                                                            |
| DELETE | `/sessions/:id`           | –                                                        | 204                              | revoke one of your own                                                                  |
| DELETE | `/sessions`               | –                                                        | 204                              | revoke all except current                                                               |

Rate limits and CSRF for these routes are covered in §5.5 and §5.7. Every unsafe route requires an allow-listed `Origin` (or `Referer`), and unsafe routes with a session also need `X-CSRF-Token`. A wrong `currentPassword` on `POST /password` returns `400 VALIDATION_FAILED` and counts toward lockout. Limits: bootstrap 5/min/IP, login 10/min/IP, reset-confirm 10/min/IP, password 5/min/user.

**Non-browser clients:** unsafe requests (POST/PUT/PATCH/DELETE) from scripts, CLIs or other API clients must still send an `Origin` header (or `Referer`) whose origin is in `DEVYARD_PUBLIC_ORIGINS`, for example `curl -H 'Origin: https://devyard.example.lan' …`. Without it they get `403 CSRF_FAILED`, even on login.

**Auth configuration keys (B2):**

| Key                      | Default                                       | Notes                                                                                           |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `DEVYARD_PUBLIC_ORIGINS` | dev: localhost list; test: `http://localhost` | Comma-separated exact origins. **Required in production**                                       |
| `DEVYARD_TRUST_PROXY`    | off                                           | Comma-separated proxy IPs/CIDRs (e.g. Caddy's address). Only then is `X-Forwarded-For` honoured |
| `DEVYARD_COOKIE_SECURE`  | `true` in production                          | `false` is rejected in production                                                               |
| `DEVYARD_SCRYPT_N`       | unset (2^16)                                  | Test-only cost override, ignored unless `NODE_ENV=test`                                         |

`PublicUser = {id, username, email, displayName, status, roles[], permissions[], createdAt, lastLoginAt|null}`. It never includes the password hash or lock fields.

### 6.3 Users — `/api/v1/users` (§5.2)

| Method | Path                  | Permission                                                  | Request                                                           | Response                                                                                                        |
| ------ | --------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                   | `users.read`                                                | `UserListQuery` (+`status`, `role`)                               | list of `PublicUser`. Non-admins see a reduced `{id, username, displayName}`                                    |
| POST   | `/`                   | `users.manage`                                              | `CreateUserRequest {username,email,displayName,password,roles[]}` | 201 `{data: PublicUser}`. 409 on duplicate                                                                      |
| GET    | `/:id`                | `users.read` or self                                        | –                                                                 | `{data: PublicUser}`                                                                                            |
| PATCH  | `/:id`                | `users.manage` (self may change only `displayName`/`email`) | `UpdateUserRequest` (partial: email, displayName, status, roles)  | `{data: PublicUser}`. Disabling revokes sessions. Can't remove the last active admin (409)                      |
| DELETE | `/:id`                | `users.manage`                                              | –                                                                 | 204. Soft-delete plus session revoke. 409 if the user still owns projects (transfer first) or is the last admin |
| POST   | `/:id/password-reset` | `users.manage`                                              | –                                                                 | 201 `{data:{token, expiresAt}}`                                                                                 |
| GET    | `/:id/activity`       | `users.manage` or `audit.read`                              | `PageQuery`                                                       | list of audit entries for that actor (§5.2 "view user activity")                                                |

Notes (Tech Lead rulings on PR #4):

- **Reduced shape:** callers without `users.manage` get `UserSummary {id, username, displayName}` from both `GET /` and `GET /:id`. The exception is `GET /:id` on their own id, which returns the full `PublicUser`.
- **No enumeration for non-managers:** without `users.manage`, `GET /` lists only active users, and `q` matches only `username` and `displayName`. `sort` accepts only `username`, `displayName` and `createdAt` (others → 400), and `role` → 400. The `status` parameter is ignored. Managers can also search by email and sort by `email` and `lastLoginAt`.
- **Self email change:** changing your own email requires `currentPassword`. A wrong password counts toward lockout, and the response is `400` with `details[0].path = currentPassword`.
- **Delete:** deleting yourself returns `409`. A deleted user's `/:id/activity` stays readable to `users.manage` and `audit.read`, while the other `:id` routes return 404.
- **Reset tokens:** issuing a new one deletes the user's older unused tokens, so only the newest works.
- **Deleted users:** soft-deleted users keep their username and email reserved (the unique indexes cover deleted rows) for the MVP. Reusing them needs the later hard-purge admin action (D7).
- **Activity:** `GET /:id/activity` returns `UserActivityEntry` = `AuditEntry` + `relation: 'actor' | 'target'`. It covers entries the user performed (`actor`, including actions on themselves) and entries performed on them (`targetType='user'`, `targetId=:id`, marked `target`). Newest first, paginated.

### 6.4 Projects — `/api/v1/projects` (§6)

| Method | Path                   | Min project role                               | Request                                                                                           | Response                                                                     |
| ------ | ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/`                    | – (membership filter)                          | `ProjectListQuery` (+`scope: all\|mine\|shared`, `archived`)                                      | list of `Project` (includes `myRole`)                                        |
| POST   | `/`                    | global `projects.create`                       | `CreateProjectRequest {name, slug?, description, template='empty', primaryLanguage?, framework?}` | 201 `{data: Project}`. Creator becomes the `owner` member. 409 on slug clash |
| GET    | `/:id`                 | viewer                                         | –                                                                                                 | `{data: Project}` (404 if not a member)                                      |
| PATCH  | `/:id`                 | maintainer                                     | `UpdateProjectRequest` (partial, includes `archived`)                                             | `{data: Project}`                                                            |
| DELETE | `/:id`                 | owner                                          | –                                                                                                 | 204 (soft delete)                                                            |
| GET    | `/:id/members`         | viewer                                         | –                                                                                                 | `{data: ProjectMember[]}`                                                    |
| POST   | `/:id/members`         | maintainer                                     | `{userId, role: maintainer\|developer\|viewer}`                                                   | 201 `{data: ProjectMember}`. Audited (§21.2 "project sharing")               |
| PATCH  | `/:id/members/:userId` | maintainer (owner only for maintainer changes) | `{role}`                                                                                          | `{data: ProjectMember}`                                                      |
| DELETE | `/:id/members/:userId` | maintainer, or self (leave)                    | –                                                                                                 | 204. The owner can't be removed                                              |
| POST   | `/:id/transfer`        | owner                                          | `{newOwnerId}`                                                                                    | `{data: Project}`. The previous owner becomes maintainer                     |

`Project = {id, slug, name, description, ownerId, projectType, primaryLanguage|null, framework|null, archived, myRole, createdAt, updatedAt}`.

Implementation notes (B4):

- **Access:** every `:id` route goes through `requireProjectRole()`. Non-members, unknown ids and soft-deleted projects all return the same `404 NOT_FOUND`. A visible project with too low a role returns `403`. Admins (`projects.manage_all`) act as `owner`, and `projects.read_all` gives at least `viewer`.
- **Viewer cap on write:** when a member is added or changed, a global Viewer (no admin or developer role) is stored as `viewer` whatever role was requested. The response shows the stored role, and the audit entry records `requestedRole` and `capped: true`. Global Viewers also can't receive ownership through a transfer (400). The cap still applies on read.
- **Maintainers:** only the owner can add, promote, demote or remove maintainers. Maintainers manage `developer` and `viewer` members. Anyone can leave (`DELETE /:id/members/<self>`) except the owner, whose role changes only through `/transfer`.
- **Slugs:** derived from `name` when omitted (`my-app`, then `my-app-2` and so on). An explicit slug that clashes returns 409. Slugs stay reserved after a soft delete.
- **Templates:** only `empty` is accepted in Phase 1. Other `ProjectTemplate` values return `400` until Phases 2–4 implement them.
- **List:** `scope=all` means every project the caller can see (all of them for `read_all`/`manage_all`). `mine` is projects the caller owns, and `shared` is projects they are a member of but don't own. Archived projects are hidden unless `archived=true`, which lists only archived ones. The sort allow-list is `name`, `slug`, `createdAt`, `updatedAt` (default `-updatedAt`). `q` matches name, slug and description, with LIKE wildcards escaped.
- **Audit actions:** `project.create`, `project.update`, `project.archive`, `project.unarchive`, `project.delete`, `project.member_add`, `project.member_update`, `project.member_remove`, `project.member_leave`, `project.transfer` (§21.2 "project sharing").

Health: `GET /api/v1/health` → `{status:'ok', version, db:'ok'|'error'}`. Already implemented.

---

## 7. Implementation batches (PM-CHARTER §6.2, meaningful batches)

| Batch                                                     | Owner     | Content                                                                                                                                                                                                                                                                                    | Acceptance criteria                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1: Scaffold** ✅ (this PR)                             | Tech Lead | Workspaces, tsconfig, ESLint, Prettier, CI; `@devyard/contracts` (common, auth, users, projects schemas); backend skeleton (config, Drizzle schema + migration 0000, RBAC seed, error envelope, helmet, rate-limit, cookie, `/api/v1/health`); crypto and id helpers; frontend placeholder | `npm ci && npm run check` green locally and in CI; migration applies to a fresh DB; 3 roles seeded idempotently; health returns `db:'ok'`; unknown route returns the `NOT_FOUND` envelope; FK/unique constraints tested                                                                                             |
| **B2: Auth**                                              | Back-End  | `modules/auth`: bootstrap, login, logout, me, sessions list/revoke, password change, reset confirm; session preHandler; CSRF; lockout; login rate limit; audit writes; purge job; admin-create CLI                                                                                         | Integration tests cover: cookie flags (HttpOnly, SameSite, Secure in prod); token stored only hashed; expired/idle/revoked sessions return 401; CSRF missing returns 403; 11th bad login is locked or 429; bootstrap works only once; password change revokes other sessions; no secrets in logs (log-capture test) |
| **B3: Users & permissions**                               | Back-End  | `modules/users`, `modules/permissions` (`can()`, `requirePermission`, `requireProjectRole`)                                                                                                                                                                                                | Matrix tests: admin/developer/viewer × each users endpoint; last-admin protection; disable revokes sessions; activity endpoint paginates                                                                                                                                                                            |
| **B4: Projects**                                          | Back-End  | `modules/projects`: CRUD, scope filters, members, transfer, archive                                                                                                                                                                                                                        | Two-user isolation test: user B gets 404 on user A's project until shared; a viewer member can't PATCH; global Viewer capped at the project `viewer` role; pagination, sort allow-list, `q` filter; sharing is audited. This satisfies the §25 User Management criteria at API level                                |
| **B5: Frontend foundation** ⛔ blocked on mockup approval | Front-End | Vite + React app, ENTERPRISE-UI install, `devyard-theme.css` (graphite/amber), AppShell with §23 navigation filtered by permissions, typed API client from contracts                                                                                                                       | Matches the approved mockups; login/logout/bootstrap flows; responsive shell (§2.4); axe has no serious violations                                                                                                                                                                                                  |
| **B6: Frontend features** ⛔ blocked                      | Front-End | Projects list (All/Mine/Shared), create, settings, members; admin Users screens; account and sessions page                                                                                                                                                                                 | §24 deliverable demonstrated end to end; QA pass against the mockups (PM-CHARTER §5)                                                                                                                                                                                                                                |
| **B7: Packaging**                                         | DevOps    | Production build, backend serves the static frontend or Caddy does, a systemd unit for the control plane, `/opt/devyard` paths via env (§4.3)                                                                                                                                              | Fresh Linux host: install, migrate, bootstrap admin, log in over HTTPS through Caddy                                                                                                                                                                                                                                |

B2–B4 can start right after this PR merges. B5 starts when the PM confirms approval.

---

## 8. Risks

| #   | Risk                                                                                                         | Impact                                           | Mitigation                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | ENTERPRISE-UI isn't published on npm (v0.1 pre-release)                                                      | FE install and CI reproducibility                | Vendored, pinned tarball (decision D1). Pin by commit SHA. Upgrade on purpose                                                        |
| R2  | ENTERPRISE-UI themes are Fiori-flavoured. The graphite/industrial look (§2) has to come from token overrides | Visual mismatch, pressure to add a second UI kit | Override only through `--eui-*` tokens. Gaps go to the PM as framework requests. Never add another component system (§3.1)           |
| R3  | `better-sqlite3` is a native module, and prebuilds must exist for the target Node/arch                       | Install failures on the homelab host             | Pin Node 22 LTS. CI on Linux x64. Document build-essential as a fallback. (Phase 1 verified 12.x installs on Node 24 with prebuilds) |
| R4  | SQLite write contention once queue and logs arrive in later phases                                           | Latency                                          | WAL, `busy_timeout`, short transactions, single-writer discipline. Revisit only if measured (§10.6)                                  |
| R5  | Session and CSRF mistakes                                                                                    | Account takeover                                 | Hashed tokens, `__Host-` cookie, synchronizer CSRF + Origin check, dedicated test suite in B2, QA security pass                      |
| R6  | No email channel for password reset                                                                          | Users can't self-serve resets                    | Admin-issued reset token (§5.2). Email adapter later (§21.1)                                                                         |
| R7  | Spec §18 lists entities Phase 1 doesn't create                                                               | Schema churn                                     | Additive migrations only. Naming conventions fixed now                                                                               |
| R8  | Frontend blocked on mockups                                                                                  | Schedule                                         | Backend batches B2–B4 run in parallel. API is ready before UI starts                                                                 |
| R9  | Fast-moving dependency majors (TS 6/7, Vitest 5, ESLint 10, zod 4)                                           | Breakage                                         | Lockfile committed, `npm audit` in CI. Stay on TS ~6.0 (ENTERPRISE-UI's version) rather than TS 7 for now                            |

---

## 9. Open decisions for the PM

1. **D1. ENTERPRISE-UI install method:** vendored pinned tarball (recommended), a `github:` dependency with a build step, or wait for an npm publish. Does the user plan to publish `@enterprise-ui/react`, and to which registry?
2. **D2. Branding vs. ENTERPRISE-UI themes:** is a Devyard token-override layer on the `dark` theme acceptable, or should a "graphite" theme be proposed upstream to ENTERPRISE-UI (needs the user's authorization, PM-CHARTER §2.3)?
3. **D3. Password reset channel:** confirm admin-issued one-time reset tokens for the MVP, with email deferred.
4. **D4. Open registration:** recommend none. Only admins create users, plus a first-run bootstrap. Confirm.
5. **D5. Session lifetimes:** 7-day absolute and 24-hour idle by default (configurable). Confirm, or give values.
6. **D6. Project roles:** `owner/maintainer/developer/viewer`, with global Viewers capped at project `viewer`. Confirm.
7. **D7. Deletion semantics:** soft delete for users and projects (keeps the audit trail). Hard purge later as an admin action. Confirm.
8. **D8. Repo governance:** branch protection on `main` (require CI plus 1 review) and the PR convention. Assign a Repository Maintainer, or let the Tech Lead propose it?
9. **D9. Mockup gate:** confirm that UX/UI and Graphics are starting Phase 1 mockups (login, shell, projects, users), since B5/B6 are blocked on approval.
