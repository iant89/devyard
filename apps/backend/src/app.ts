import { API_PREFIX } from '@devyard/contracts';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/index.js';
import { openDatabase, runMigrations, type Db } from './db/client.js';
import { seedRbac } from './db/seed.js';
import { configureScrypt } from './lib/crypto.js';
import { registerErrorHandling } from './lib/errors.js';
import { newId } from './lib/ids.js';
import { authPlugin } from './modules/auth/plugin.js';
import { authRoutes } from './modules/auth/routes.js';
import { purgeExpired } from './modules/auth/service.js';
import { healthRoutes } from './modules/health/routes.js';
import { usersRoutes } from './modules/users/routes.js';

export interface BuildOptions {
  /** Destination for log lines (tests capture logs with this). Defaults to stdout. */
  logStream?: NodeJS.WritableStream;
}

const PURGE_INTERVAL_MS = 60 * 60_000;

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    config: AppConfig;
  }
}

/**
 * Builds the control-plane API (spec §4.1 modular monolith, §4.2 control plane only:
 * this process never executes project code).
 */
export async function buildApp(
  config: AppConfig,
  opts: BuildOptions = {},
): Promise<FastifyInstance> {
  configureScrypt({ N: config.env === 'test' ? config.scryptN : undefined });
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.headers["x-csrf-token"]',
        'res.headers["set-cookie"]',
      ],
      ...(opts.logStream ? { stream: opts.logStream } : {}),
    },
    genReqId: () => newId(),
    // Off unless DEVYARD_TRUST_PROXY lists the proxy (Caddy, spec §13); otherwise X-Forwarded-For is ignored.
    trustProxy: config.trustProxy === false ? false : config.trustProxy,
  });

  const { db, sqlite } = openDatabase(config.dbPath);
  runMigrations(db);
  seedRbac(db);
  app.decorate('db', db);
  app.decorate('config', config);
  // Hourly purge of expired/revoked sessions and used reset tokens (plan §5.3).
  const purgeTimer = setInterval(() => {
    try {
      const n = purgeExpired(db, config);
      app.log.info(n, 'purged expired auth rows');
    } catch (err) {
      app.log.error({ err }, 'auth purge failed');
    }
  }, PURGE_INTERVAL_MS);
  purgeTimer.unref();
  app.addHook('onClose', async () => {
    clearInterval(purgeTimer);
    sqlite.close();
  });

  registerErrorHandling(app);
  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });

  await app.register(
    async (v1) => {
      await v1.register(authPlugin);
      await v1.register(healthRoutes);
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(usersRoutes, { prefix: '/users' });
      // Batch B4: projects module registers here.
    },
    { prefix: API_PREFIX },
  );

  return app;
}
