import { describe, expect, it } from 'vitest';
import { openDatabase, runMigrations } from '../../src/db/client.js';
import { seedRbac } from '../../src/db/seed.js';
import { createAdmin } from '../../src/cli/create-admin.js';
import { userRoles, users } from '../../src/db/schema.js';
import { verifyPassword } from '../../src/lib/crypto.js';

describe('admin-create CLI core', () => {
  it('creates an admin, rejects duplicates and weak passwords', async () => {
    const { db, sqlite } = openDatabase(':memory:');
    runMigrations(db);
    seedRbac(db);
    const input = {
      username: 'Root',
      email: 'Root@Example.com',
      displayName: 'Root',
      password: 'recovery password 1',
    };
    const u = await createAdmin(db, input);
    const row = db.select().from(users).get()!;
    expect(row.username).toBe('root');
    expect(row.email).toBe('root@example.com');
    expect(await verifyPassword(input.password, row.passwordHash)).toBe(true);
    expect(db.select().from(userRoles).all()).toEqual([
      expect.objectContaining({ userId: u.id, roleId: 'admin' }),
    ]);
    await expect(createAdmin(db, input)).rejects.toThrow(/exists/);
    await expect(
      createAdmin(db, { ...input, username: 'x2', password: 'short' }),
    ).rejects.toThrow();
    sqlite.close();
  });
});
