import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** Spec §5.1 "secure password hashing": scrypt (Node built-in, OWASP-acceptable params). */
const N = 2 ** 17;
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
