import { API_PREFIX } from '@devyard/contracts';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/index.js';
import { openDatabase, runMigrations, type Db } from './db/client.js';
import { seedRbac } from './db/seed.js';
import { registerErrorHandling } from './lib/errors.js';
import { newId } from './lib/ids.js';
import { healthRoutes } from './modules/health/routes.js';

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
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logLevel, redact: ['req.headers.cookie', 'req.headers.authorization'] },
    genReqId: () => newId(),
    trustProxy: true, // behind Caddy (spec §13)
  });

  const { db, sqlite } = openDatabase(config.dbPath);
  runMigrations(db);
  seedRbac(db);
  app.decorate('db', db);
  app.decorate('config', config);
  app.addHook('onClose', async () => sqlite.close());

  registerErrorHandling(app);
  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });

  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
      // Batch B2+: auth, users, projects modules register here.
    },
    { prefix: API_PREFIX },
  );

  return app;
}
