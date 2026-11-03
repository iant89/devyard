import { isIP } from 'node:net';
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
  /** Comma-separated exact origins (scheme://host[:port]) allowed on unsafe requests. Required in production. */
  DEVYARD_PUBLIC_ORIGINS: z.string().optional(),
  /** Off by default. Comma-separated proxy IPs/CIDRs whose X-Forwarded-* headers are trusted. */
  DEVYARD_TRUST_PROXY: z.string().optional(),
  /** scrypt cost override; honoured only when NODE_ENV=test (fast tests). */
  DEVYARD_SCRYPT_N: z.coerce.number().int().optional(),
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
  /** Normalised `URL.origin` values. */
  publicOrigins: string[];
  /** false, or the proxy addresses/CIDRs Fastify should trust. */
  trustProxy: false | string[];
  /** Only set in test. */
  scryptN?: number;
}

const DEV_ORIGINS = ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:5173'];
const TEST_ORIGINS = ['http://localhost'];

function parseOrigins(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  return raw.split(',').map((o) => {
    const v = o.trim();
    let u: URL;
    try {
      u = new URL(v);
    } catch {
      throw new Error(`DEVYARD_PUBLIC_ORIGINS: invalid origin "${v}"`);
    }
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.origin !== v.replace(/\/$/, ''))
      throw new Error(`DEVYARD_PUBLIC_ORIGINS: "${v}" must be scheme://host[:port] with no path`);
    return u.origin;
  });
}

function parseTrustProxy(raw: string | undefined): false | string[] {
  if (raw === undefined || raw.trim() === '' || raw.trim() === 'false') return false;
  return raw.split(',').map((entry) => {
    const v = entry.trim();
    const [addr, bits, ...rest] = v.split('/');
    const family = isIP(addr ?? '');
    const max = family === 4 ? 32 : 128;
    const okBits = bits === undefined || (/^\d+$/.test(bits) && Number(bits) <= max);
    if (!family || !okBits || rest.length)
      throw new Error(`DEVYARD_TRUST_PROXY: "${v}" is not an IP address or CIDR`);
    return v;
  });
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const e = Env.parse(source);
  const dataDir = path.resolve(e.DEVYARD_DATA_DIR);
  const cookieSecure = e.DEVYARD_COOKIE_SECURE ?? e.NODE_ENV === 'production';
  // The __Host- cookie prefix follows cookieSecure, so production must never run without Secure.
  if (e.NODE_ENV === 'production' && !cookieSecure)
    throw new Error('DEVYARD_COOKIE_SECURE=false is not allowed when NODE_ENV=production');
  const origins = parseOrigins(e.DEVYARD_PUBLIC_ORIGINS);
  if (e.NODE_ENV === 'production' && !origins)
    throw new Error('DEVYARD_PUBLIC_ORIGINS is required when NODE_ENV=production');
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
    cookieSecure,
    logLevel: e.DEVYARD_LOG_LEVEL,
    version: '0.0.0',
    publicOrigins: origins ?? (e.NODE_ENV === 'test' ? TEST_ORIGINS : DEV_ORIGINS),
    trustProxy: parseTrustProxy(e.DEVYARD_TRUST_PROXY),
    ...(e.NODE_ENV === 'test' && e.DEVYARD_SCRYPT_N ? { scryptN: e.DEVYARD_SCRYPT_N } : {}),
  };
}
