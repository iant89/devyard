import {
  CreateUserRequest,
  PageQuery,
  UpdateUserRequest,
  USER_SORT_FIELDS,
  USER_SORT_FIELDS_PUBLIC,
  UserListQuery,
  type RoleName,
} from '@devyard/contracts';
import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { auditLogs, users } from '../../db/schema.js';
import { hashPassword, verifyPassword } from '../../lib/crypto.js';
import { ApiError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { writeAudit } from '../audit/service.js';
import {
  issuePasswordResetToken,
  recordFailedPassword,
  revokeUserSessions,
  toPublicUser,
} from '../auth/service.js';
import { can, requirePermission } from '../permissions/service.js';
import {
  assertNotLastAdmin,
  assertUnique,
  findAnyUser,
  ownsLiveProjects,
  requireLiveUser,
  setRoles,
  toAuditEntry,
  toSummary,
  userIdsWithRole,
  userRoleIds,
} from './service.js';

const IdParams = z.object({ id: z.string().min(1).max(64) });
const SORT_COLUMNS = {
  username: users.username,
  displayName: users.displayName,
  email: users.email,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
} satisfies Record<(typeof USER_SORT_FIELDS)[number], unknown>;

function parseSort(sort: string | undefined, allowed: readonly string[]): SQL {
  if (!sort) return asc(users.createdAt);
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  if (!allowed.includes(field) || !(field in SORT_COLUMNS))
    throw new ApiError('VALIDATION_FAILED', 'Request validation failed', [
      { path: 'sort', message: `sort must be one of ${allowed.join(', ')}` },
    ]);
  const col = SORT_COLUMNS[field as keyof typeof SORT_COLUMNS];
  return descending ? desc(col) : asc(col);
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Spec §5.2 user management (plan §6.3). */
export const usersRoutes: FastifyPluginAsync = async (app) => {
  const db = app.db;

  app.get('/', { config: { permission: 'users.read' } }, async (req) => {
    const q = UserListQuery.parse(req.query);
    // Callers without users.manage must not be able to probe emails, statuses or roles (PR #4 review):
    // q matches only username/displayName, sort is limited, only active users are listed, and the
    // role filter is rejected.
    const manager = can(req.auth!.publicUser, 'users.manage');
    if (!manager && q.role)
      throw new ApiError('VALIDATION_FAILED', 'Request validation failed', [
        { path: 'role', message: 'role filter requires users.manage' },
      ]);
    const conds: SQL[] = [isNull(users.deletedAt)];
    if (!manager) conds.push(eq(users.status, 'active'));
    else if (q.status) conds.push(eq(users.status, q.status));
    if (q.role) conds.push(inArray(users.id, userIdsWithRole(db, q.role)));
    if (q.q) {
      const pat = `%${escapeLike(q.q.toLowerCase())}%`;
      const fields = [
        sql`${users.username} like ${pat} escape '\\'`,
        sql`lower(${users.displayName}) like ${pat} escape '\\'`,
      ];
      if (manager) fields.push(sql`${users.email} like ${pat} escape '\\'`);
      conds.push(or(...fields)!);
    }
    const where = and(...conds);
    const order = parseSort(q.sort, manager ? USER_SORT_FIELDS : USER_SORT_FIELDS_PUBLIC);
    const total =
      db
        .select({ n: sql<number>`count(*)` })
        .from(users)
        .where(where)
        .get()?.n ?? 0;
    const rows = db
      .select()
      .from(users)
      .where(where)
      .orderBy(order, asc(users.id))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .all();
    const full = manager;
    return {
      data: rows.map((u) => (full ? toPublicUser(db, u) : toSummary(u))),
      meta: { page: q.page, pageSize: q.pageSize, total },
    };
  });

  app.post('/', { config: { permission: 'users.manage' } }, async (req, reply) => {
    const body = CreateUserRequest.parse(req.body);
    const username = body.username.toLowerCase();
    const email = body.email.toLowerCase();
    assertUnique(db, { username, email });
    const passwordHash = await hashPassword(body.password);
    const actor = req.auth!.user.id;
    const id = newId();
    db.transaction((tx) => {
      assertUnique(tx, { username, email }); // re-check after the async hash
      tx.insert(users)
        .values({
          id,
          username,
          email,
          displayName: body.displayName,
          passwordHash,
          passwordChangedAt: new Date(),
        })
        .run();
      setRoles(tx, id, body.roles, actor);
      writeAudit(tx, {
        actorId: actor,
        action: 'user.create',
        outcome: 'success',
        targetType: 'user',
        targetId: id,
        ip: req.ip,
        metadata: { roles: body.roles },
      });
    });
    return reply.status(201).send({ data: toPublicUser(db, requireLiveUser(db, id)) });
  });

  app.get(
    '/:id',
    { config: { auth: true }, preHandler: requirePermission('users.read', { allowSelf: true }) },
    async (req) => {
      const { id } = IdParams.parse(req.params);
      const u = requireLiveUser(db, id);
      const me = req.auth!.publicUser;
      if (me.id === id) return { data: me }; // already built by the session preHandler
      return { data: can(me, 'users.manage') ? toPublicUser(db, u) : toSummary(u) };
    },
  );

  app.patch('/:id', { config: { auth: true } }, async (req) => {
    const { id } = IdParams.parse(req.params);
    const body = UpdateUserRequest.parse(req.body);
    const me = req.auth!.publicUser;
    const manager = can(me, 'users.manage');
    if (!manager) {
      const selfFieldsOnly = Object.keys(body).every(
        (k) => k === 'displayName' || k === 'email' || k === 'currentPassword',
      );
      if (me.id !== id || !selfFieldsOnly)
        throw new ApiError('FORBIDDEN', 'Insufficient permissions');
    }
    const target = requireLiveUser(db, id);
    const email = body.email?.toLowerCase();
    // Re-authenticate before changing your own email (it's a login identifier; PR #4 review).
    if (me.id === id && email !== undefined && email !== target.email) {
      const ok =
        !!body.currentPassword && (await verifyPassword(body.currentPassword, target.passwordHash));
      if (!ok) {
        if (body.currentPassword) recordFailedPassword(db, id);
        throw new ApiError(
          'VALIDATION_FAILED',
          'Current password is required to change your email',
          [{ path: 'currentPassword', message: 'Current password is incorrect or missing' }],
        );
      }
    }

    db.transaction((tx) => {
      if (email && email !== target.email) assertUnique(tx, { email }, id);
      const currentRoles = userRoleIds(tx, id);
      const nextRoles: RoleName[] = body.roles ?? currentRoles;
      const nextActive = (body.status ?? target.status) === 'active';
      assertNotLastAdmin(tx, target, { roles: nextRoles, active: nextActive });

      const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
      if (body.displayName !== undefined) patch.displayName = body.displayName;
      if (email !== undefined) patch.email = email;
      if (body.status !== undefined) patch.status = body.status;
      tx.update(users).set(patch).where(eq(users.id, id)).run();
      if (body.roles) setRoles(tx, id, body.roles, me.id);

      const disabling = body.status === 'disabled' && target.status !== 'disabled';
      if (disabling) revokeUserSessions(tx, id, 'user_disabled');
      writeAudit(tx, {
        actorId: me.id,
        action: disabling ? 'user.disable' : 'user.update',
        outcome: 'success',
        targetType: 'user',
        targetId: id,
        ip: req.ip,
        metadata: {
          fields: Object.keys(body).filter((k) => k !== 'currentPassword'),
          ...(body.roles ? { rolesBefore: currentRoles, rolesAfter: body.roles } : {}),
        },
      });
    });
    return { data: toPublicUser(db, requireLiveUser(db, id)) };
  });

  app.delete('/:id', { config: { permission: 'users.manage' } }, async (req, reply) => {
    const { id } = IdParams.parse(req.params);
    const me = req.auth!.user.id;
    if (id === me) throw new ApiError('CONFLICT', 'You cannot delete your own account');
    db.transaction((tx) => {
      const target = requireLiveUser(tx, id);
      assertNotLastAdmin(tx, target, { roles: [], active: false });
      if (ownsLiveProjects(tx, id))
        throw new ApiError('CONFLICT', 'User still owns projects; transfer them first');
      const now = new Date();
      tx.update(users)
        .set({ deletedAt: now, status: 'disabled', updatedAt: now })
        .where(eq(users.id, id))
        .run();
      revokeUserSessions(tx, id, 'user_deleted');
      writeAudit(tx, {
        actorId: me,
        action: 'user.delete',
        outcome: 'success',
        targetType: 'user',
        targetId: id,
        ip: req.ip,
      });
    });
    return reply.status(204).send();
  });

  app.post(
    '/:id/password-reset',
    { config: { permission: 'users.manage' } },
    async (req, reply) => {
      const { id } = IdParams.parse(req.params);
      requireLiveUser(db, id);
      const me = req.auth!.user.id;
      const issued = db.transaction((tx) => {
        const t = issuePasswordResetToken(tx, id, me);
        writeAudit(tx, {
          actorId: me,
          action: 'user.password_reset_issue',
          outcome: 'success',
          targetType: 'user',
          targetId: id,
          ip: req.ip,
        });
        return t;
      });
      return reply
        .status(201)
        .header('cache-control', 'no-store')
        .send({ data: { token: issued.token, expiresAt: issued.expiresAt.toISOString() } });
    },
  );

  app.get(
    '/:id/activity',
    { config: { auth: true }, preHandler: requirePermission(['users.manage', 'audit.read']) },
    async (req) => {
      const { id } = IdParams.parse(req.params);
      const q = PageQuery.pick({ page: true, pageSize: true }).parse(req.query);
      // Deleted users' activity stays readable (users.manage / audit.read).
      if (!findAnyUser(db, id)) throw new ApiError('NOT_FOUND', 'User not found');
      // Actor side and target side (spec §5.2 "view user activity"; Tech Lead ruling on PR #4).
      const where = or(
        eq(auditLogs.actorId, id),
        and(eq(auditLogs.targetType, 'user'), eq(auditLogs.targetId, id)),
      );
      const total =
        db
          .select({ n: sql<number>`count(*)` })
          .from(auditLogs)
          .where(where)
          .get()?.n ?? 0;
      const rows = db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt), sql`rowid desc`)
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize)
        .all();
      return {
        data: rows.map((r) => ({
          ...toAuditEntry(r),
          relation: r.actorId === id ? ('actor' as const) : ('target' as const),
        })),
        meta: { page: q.page, pageSize: q.pageSize, total },
      };
    },
  );
};
