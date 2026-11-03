import type { AuditEntry, PublicUser, RoleName, UserSummary } from '@devyard/contracts';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import type { auditLogs } from '../../db/schema.js';
import { projects, userRoles, users } from '../../db/schema.js';
import { ApiError } from '../../lib/errors.js';
import type { UserRow } from '../auth/service.js';

export function findLiveUser(db: Pick<Db, 'select'>, id: string): UserRow | undefined {
  return db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .get();
}

/** Includes soft-deleted users (activity stays readable for auditors). */
export function findAnyUser(db: Pick<Db, 'select'>, id: string): UserRow | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function requireLiveUser(db: Pick<Db, 'select'>, id: string): UserRow {
  const u = findLiveUser(db, id);
  if (!u) throw new ApiError('NOT_FOUND', 'User not found');
  return u;
}

export const toSummary = (u: Pick<PublicUser, 'id' | 'username' | 'displayName'>): UserSummary => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
});

/** Active, non-deleted admins other than `excludeId`. */
export function countOtherActiveAdmins(db: Pick<Db, 'select'>, excludeId: string): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .where(
        and(
          eq(userRoles.roleId, 'admin'),
          eq(users.status, 'active'),
          isNull(users.deletedAt),
          ne(users.id, excludeId),
        ),
      )
      .get()?.n ?? 0
  );
}

export function userRoleIds(db: Pick<Db, 'select'>, userId: string): RoleName[] {
  return db
    .select({ r: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all()
    .map((x) => x.r as RoleName);
}

/** Throws 409 when an operation would leave no active admin (plan §6.3). */
export function assertNotLastAdmin(
  db: Pick<Db, 'select'>,
  target: UserRow,
  after: { roles: RoleName[]; active: boolean },
): void {
  const isActiveAdminNow =
    target.status === 'active' && !target.deletedAt && userRoleIds(db, target.id).includes('admin');
  const staysActiveAdmin = after.active && after.roles.includes('admin');
  if (isActiveAdminNow && !staysActiveAdmin && countOtherActiveAdmins(db, target.id) === 0)
    throw new ApiError('CONFLICT', 'Cannot remove the last active admin');
}

export function setRoles(
  db: Pick<Db, 'insert' | 'delete'>,
  userId: string,
  roles: RoleName[],
  grantedBy: string,
): void {
  db.delete(userRoles).where(eq(userRoles.userId, userId)).run();
  db.insert(userRoles)
    .values([...new Set(roles)].map((roleId) => ({ userId, roleId, grantedBy })))
    .run();
}

export function ownsLiveProjects(db: Pick<Db, 'select'>, userId: string): boolean {
  return !!db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.ownerId, userId), isNull(projects.deletedAt)))
    .get();
}

export function assertUnique(
  db: Pick<Db, 'select'>,
  fields: { username?: string; email?: string },
  excludeId?: string,
): void {
  const conds = [];
  if (fields.username) conds.push(eq(users.username, fields.username));
  if (fields.email) conds.push(eq(users.email, fields.email));
  for (const c of conds) {
    const clash = db
      .select({ id: users.id })
      .from(users)
      .where(excludeId ? and(c, ne(users.id, excludeId)) : c)
      .get();
    if (clash) throw new ApiError('CONFLICT', 'Username or email already in use');
  }
}

export function toAuditEntry(r: typeof auditLogs.$inferSelect): AuditEntry {
  return {
    id: r.id,
    actorId: r.actorId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    outcome: r.outcome,
    ip: r.ip,
    metadata: r.metadata ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function userIdsWithRole(db: Pick<Db, 'select'>, role: RoleName) {
  return db
    .select({ id: userRoles.userId })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(and(eq(userRoles.roleId, role), isNull(users.deletedAt)));
}
