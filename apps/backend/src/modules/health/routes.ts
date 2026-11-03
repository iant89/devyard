import type { HealthResponse } from '@devyard/contracts';
import { sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (): Promise<HealthResponse> => {
    let db: HealthResponse['db'] = 'ok';
    try {
      app.db.get(sql`select 1`);
    } catch {
      db = 'error';
    }
    return { status: 'ok', version: app.config.version, db };
  });
};
