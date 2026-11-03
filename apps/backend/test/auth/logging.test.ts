import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import { issuePasswordResetToken } from '../../src/modules/auth/service.js';
import { ADMIN, freshIp } from './fixtures.js';

describe('auth: no secrets in logs', () => {
  it('passwords, session tokens, CSRF tokens and reset tokens never reach the log stream', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const app = await buildApp(
      loadConfig({ NODE_ENV: 'test', DEVYARD_DB_PATH: ':memory:', DEVYARD_LOG_LEVEL: 'trace' }),
      { logStream: stream },
    );
    const secrets: string[] = [ADMIN.password];
    try {
      const boot = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/bootstrap',
        payload: ADMIN,
      });
      const cookie = boot.cookies.find((c) => c.name.endsWith('dy_session'))!;
      const csrf = boot.json().data.csrfToken as string;
      secrets.push(cookie.value, csrf);
      const headers = { cookie: `${cookie.name}=${cookie.value}`, 'x-csrf-token': csrf };
      await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: 'admin', password: 'wrong secret pw 123' },
        headers: { 'x-forwarded-for': freshIp() },
      });
      secrets.push('wrong secret pw 123');
      const { token } = issuePasswordResetToken(app.db, boot.json().data.user.id, null);
      secrets.push(token, 'new secret password 9');
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        payload: { token, newPassword: 'new secret password 9' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password',
        payload: { currentPassword: 'x', newPassword: 'whatever pw 12345' },
        headers: { ...headers, authorization: 'Bearer sekrit-bearer' },
      });
      secrets.push('whatever pw 12345', 'sekrit-bearer');
    } finally {
      await app.close();
    }
    const log = lines.join('');
    expect(log.length).toBeGreaterThan(0);
    expect(log).toContain('"url":"/api/v1/auth/login"');
    for (const s of secrets) expect(log).not.toContain(s);
  });
});
