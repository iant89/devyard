import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PublicUser, RoleName, SessionInfo } from '@devyard/contracts';
import { and, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { AppConfig } from '../../config/index.js';
import type { Db } from '../../db/client.js';
import {
  passwordResetTokens,
  rolePermissions,
  sessions,
  userRoles,
  users,
} from '../../db/schema.js';
import { newToken, sha256 } from '../../lib/crypto.js';
import { newId } from '../../lib/ids.js';

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;

export const MAX_FAILED_LOGINS = 10;
export const LOCKOUT_MS = 15 * 60_000;
export const LAST_SEEN_RESOLUTION_MS = 60_000;
export const RESET_TOKEN_TTL_MS = 60 * 60_000;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function loadRolesAndPermissions(
  db: Db,
  userId: string,
): { roles: RoleName[]; permissions: string[] } {
  const roles = db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all()
    .map((r) => r.roleId as RoleName)
    .sort();
  const permissions = roles.length
    ? [
        ...new Set(
          db
            .select({ p: rolePermissions.permissionId })
            .from(rolePermissions)
            .where(inArray(rolePermissions.roleId, roles))
            .all()
            .map((r) => r.p),
        ),
      ].sort()
    : [];
  return { roles, permissions };
}

export function toPublicUser(db: Db, u: UserRow): PublicUser {
  const { roles, permissions } = loadRolesAndPermissions(db, u.id);
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    status: u.status,
    roles,
    permissions,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: iso(u.lastLoginAt),
  };
}

export function toSessionInfo(s: SessionRow, currentId: string | null): SessionInfo {
  return {
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    userAgent: s.userAgent,
    ip: s.ip,
    current: s.id === currentId,
  };
}

/** Synchronizer CSRF token bound to the session (plan §5.5). */
export function csrfTokenFor(s: Pick<SessionRow, 'id' | 'csrfSecret'>): string {
  return createHmac('sha256', s.csrfSecret).update(s.id).digest('base64url');
}

export function csrfMatches(s: Pick<SessionRow, 'id' | 'csrfSecret'>, provided: string): boolean {
  const expected = Buffer.from(csrfTokenFor(s));
  const got = Buffer.from(provided);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export function createSession(
  db: Pick<Db, 'insert'>,
  config: AppConfig,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null },
  now = Date.now(),
): { token: string; session: SessionRow } {
  const token = newToken();
  const session: SessionRow = {
    id: newId(now),
    tokenHash: sha256(token),
    userId,
    csrfSecret: newToken(),
    createdAt: new Date(now),
    lastSeenAt: new Date(now),
    expiresAt: new Date(now + config.sessionTtlMs),
    revokedAt: null,
    revokedReason: null,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 512) : null,
  };
  db.insert(sessions).values(session).run();
  return { token, session };
}

/** Resolves a cookie token to a live session + active user, touching lastSeenAt at most once a minute. */
export function resolveSession(
  db: Db,
  config: AppConfig,
  token: string,
  now = Date.now(),
): { session: SessionRow; user: UserRow } | null {
  const row = db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, sha256(token)))
    .get();
  if (!row) return null;
  const { s, u } = row;
  if (s.revokedAt) return null;
  if (s.expiresAt.getTime() <= now) return null;
  if (s.lastSeenAt.getTime() + config.sessionIdleMs <= now) return null;
  if (u.status !== 'active' || u.deletedAt) return null;
  if (now - s.lastSeenAt.getTime() >= LAST_SEEN_RESOLUTION_MS) {
    s.lastSeenAt = new Date(now);
    db.update(sessions).set({ lastSeenAt: s.lastSeenAt }).where(eq(sessions.id, s.id)).run();
  }
  return { session: s, user: u };
}

export function listLiveSessions(db: Db, config: AppConfig, userId: string, now = Date.now()) {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date(now)),
        gt(sessions.lastSeenAt, new Date(now - config.sessionIdleMs)),
      ),
    )
    .orderBy(sessions.createdAt)
    .all();
}

/** Revokes every live session of a user, optionally keeping one. Returns the count revoked. */
export function revokeUserSessions(
  db: Pick<Db, 'update'>,
  userId: string,
  reason: string,
  exceptSessionId?: string,
  now = Date.now(),
): number {
  const res = db
    .update(sessions)
    .set({ revokedAt: new Date(now), revokedReason: reason })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined,
      ),
    )
    .run();
  return res.changes;
}

export function revokeSession(
  db: Pick<Db, 'update'>,
  userId: string,
  sessionId: string,
  reason: string,
  now = Date.now(),
): boolean {
  const res = db
    .update(sessions)
    .set({ revokedAt: new Date(now), revokedReason: reason })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .run();
  return res.changes > 0;
}

/**
 * Admin-issued single-use reset token (plan §5.6). Returns the raw token once; only its hash is stored.
 * B3's `POST /users/:id/password-reset` wraps this.
 */
export function issuePasswordResetToken(
  db: Pick<Db, 'insert' | 'delete'>,
  userId: string,
  issuedBy: string | null,
  ttlMs = RESET_TOKEN_TTL_MS,
  now = Date.now(),
): { token: string; expiresAt: Date } {
  const token = newToken();
  const expiresAt = new Date(now + ttlMs);
  // Only the newest token is valid: drop any older unused ones for this user.
  db.delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
    .run();
  db.insert(passwordResetTokens)
    .values({ id: newId(now), tokenHash: sha256(token), userId, issuedBy, expiresAt })
    .run();
  return { token, expiresAt };
}

/**
 * Hourly purge job body (plan §5.3). Deleting session rows is safe for forensics: the audit log
 * (auth.login / auth.logout / auth.session_revoke ...) keeps the history of purged sessions.
 */
export function purgeExpired(
  db: Db,
  config: AppConfig,
  now = Date.now(),
): { sessions: number; resetTokens: number } {
  const s = db
    .delete(sessions)
    .where(
      or(
        isNotNull(sessions.revokedAt),
        lt(sessions.expiresAt, new Date(now)),
        lt(sessions.lastSeenAt, new Date(now - config.sessionIdleMs)),
      ),
    )
    .run();
  const t = db
    .delete(passwordResetTokens)
    .where(
      or(isNotNull(passwordResetTokens.usedAt), lt(passwordResetTokens.expiresAt, new Date(now))),
    )
    .run();
  return { sessions: s.changes, resetTokens: t.changes };
}

/**
 * Atomically records a failed password check (login or password change). Increments the counter
 * with a single UPDATE ... RETURNING and, when it reaches MAX_FAILED_LOGINS, locks the account with
 * a conditional UPDATE so concurrent failures produce exactly one lock. Returns true when this call
 * locked the account.
 */
export function recordFailedPassword(db: Db, userId: string, now = Date.now()): boolean {
  const row = db
    .update(users)
    .set({ failedLoginCount: sql`${users.failedLoginCount} + 1` })
    .where(eq(users.id, userId))
    .returning({ count: users.failedLoginCount })
    .get();
  if (!row || row.count < MAX_FAILED_LOGINS) return false;
  const locked = db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: new Date(now + LOCKOUT_MS) })
    .where(and(eq(users.id, userId), sql`${users.failedLoginCount} >= ${MAX_FAILED_LOGINS}`))
    .returning({ id: users.id })
    .get();
  return !!locked;
}

export function isLocked(u: Pick<UserRow, 'lockedUntil'>, now = Date.now()): boolean {
  return !!u.lockedUntil && u.lockedUntil.getTime() > now;
}

export function findUserByLogin(db: Db, login: string): UserRow | undefined {
  const l = login.trim().toLowerCase();
  return db
    .select()
    .from(users)
    .where(and(or(eq(users.username, l), eq(users.email, l)), isNull(users.deletedAt)))
    .get();
}

export function countUsers(db: Pick<Db, 'select'>): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .get()?.n ?? 0
  );
}
