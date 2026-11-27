import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { BusyError } from './errors.js';

let active = 0;
let peak = 0;
const waiters: (() => void)[] = [];
/** Bounded wait queue: beyond this, fail fast instead of piling up memory behind slow hashes. */
export const MAX_QUEUED = 256;

/**
 * Counting semaphore. On release, the slot is handed straight to the next waiter (active stays
 * the same) so a newly arriving caller can't jump in between and exceed MAX_CONCURRENT.
 */
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    if (waiters.length >= MAX_QUEUED) throw new BusyError();
    await new Promise<void>((r) => waiters.push(r)); // woken holding a transferred slot
  } else {
    active++;
  }
  peak = Math.max(peak, active);
  try {
    return await fn();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else active--;
  }
}

/** Test/diagnostic view of the hashing semaphore. */
export function scryptStats(): { active: number; queued: number; peak: number; max: number } {
  return { active, queued: waiters.length, peak, max: MAX_CONCURRENT };
}
export function resetScryptPeak(): void {
  peak = active;
}

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  withSlot(
    () =>
      new Promise<Buffer>((resolve, reject) =>
        scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
      ),
  );

/**
 * Test knob (DEVYARD_SCRYPT_N). Call sites only pass a value when NODE_ENV=test (see config);
 * anything else resets to the default.
 */
export function configureScrypt(opts: { N?: number | undefined } = {}): void {
  const n = opts.N ?? DEFAULT_SCRYPT_N;
  if (!Number.isInteger(Math.log2(n)) || n < 2) throw new Error('scrypt N must be a power of two');
  N = n;
}

/**
 * Spec §5.1 "secure password hashing": scrypt (Node built-in). N=2^16, r=8 (64 MiB per hash), with at
 * most MAX_CONCURRENT hashes in flight so a login burst can't exhaust memory or the libuv pool.
 * Hashes are self-describing, so verification always uses the parameters stored with the hash.
 */
export const DEFAULT_SCRYPT_N = 2 ** 16;
let N = DEFAULT_SCRYPT_N;
const MAX_CONCURRENT = 4;
const r = 8;
const p = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, {
    N,
    r,
    p,
    maxmem: 256 * 1024 * 1024,
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, rr, pp, saltB64, keyB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(keyB64, 'base64url');
  const key = await scrypt(
    password.normalize('NFKC'),
    Buffer.from(saltB64, 'base64url'),
    expected.length,
    {
      N: Number(n),
      r: Number(rr),
      p: Number(pp),
      maxmem: 256 * 1024 * 1024,
    },
  );
  return timingSafeEqual(key, expected);
}

/** 256-bit opaque bearer secret for the session cookie. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
