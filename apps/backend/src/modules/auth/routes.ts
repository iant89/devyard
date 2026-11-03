import {
  BootstrapRequest,
  ChangePasswordRequest,
  LoginRequest,
  PasswordResetConfirmRequest,
  type AuthState,
} from '@devyard/contracts';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { passwordResetTokens, userRoles, users } from '../../db/schema.js';
import { hashPassword, sha256, verifyPassword } from '../../lib/crypto.js';
import { ApiError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { writeAudit } from '../audit/service.js';
import { clearSessionCookie, setSessionCookie } from './plugin.js';
import {
  countUsers,
  createSession,
  csrfTokenFor,
  findUserByLogin,
  listLiveSessions,
  isLocked,
  recordFailedPassword,
  revokeSession,
  revokeUserSessions,
  toPublicUser,
  toSessionInfo,
  type SessionRow,
  type UserRow,
} from './service.js';

const GENERIC_LOGIN_FAILURE = 'Invalid credentials';

const meta = (req: FastifyRequest) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'] ?? null,
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Computed once at startup: equalises timing for unknown, disabled and locked accounts (plan §5.7).
  const dummyHash = await hashPassword('devyard-dummy-password');
  const authState = (user: UserRow, session: SessionRow): AuthState => ({
    user: toPublicUser(app.db, user),
    session: toSessionInfo(session, session.id),
    csrfToken: csrfTokenFor(session),
  });

  app.get('/bootstrap', async () => ({ data: { required: countUsers(app.db) === 0 } }));

  app.post(
    '/bootstrap',
    { config: { csrf: false, rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = BootstrapRequest.parse(req.body);
      if (countUsers(app.db) > 0) throw new ApiError('CONFLICT', 'Bootstrap already completed');
      const passwordHash = await hashPassword(body.password);
      const now = Date.now();
      // Synchronous transaction: the emptiness check and insert are atomic (plan §5.8).
      const result = app.db.transaction((tx) => {
        if (countUsers(tx) > 0) return null;
        const id = newId(now);
        tx.insert(users)
          .values({
            id,
            username: body.username.toLowerCase(),
            email: body.email.toLowerCase(),
            displayName: body.displayName,
            passwordHash,
            passwordChangedAt: new Date(now),
            lastLoginAt: new Date(now),
          })
          .run();
        tx.insert(userRoles).values({ userId: id, roleId: 'admin' }).run();
        const s = createSession(tx, app.config, id, meta(req), now);
        writeAudit(tx, {
          actorId: id,
          action: 'auth.bootstrap',
          outcome: 'success',
          targetType: 'user',
          targetId: id,
          ip: req.ip,
        });
        return s;
      });
      if (!result) throw new ApiError('CONFLICT', 'Bootstrap already completed');
      const user = app.db.select().from(users).where(eq(users.id, result.session.userId)).get()!;
      setSessionCookie(app, reply, result.token);
      return reply.status(201).send({ data: authState(user, result.session) });
    },
  );

  const lockoutOnFailure = (userId: string, ip: string, via: 'login' | 'password_change') => {
    if (recordFailedPassword(app.db, userId))
      writeAudit(app.db, {
        actorId: null,
        action: 'auth.lockout',
        outcome: 'success',
        targetType: 'user',
        targetId: userId,
        ip,
        metadata: { via },
      });
  };

  app.post(
    '/login',
    { config: { csrf: false, rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = LoginRequest.parse(req.body);
      const now = Date.now();
      const user = findUserByLogin(app.db, body.login);
      const fail = (reason: string, userId: string | null) => {
        writeAudit(app.db, {
          actorId: userId,
          action: 'auth.login',
          outcome: 'failure',
          targetType: 'user',
          targetId: userId,
          ip: req.ip,
          metadata: { reason },
        });
        return new ApiError('UNAUTHENTICATED', GENERIC_LOGIN_FAILURE);
      };

      // Unknown, disabled and locked accounts all pay for one verify so timing doesn't leak state.
      // Disabled accounts don't accumulate lockout failures (plan §5.7).
      if (!user || user.status !== 'active' || isLocked(user, now)) {
        await verifyPassword(body.password, dummyHash);
        if (!user) throw fail('unknown_user', null);
        throw fail(user.status !== 'active' ? 'disabled' : 'locked', user.id);
      }
      if (!(await verifyPassword(body.password, user.passwordHash))) {
        lockoutOnFailure(user.id, req.ip, 'login');
        throw fail('bad_password', user.id);
      }

      const s = app.db.transaction((tx) => {
        tx.update(users)
          .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(now) })
          .where(eq(users.id, user.id))
          .run();
        writeAudit(tx, {
          actorId: user.id,
          action: 'auth.login',
          outcome: 'success',
          targetType: 'user',
          targetId: user.id,
          ip: req.ip,
        });
        return createSession(tx, app.config, user.id, meta(req), now);
      });
      setSessionCookie(app, reply, s.token);
      const fresh = app.db.select().from(users).where(eq(users.id, user.id)).get()!;
      return { data: authState(fresh, s.session) };
    },
  );

  app.post('/logout', { config: { auth: true } }, async (req, reply) => {
    const { session, user } = req.auth!;
    revokeSession(app.db, user.id, session.id, 'logout');
    writeAudit(app.db, {
      actorId: user.id,
      action: 'auth.logout',
      outcome: 'success',
      targetType: 'session',
      targetId: session.id,
      ip: req.ip,
    });
    clearSessionCookie(app, reply);
    return reply.status(204).send();
  });

  app.get('/me', { config: { auth: true } }, async (req) => {
    const { user, session } = req.auth!;
    return { data: authState(user, session) };
  });

  app.post(
    '/password',
    {
      config: {
        auth: true,
        // 5/min per user (keyed after the session preHandler has resolved the caller).
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          hook: 'preHandler',
          keyGenerator: (req) => `pwchange:${req.auth?.user.id ?? req.ip}`,
        },
      },
    },
    async (req, reply) => {
      const body = ChangePasswordRequest.parse(req.body);
      const { user, session } = req.auth!;
      const locked = isLocked(user);
      const ok = locked
        ? (await verifyPassword(body.currentPassword, dummyHash), false)
        : await verifyPassword(body.currentPassword, user.passwordHash);
      if (!ok) {
        // Failures count toward the same lockout as login (plan §5.7).
        if (!locked) lockoutOnFailure(user.id, req.ip, 'password_change');
        writeAudit(app.db, {
          actorId: user.id,
          action: 'auth.password_change',
          outcome: 'failure',
          targetType: 'user',
          targetId: user.id,
          ip: req.ip,
          metadata: { reason: locked ? 'locked' : 'bad_password' },
        });
        throw new ApiError('VALIDATION_FAILED', 'Current password is incorrect', [
          { path: 'currentPassword', message: 'Current password is incorrect' },
        ]);
      }
      const passwordHash = await hashPassword(body.newPassword);
      const now = Date.now();
      const s = app.db.transaction((tx) => {
        tx.update(users)
          .set({
            passwordHash,
            passwordChangedAt: new Date(now),
            failedLoginCount: 0,
            updatedAt: new Date(now),
          })
          .where(eq(users.id, user.id))
          .run();
        // Rotation (plan §5.4): revoke everything including the current session, issue a new one.
        revokeUserSessions(tx, user.id, 'password_change', undefined, now);
        writeAudit(tx, {
          actorId: user.id,
          action: 'auth.password_change',
          outcome: 'success',
          targetType: 'user',
          targetId: user.id,
          ip: req.ip,
          metadata: { previousSession: session.id },
        });
        return createSession(tx, app.config, user.id, meta(req), now);
      });
      setSessionCookie(app, reply, s.token);
      return reply.status(204).send();
    },
  );

  app.post(
    '/password-reset/confirm',
    { config: { csrf: false, rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = PasswordResetConfirmRequest.parse(req.body);
      const tokenHash = sha256(body.token);
      const invalid = () => {
        writeAudit(app.db, {
          actorId: null,
          action: 'auth.password_reset',
          outcome: 'failure',
          ip: req.ip,
        });
        return new ApiError('VALIDATION_FAILED', 'Invalid or expired reset token', [
          { path: 'token', message: 'Invalid or expired reset token' },
        ]);
      };
      // Validate before paying for the hash, so junk tokens are cheap to reject.
      const live = app.db
        .select({ id: passwordResetTokens.id })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .get();
      if (!live) throw invalid();
      const passwordHash = await hashPassword(body.newPassword);
      const now = Date.now();
      const result = app.db.transaction((tx) => {
        // Conditional consume: only one concurrent confirm can flip used_at.
        const t = tx
          .update(passwordResetTokens)
          .set({ usedAt: new Date(now) })
          .where(
            and(
              eq(passwordResetTokens.id, live.id),
              isNull(passwordResetTokens.usedAt),
              gt(passwordResetTokens.expiresAt, new Date(now)),
            ),
          )
          .returning({ userId: passwordResetTokens.userId, issuedBy: passwordResetTokens.issuedBy })
          .get();
        if (!t) return null;
        tx.update(users)
          .set({
            passwordHash,
            passwordChangedAt: new Date(now),
            failedLoginCount: 0,
            lockedUntil: null,
            updatedAt: new Date(now),
          })
          .where(eq(users.id, t.userId))
          .run();
        revokeUserSessions(tx, t.userId, 'password_reset', undefined, now);
        writeAudit(tx, {
          actorId: t.userId,
          action: 'auth.password_reset',
          outcome: 'success',
          targetType: 'user',
          targetId: t.userId,
          ip: req.ip,
          metadata: { issuedBy: t.issuedBy },
        });
        return t;
      });
      if (!result) throw invalid();
      return reply.status(204).send();
    },
  );

  app.get('/sessions', { config: { auth: true } }, async (req) => {
    const { user, session } = req.auth!;
    return {
      data: listLiveSessions(app.db, app.config, user.id).map((s) => toSessionInfo(s, session.id)),
    };
  });

  app.delete('/sessions/:id', { config: { auth: true } }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1).max(64) }).parse(req.params);
    const { user, session } = req.auth!;
    if (!revokeSession(app.db, user.id, id, 'user_revoked'))
      throw new ApiError('NOT_FOUND', 'Session not found');
    writeAudit(app.db, {
      actorId: user.id,
      action: 'auth.session_revoke',
      outcome: 'success',
      targetType: 'session',
      targetId: id,
      ip: req.ip,
    });
    if (id === session.id) clearSessionCookie(app, reply);
    return reply.status(204).send();
  });

  app.delete('/sessions', { config: { auth: true } }, async (req, reply) => {
    const { user, session } = req.auth!;
    const n = revokeUserSessions(app.db, user.id, 'user_revoked_others', session.id);
    writeAudit(app.db, {
      actorId: user.id,
      action: 'auth.session_revoke_others',
      outcome: 'success',
      targetType: 'user',
      targetId: user.id,
      ip: req.ip,
      metadata: { revoked: n },
    });
    return reply.status(204).send();
  });
};
