import { describe, expect, it } from 'vitest';
import { hashPassword, newToken, sha256, verifyPassword } from '../src/lib/crypto.js';
import { newId } from '../src/lib/ids.js';

describe('crypto helpers', () => {
  it('hashes and verifies passwords', async () => {
    const h = await hashPassword('correct horse battery staple');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery staple', h)).toBe(true);
    expect(await verifyPassword('wrong password!!', h)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
  it('produces unguessable tokens and stable hashes', () => {
    const t = newToken();
    expect(t).toHaveLength(43);
    expect(newToken()).not.toBe(t);
    expect(sha256(t)).toHaveLength(64);
  });
  it('produces time-ordered v7 ids', () => {
    const a = newId(1_000);
    const b = newId(2_000);
    expect(a < b).toBe(true);
    expect(a[14]).toBe('7');
  });
});

describe('scrypt cost', () => {
  it('defaults to N=2^16 and the test knob only changes new hashes', async () => {
    const { configureScrypt, DEFAULT_SCRYPT_N, hashPassword, verifyPassword } =
      await import('../src/lib/crypto.js');
    expect(DEFAULT_SCRYPT_N).toBe(2 ** 16);
    configureScrypt();
    const strong = await hashPassword('some long password');
    expect(strong.split('$')[1]).toBe(String(2 ** 16));
    configureScrypt({ N: 1024 });
    const weak = await hashPassword('some long password');
    expect(weak.split('$')[1]).toBe('1024');
    expect(await verifyPassword('some long password', strong)).toBe(true);
    expect(() => configureScrypt({ N: 1000 })).toThrow();
    configureScrypt();
  });
});

describe('scrypt concurrency', () => {
  it('never runs more than 4 hashes at once and drains cleanly', async () => {
    const { configureScrypt, hashPassword, resetScryptPeak, scryptStats } =
      await import('../src/lib/crypto.js');
    configureScrypt({ N: 2 ** 14 });
    resetScryptPeak();
    const seen: number[] = [];
    const timer = setInterval(() => seen.push(scryptStats().active), 1);
    try {
      await Promise.all(Array.from({ length: 16 }, (_, i) => hashPassword(`password number ${i}`)));
    } finally {
      clearInterval(timer);
      configureScrypt();
    }
    const stats = scryptStats();
    expect(stats.max).toBe(4);
    expect(stats.peak).toBe(4);
    expect(Math.max(...seen, 0)).toBeLessThanOrEqual(4);
    expect(stats.active).toBe(0);
    expect(stats.queued).toBe(0);
  });
});
