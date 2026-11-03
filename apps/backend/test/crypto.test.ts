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
