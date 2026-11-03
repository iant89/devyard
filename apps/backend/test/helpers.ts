import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildOptions } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';

/** Allow-listed origin in test config (DEVYARD_PUBLIC_ORIGINS default for NODE_ENV=test). */
export const TEST_ORIGIN = 'http://localhost';

export function testConfig(env: Record<string, string> = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    DEVYARD_DB_PATH: ':memory:',
    DEVYARD_LOG_LEVEL: 'silent',
    DEVYARD_SCRYPT_N: '1024', // test-only knob; production cost is 2^16
    ...env,
  });
}

/** Tests that rotate X-Forwarded-For to get separate rate-limit buckets must opt in to this. */
export const TRUST_LOCAL_PROXY = { DEVYARD_TRUST_PROXY: '127.0.0.1' };

/**
 * Builds an app whose `inject` behaves like a same-origin browser: it adds `Origin: TEST_ORIGIN`
 * unless the test sets an `origin` header itself (pass `origin: null` to send none).
 */
export async function testApp(
  env: Record<string, string> = {},
  opts: BuildOptions = {},
): Promise<FastifyInstance> {
  const app = await buildApp(testConfig(env), opts);
  withDefaultOrigin(app);
  return app;
}

export function withDefaultOrigin(app: FastifyInstance): void {
  const inject = app.inject.bind(app) as (o: unknown) => unknown;
  (app as unknown as { inject: unknown }).inject = (o: Record<string, unknown>) => {
    const headers = { ...((o.headers as Record<string, unknown>) ?? {}) };
    if (!('origin' in headers)) headers.origin = TEST_ORIGIN;
    else if (headers.origin === null) delete headers.origin;
    return inject({ ...o, headers });
  };
}
