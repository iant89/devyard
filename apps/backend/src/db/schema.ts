/**
 * Devyard Phase 1 schema (spec §5, §6.2, §18). SQLite via Drizzle.
 * Conventions: text primary keys (UUIDv7-style from `newId()`), integer ms timestamps,
 * explicit FKs + indexes (spec §18 "appropriate indexes and foreign key constraints").
 */
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

// ── users (spec §5.1, §5.2) ────────────────────────────────────────────────
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(), // stored lowercase
    email: text('email').notNull(), // stored lowercase
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(), // scrypt$N$r$p$salt$hash
    status: text('status', { enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: integer('locked_until', { mode: 'timestamp_ms' }),
    passwordChangedAt: integer('password_changed_at', { mode: 'timestamp_ms' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }), // soft delete keeps audit FKs valid
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_username_uq').on(t.username),
    uniqueIndex('users_email_uq').on(t.email),
    index('users_status_idx').on(t.status),
  ],
);

// ── sessions (spec §5.1: expiration, logout, revocation) ───────────────────
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // public id (shown in session list); never the secret
    tokenHash: text('token_hash').notNull(), // sha256(base64url token); raw token only in cookie
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    csrfSecret: text('csrf_secret').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(), // absolute expiry
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

// ── password reset tokens (spec §5.1 reset workflow, §5.2 admin reset) ─────
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

// ── roles / permissions (spec §5.3, §18 roles, permissions, user_roles) ────
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(), // 'admin' | 'developer' | 'viewer' (stable ids, seeded)
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(), // dotted key, e.g. 'projects.create', 'users.manage'
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

// ── projects (spec §6.1, §6.2) ─────────────────────────────────────────────
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

// ── project_members (spec §5.3 resource-level sharing; §5.4 future teams) ──
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

// ── audit_logs (spec §21.2; Phase 1 writes auth/user/sharing events) ───────
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // e.g. 'auth.login', 'project.member.add'
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
