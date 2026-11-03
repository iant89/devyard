import { AuthState, ErrorResponse, SessionInfo } from '@devyard/contracts';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLogs, sessions, users } from '../../src/db/schema.js';
import { sha256 } from '../../src/lib/crypto.js';
import { issuePasswordResetToken, purgeExpired } from '../../src/modules/auth/service.js';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import { TEST_ORIGIN, testApp, TRUST_LOCAL_PROXY, withDefaultOrigin } from '../helpers.js';
import { ADMIN, bootstrap, freshIp, login, sessionCookie } from './fixtures.js';

const me = (app: FastifyInstance, cookie: string) =>
  app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });

describe('auth: bootstrap', () => {
  let app: FastifyInstance;
  beforeEach(async () => (app = await testApp(TRUST_LOCAL_PROXY)));
  afterEach(async () => app.close());

  it('reports required until the first user exists, then works only once', async () => {
    let res = await app.inject({ method: 'GET', url: '/api/v1/auth/bootstrap' });
    expect(res.json()).toEqual({ data: { required: true } });

    const a = await bootstrap(app);
    expect(AuthState.parse(a.body.data).user.roles).toEqual(['admin']);
    expect(a.body.data.user).not.toHaveProperty('passwordHash');

    res = await app.inject({ method: 'GET', url: '/api/v1/auth/bootstrap' });
    expect(res.json()).toEqual({ data: { required: false } });

    res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/bootstrap',
      payload: { ...ADMIN, username: 'second', email: 'second@example.com' },
    });
    expect(res.statusCode).toBe(409);
    expect(ErrorResponse.parse(res.json()).error.code).toBe('CONFLICT');
  });

  it('concurrent bootstraps: exactly one succeeds', async () => {
    const results = await Promise.all(
      [1, 2, 3].map((n) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/auth/bootstrap',
          payload: { ...ADMIN, username: `admin${n}`, email: `a${n}@example.com` },
        }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
  });

  it('validates input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/bootstrap',
      payload: { ...ADMIN, password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_FAILED');
  });
});

describe('auth: cookies and token storage', () => {
  let app: FastifyInstance;
  beforeEach(async () => (app = await testApp(TRUST_LOCAL_PROXY)));
  afterEach(async () => app.close());

  it('sets HttpOnly, SameSite=Lax, Path=/ and no Domain; not Secure in test', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/bootstrap', payload: ADMIN });
    const raw = String(res.headers['set-cookie']);
    expect(raw).toMatch(/^dy_session=/);
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);
    expect(raw).toMatch(/Path=\//);
    expect(raw).not.toMatch(/Domain=/i);
    expect(raw).not.toMatch(/Secure/i);
  });

  it('uses Secure + __Host- prefix in production', async () => {
    const prod = await buildApp(
      loadConfig({
        NODE_ENV: 'production',
        DEVYARD_DB_PATH: ':memory:',
        DEVYARD_LOG_LEVEL: 'silent',
        DEVYARD_PUBLIC_ORIGINS: TEST_ORIGIN,
      }),
    );
    withDefaultOrigin(prod);
    try {
      const res = await prod.inject({
        method: 'POST',
        url: '/api/v1/auth/bootstrap',
        payload: ADMIN,
      });
      expect(res.statusCode).toBe(201);
      const raw = String(res.headers['set-cookie']);
      expect(raw).toMatch(/^__Host-dy_session=/);
      expect(raw).toMatch(/; Secure/i);
      expect(raw).toMatch(/HttpOnly/i);
      // and the prefixed cookie authenticates
      const m = await me(prod, sessionCookie(res));
      expect(m.statusCode).toBe(200);
    } finally {
      await prod.close();
    }
  });

  it('stores only the sha256 of the session token', async () => {
    const a = await bootstrap(app);
    const token = a.cookie.split('=')[1]!;
    const rows = app.db.select().from(sessions).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(sha256(token));
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(rows[0]!.id).toBe(a.body.data.session.id);
  });
});

describe('auth: login / me / logout', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    await bootstrap(app);
  });
  afterEach(async () => app.close());

  it('logs in by username or email (case-insensitive) and returns AuthState', async () => {
    const a = await login(app, 'ADMIN@example.com');
    const res = await me(app, a.cookie);
    expect(res.statusCode).toBe(200);
    const state = AuthState.parse(res.json().data);
    expect(state.user.username).toBe('admin');
    expect(state.user.permissions).toContain('users.manage');
    expect(state.session.current).toBe(true);
    expect(state.csrfToken).toBe(a.csrf);
    const u = app.db.select().from(users).get()!;
    expect(u.lastLoginAt).toBeTruthy();
  });

  it('wrong password and unknown user both give the same generic 401', async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admin', password: 'wrong password!!' },
      headers: { 'x-forwarded-for': freshIp() },
    });
    const r2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'nobody', password: 'wrong password!!' },
      headers: { 'x-forwarded-for': freshIp() },
    });
    expect(r1.statusCode).toBe(401);
    expect(r2.statusCode).toBe(401);
    expect(r1.json().error.message).toBe(r2.json().error.message);
    expect(r1.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('unauthenticated /me is 401', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/me' })).statusCode).toBe(401);
    expect((await me(app, 'dy_session=garbage')).statusCode).toBe(401);
  });

  it('logout revokes the session and clears the cookie', async () => {
    const a = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: a.cookie, 'x-csrf-token': a.csrf },
    });
    expect(res.statusCode).toBe(204);
    expect(String(res.headers['set-cookie'])).toMatch(/dy_session=;.*Expires=Thu, 01 Jan 1970/i);
    expect((await me(app, a.cookie)).statusCode).toBe(401);
  });

  it('audits login success and failure', async () => {
    await login(app);
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admin', password: 'nope nope nope' },
      headers: { 'x-forwarded-for': freshIp() },
    });
    const rows = app.db.select().from(auditLogs).where(eq(auditLogs.action, 'auth.login')).all();
    expect(rows.map((r) => r.outcome).sort()).toEqual(['failure', 'success']);
    const boot = app.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'auth.bootstrap'))
      .all();
    expect(boot).toHaveLength(1);
  });
});

describe('auth: session expiry and revocation', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    await bootstrap(app);
  });
  afterEach(async () => app.close());

  it('absolute-expired session returns 401', async () => {
    const a = await login(app);
    app.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, a.body.data.session.id))
      .run();
    expect((await me(app, a.cookie)).statusCode).toBe(401);
  });

  it('idle-expired session returns 401', async () => {
    const a = await login(app);
    app.db
      .update(sessions)
      .set({ lastSeenAt: new Date(Date.now() - app.config.sessionIdleMs - 1000) })
      .where(eq(sessions.id, a.body.data.session.id))
      .run();
    expect((await me(app, a.cookie)).statusCode).toBe(401);
  });

  it('revoked session returns 401; sessions list + revoke one + revoke others', async () => {
    const a = await login(app);
    const b = await login(app);
    const c = await login(app);
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/sessions',
      headers: { cookie: a.cookie },
    });
    const data = list.json().data.map((s: unknown) => SessionInfo.parse(s));
    expect(data.length).toBe(4); // bootstrap + 3 logins
    expect(data.filter((s: SessionInfo) => s.current)).toHaveLength(1);

    let res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/auth/sessions/${b.body.data.session.id}`,
      headers: { cookie: a.cookie, 'x-csrf-token': a.csrf },
    });
    expect(res.statusCode).toBe(204);
    expect((await me(app, b.cookie)).statusCode).toBe(401);
    expect((await me(app, c.cookie)).statusCode).toBe(200);

    res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/sessions',
      headers: { cookie: a.cookie, 'x-csrf-token': a.csrf },
    });
    expect(res.statusCode).toBe(204);
    expect((await me(app, c.cookie)).statusCode).toBe(401);
    expect((await me(app, a.cookie)).statusCode).toBe(200);
  });

  it("cannot revoke another user's session (404)", async () => {
    const a = await login(app);
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/sessions/does-not-exist',
      headers: { cookie: a.cookie, 'x-csrf-token': a.csrf },
    });
    expect(res.statusCode).toBe(404);
  });

  it('disabled user sessions return 401', async () => {
    const a = await login(app);
    app.db.update(users).set({ status: 'disabled' }).run();
    expect((await me(app, a.cookie)).statusCode).toBe(401);
  });

  it('purge removes expired, idle and revoked sessions only', async () => {
    const a = await login(app);
    const b = await login(app);
    app.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1) })
      .where(eq(sessions.id, b.body.data.session.id))
      .run();
    const removed = purgeExpired(app.db, app.config);
    expect(removed.sessions).toBe(1);
    expect((await me(app, a.cookie)).statusCode).toBe(200);
  });
});

describe('auth: CSRF', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    await bootstrap(app);
  });
  afterEach(async () => app.close());

  it('missing or wrong X-CSRF-Token on an unsafe method returns 403 CSRF_FAILED', async () => {
    const a = await login(app);
    for (const headers of [{ cookie: a.cookie }, { cookie: a.cookie, 'x-csrf-token': 'wrong' }]) {
      const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('CSRF_FAILED');
    }
    expect((await me(app, a.cookie)).statusCode).toBe(200);
  });

  it("another session's CSRF token is rejected", async () => {
    const a = await login(app);
    const b = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: a.cookie, 'x-csrf-token': b.csrf },
    });
    expect(res.statusCode).toBe(403);
  });

  const loginWith = (headers: Record<string, string | null>) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admin', password: ADMIN.password },
      headers: { 'x-forwarded-for': freshIp(), ...headers },
    });

  it('unsafe requests need an allow-listed Origin (exact scheme, host and port), even on login', async () => {
    for (const origin of [
      'https://evil.example',
      'https://localhost', // wrong scheme
      'http://localhost:8080', // wrong port
      'http://localhost.evil.example',
      'null',
    ]) {
      const res = await loginWith({ origin });
      expect(res.statusCode, origin).toBe(403);
      expect(res.json().error.code).toBe('CSRF_FAILED');
    }
    expect((await loginWith({ origin: TEST_ORIGIN })).statusCode).toBe(200);
  });

  it('falls back to Referer when Origin is absent; rejects when both are missing', async () => {
    expect(
      (await loginWith({ origin: null, referer: `${TEST_ORIGIN}/login?x=1` })).statusCode,
    ).toBe(200);
    expect(
      (await loginWith({ origin: null, referer: 'https://evil.example/login' })).statusCode,
    ).toBe(403);
    expect((await loginWith({ origin: null, referer: 'not a url' })).statusCode).toBe(403);
    const none = await loginWith({ origin: null });
    expect(none.statusCode).toBe(403);
    expect(none.json().error.code).toBe('CSRF_FAILED');
  });

  it('safe methods do not need an Origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/bootstrap',
      // testApp's inject wrapper treats `origin: null` as "send no Origin header"
      headers: { origin: null } as unknown as Record<string, string>,
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('auth: brute force', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    await bootstrap(app);
  });
  afterEach(async () => app.close());

  const bad = (ip: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admin', password: 'definitely wrong' },
      headers: { 'x-forwarded-for': ip },
    });

  it('11th bad login from one IP is rate limited (429)', async () => {
    const ip = freshIp();
    for (let i = 0; i < 10; i++) expect((await bad(ip)).statusCode).toBe(401);
    const res = await bad(ip);
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('10 failures lock the account even across IPs; correct password then fails', async () => {
    for (let i = 0; i < 10; i++) expect((await bad(freshIp())).statusCode).toBe(401);
    const u = app.db.select().from(users).get()!;
    expect(u.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admin', password: ADMIN.password },
      headers: { 'x-forwarded-for': freshIp() },
    });
    expect(res.statusCode).toBe(401);
    // after the lock expires, login works and the counter resets
    app.db
      .update(users)
      .set({ lockedUntil: new Date(Date.now() - 1) })
      .run();
    await login(app);
    expect(app.db.select().from(users).get()!.failedLoginCount).toBe(0);
    const lock = app.db.select().from(auditLogs).where(eq(auditLogs.action, 'auth.lockout')).all();
    expect(lock).toHaveLength(1);
  });
});

describe('auth: password change and reset', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    await bootstrap(app);
  });
  afterEach(async () => app.close());

  it('password change rotates the current session and revokes the others', async () => {
    const a = await login(app);
    const other = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password',
      payload: { currentPassword: ADMIN.password, newPassword: 'a brand new password' },
      headers: { cookie: a.cookie, 'x-csrf-token': a.csrf },
    });
    expect(res.statusCode).toBe(204);
    const rotated = sessionCookie(res);
    expect(rotated).not.toBe(a.cookie);
    expect((await me(app, other.cookie)).statusCode).toBe(401);
    expect((await me(app, a.cookie)).statusCode).toBe(401);
    expect((await me(app, rotated)).statusCode).toBe(200);
    await login(app, 'admin', 'a brand new password');
  });

  it('password change with wrong current password fails and changes nothing', async () => {
    const a = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password',
      payload: { currentPassword: 'not my password', newPassword: 'a brand new password' },
      headers: { cookie: a.cookie, 'x-csrf-token': a.csrf },
    });
    expect(res.statusCode).toBe(400);
    expect((await me(app, a.cookie)).statusCode).toBe(200);
  });

  it('reset confirm is single use and revokes all sessions', async () => {
    const a = await login(app);
    const userId = a.body.data.user.id;
    const { token } = issuePasswordResetToken(app.db, userId, userId);
    const confirm = () =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        payload: { token, newPassword: 'reset password value' },
      });
    expect((await confirm()).statusCode).toBe(204);
    expect((await me(app, a.cookie)).statusCode).toBe(401);
    await login(app, 'admin', 'reset password value');
    const again = await confirm();
    expect(again.statusCode).toBe(400);
  });

  it('expired reset token is rejected', async () => {
    const userId = app.db.select().from(users).get()!.id;
    const { token } = issuePasswordResetToken(app.db, userId, null, -1000);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword: 'reset password value' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('auth: proxy trust', () => {
  it('without DEVYARD_TRUST_PROXY a spoofed X-Forwarded-For gets no new rate bucket', async () => {
    const app = await testApp();
    try {
      await bootstrap(app);
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { login: 'nobody', password: 'wrong password!!' },
          headers: { 'x-forwarded-for': freshIp() },
        });
        expect(res.statusCode).toBe(401);
      }
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: 'admin', password: ADMIN.password },
        headers: { 'x-forwarded-for': freshIp() },
      });
      expect(res.statusCode).toBe(429);
      const ips = app.db
        .select({ ip: auditLogs.ip })
        .from(auditLogs)
        .where(eq(auditLogs.action, 'auth.login'))
        .all();
      expect(new Set(ips.map((r) => r.ip))).toEqual(new Set(['127.0.0.1']));
    } finally {
      await app.close();
    }
  });
});

describe('auth: hardening', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    await bootstrap(app);
  });
  afterEach(async () => app.close());

  const badLogin = () =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admin', password: 'definitely wrong' },
      headers: { 'x-forwarded-for': freshIp() },
    });

  it('parallel bad logins: every failure is counted and the account locks exactly once', async () => {
    const results = await Promise.all(Array.from({ length: 15 }, badLogin));
    expect(results.every((r) => r.statusCode === 401)).toBe(true);
    const u = app.db.select().from(users).get()!;
    expect(u.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    const locks = app.db.select().from(auditLogs).where(eq(auditLogs.action, 'auth.lockout')).all();
    expect(locks).toHaveLength(1);
  });

  it('parallel failures below the threshold are not lost (atomic increment)', async () => {
    await Promise.all(Array.from({ length: 7 }, badLogin));
    expect(app.db.select().from(users).get()!.failedLoginCount).toBe(7);
  });

  it('disabled accounts do not accumulate lockout failures', async () => {
    app.db.update(users).set({ status: 'disabled' }).run();
    for (let i = 0; i < 3; i++) expect((await badLogin()).statusCode).toBe(401);
    expect(app.db.select().from(users).get()!.failedLoginCount).toBe(0);
  });

  it('POST /auth/password: failures count toward lockout; 5/min per user', async () => {
    const a = await login(app);
    const change = (as: { cookie: string; csrf: string }) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/password',
        payload: { currentPassword: 'wrong wrong wrong', newPassword: 'another password 1' },
        headers: { cookie: as.cookie, 'x-csrf-token': as.csrf, 'x-forwarded-for': freshIp() },
      });
    for (let i = 0; i < 5; i++) expect((await change(a)).statusCode).toBe(400);
    expect(app.db.select().from(users).get()!.failedLoginCount).toBe(5);
    // 6th from the same user is limited, even from a fresh session and IP
    const b = await login(app);
    const res = await change(b);
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('reset confirm: concurrent redemptions of one token → exactly one succeeds', async () => {
    const userId = app.db.select().from(users).get()!.id;
    const { token } = issuePasswordResetToken(app.db, userId, null);
    const results = await Promise.all(
      [1, 2, 3].map((n) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/auth/password-reset/confirm',
          payload: { token, newPassword: `parallel password ${n}` },
          headers: { 'x-forwarded-for': freshIp() },
        }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([204, 400, 400]);
  });

  it('reset confirm: an unknown token is rejected before the new password is hashed', async () => {
    // With an impossible scrypt cost, any hashPassword call would throw (500). Validation must come first.
    const { configureScrypt } = await import('../../src/lib/crypto.js');
    configureScrypt({ N: 2 ** 22 });
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        payload: { token: 'x'.repeat(43), newPassword: 'reset password value' },
      });
      expect(res.statusCode).toBe(400);
    } finally {
      configureScrypt({ N: app.config.scryptN });
    }
  });

  it('bootstrap is rate limited per IP', async () => {
    const ip = freshIp();
    const codes: number[] = [];
    for (let i = 0; i < 6; i++)
      codes.push(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/auth/bootstrap',
            payload: ADMIN,
            headers: { 'x-forwarded-for': ip },
          })
        ).statusCode,
      );
    expect(codes).toEqual([409, 409, 409, 409, 409, 429]);
  });
});

describe('config hardening', () => {
  const prod = {
    NODE_ENV: 'production',
    DEVYARD_DB_PATH: ':memory:',
    DEVYARD_PUBLIC_ORIGINS: 'https://devyard.example',
  };
  it('production refuses DEVYARD_COOKIE_SECURE=false', () => {
    expect(() => loadConfig({ ...prod, DEVYARD_COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
    expect(loadConfig(prod).cookieSecure).toBe(true);
  });
  it('production requires DEVYARD_PUBLIC_ORIGINS; origins must be exact', () => {
    expect(() => loadConfig({ ...prod, DEVYARD_PUBLIC_ORIGINS: '' })).toThrow(/PUBLIC_ORIGINS/);
    expect(() =>
      loadConfig({ ...prod, DEVYARD_PUBLIC_ORIGINS: 'https://x.example/app' }),
    ).toThrow();
    expect(() => loadConfig({ ...prod, DEVYARD_PUBLIC_ORIGINS: 'ftp://x.example' })).toThrow();
    expect(
      loadConfig({ ...prod, DEVYARD_PUBLIC_ORIGINS: 'https://a.example, https://b.example:8443' })
        .publicOrigins,
    ).toEqual(['https://a.example', 'https://b.example:8443']);
  });
  it('DEVYARD_TRUST_PROXY is off by default and accepts IPs/CIDRs only', () => {
    expect(loadConfig(prod).trustProxy).toBe(false);
    expect(
      loadConfig({ ...prod, DEVYARD_TRUST_PROXY: '127.0.0.1, 10.0.0.0/8, ::1' }).trustProxy,
    ).toEqual(['127.0.0.1', '10.0.0.0/8', '::1']);
    expect(() => loadConfig({ ...prod, DEVYARD_TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY/);
    expect(() => loadConfig({ ...prod, DEVYARD_TRUST_PROXY: '10.0.0.0/99' })).toThrow();
  });
  it('DEVYARD_SCRYPT_N is honoured only when NODE_ENV=test', () => {
    expect(loadConfig({ ...prod, DEVYARD_SCRYPT_N: '1024' }).scryptN).toBeUndefined();
    expect(
      loadConfig({ NODE_ENV: 'development', DEVYARD_SCRYPT_N: '1024' }).scryptN,
    ).toBeUndefined();
    expect(loadConfig({ NODE_ENV: 'test', DEVYARD_SCRYPT_N: '1024' }).scryptN).toBe(1024);
  });
});
