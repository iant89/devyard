import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './client';

const authState = {
  user: {
    id: 'u1',
    username: 'ian',
    email: 'ian@devyard.local',
    displayName: 'Ian Thomas',
    status: 'active',
    roles: ['admin'],
    permissions: ['admin.access'],
    createdAt: '2026-11-01T00:00:00.000Z',
    lastLoginAt: null,
  },
  session: {
    id: 's1',
    createdAt: '2026-11-01T00:00:00.000Z',
    lastSeenAt: '2026-11-01T00:00:00.000Z',
    expiresAt: '2026-11-08T00:00:00.000Z',
    userAgent: null,
    ip: null,
    current: true,
  },
  csrfToken: 'csrf-123',
};

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ApiClient', () => {
  it('logs in, stores the CSRF token and sends it on unsafe requests', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(200, { data: authState }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = new ApiClient({ fetch });

    const state = await api.login({ login: 'ian', password: 'pw' });
    expect(state.user.displayName).toBe('Ian Thomas');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/v1/auth/login');
    expect(init?.credentials).toBe('same-origin');

    await api.logout();
    const headers = fetch.mock.calls[1]![1]!.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe('csrf-123');
  });

  it('does not send a CSRF header on GET', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json(200, { data: { required: true } }));
    const api = new ApiClient({ fetch });
    api.setCsrfToken('t');
    expect(await api.bootstrapStatus()).toEqual({ required: true });
    expect(
      (fetch.mock.calls[0]![1]!.headers as Record<string, string>)['X-CSRF-Token'],
    ).toBeUndefined();
  });

  it('auth endpoints do not signal session expiry on 401, but clear the CSRF token', async () => {
    const onUnauthenticated = vi.fn();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(200, { data: authState }))
      .mockResolvedValueOnce(
        json(401, { error: { code: 'UNAUTHENTICATED', message: 'x', requestId: 'r' } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = new ApiClient({ fetch, onUnauthenticated });
    await api.login({ login: 'ian', password: 'pw' });
    await api.login({ login: 'ian', password: 'bad' }).catch(() => undefined);
    expect(onUnauthenticated).not.toHaveBeenCalled();
    await api.logout();
    expect(
      (fetch.mock.calls[2]![1]!.headers as Record<string, string>)['X-CSRF-Token'],
    ).toBeUndefined();
  });

  it('maps structured errors and signals 401 on non-auth endpoints', async () => {
    const onUnauthenticated = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      json(401, {
        error: { code: 'UNAUTHENTICATED', message: 'Invalid credentials', requestId: 'r1' },
      }),
    );
    const api = new ApiClient({ fetch, onUnauthenticated });
    const err = await api.sessions().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('UNAUTHENTICATED');
    expect((err as ApiError).requestId).toBe('r1');
    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it('rejects responses that do not match the contract', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json(200, { data: { user: {} } }));
    const err = await new ApiClient({ fetch }).me().catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('BAD_RESPONSE');
  });

  it('reports network failures', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('offline'));
    const err = await new ApiClient({ fetch }).me().catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('NETWORK');
  });
});
