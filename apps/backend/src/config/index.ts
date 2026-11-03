import path from 'node:path';
import { z } from 'zod';

/** Spec §4.3: all filesystem locations come from configuration. */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEVYARD_HOST: z.string().default('127.0.0.1'),
  DEVYARD_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DEVYARD_DATA_DIR: z.string().default('./data'),
  DEVYARD_DB_PATH: z.string().optional(),
  DEVYARD_SESSION_TTL_HOURS: z.coerce.number().positive().default(168),
  DEVYARD_SESSION_IDLE_HOURS: z.coerce.number().positive().default(24),
  DEVYARD_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  DEVYARD_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  host: string;
  port: number;
  dataDir: string;
  dbPath: string;
  sessionTtlMs: number;
  sessionIdleMs: number;
  cookieSecure: boolean;
  logLevel: string;
  version: string;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const e = Env.parse(source);
  const dataDir = path.resolve(e.DEVYARD_DATA_DIR);
  return {
    env: e.NODE_ENV,
    host: e.DEVYARD_HOST,
    port: e.DEVYARD_PORT,
    dataDir,
    dbPath:
      e.DEVYARD_DB_PATH === ':memory:'
        ? ':memory:'
        : path.resolve(e.DEVYARD_DB_PATH ?? path.join(dataDir, 'database', 'devyard.sqlite')),
    sessionTtlMs: e.DEVYARD_SESSION_TTL_HOURS * 3_600_000,
    sessionIdleMs: e.DEVYARD_SESSION_IDLE_HOURS * 3_600_000,
    cookieSecure: e.DEVYARD_COOKIE_SECURE ?? e.NODE_ENV === 'production',
    logLevel: e.DEVYARD_LOG_LEVEL,
    version: '0.0.0',
  };
}
