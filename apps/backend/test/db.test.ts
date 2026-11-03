import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { openDatabase, runMigrations } from '../src/db/client.js';
import {
  projectMembers,
  projects,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../src/db/schema.js';
import { seedRbac } from '../src/db/seed.js';
import { newId } from '../src/lib/ids.js';

function freshDb() {
  const { db, sqlite } = openDatabase(':memory:');
  runMigrations(db);
  seedRbac(db);
  return { db, sqlite };
}

describe('schema + migrations', () => {
  it('seeds the three built-in roles idempotently', () => {
    const { db } = freshDb();
    seedRbac(db);
    expect(
      db
        .select()
        .from(roles)
        .all()
        .map((r) => r.id)
        .sort(),
    ).toEqual(['admin', 'developer', 'viewer']);
    const viewerPerms = db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, 'viewer'))
      .all();
    expect(viewerPerms.map((p) => p.permissionId)).toEqual(['users.read']);
  });

  it('enforces unique usernames and FK cascades', () => {
    const { db } = freshDb();
    const u = {
      id: newId(),
      username: 'ian',
      email: 'ian@example.com',
      displayName: 'Ian',
      passwordHash: 'x',
    };
    db.insert(users).values(u).run();
    expect(() =>
      db
        .insert(users)
        .values({ ...u, id: newId(), email: 'other@example.com' })
        .run(),
    ).toThrow();
    db.insert(userRoles).values({ userId: u.id, roleId: 'admin' }).run();
    const pid = newId();
    db.insert(projects).values({ id: pid, slug: 'demo', name: 'Demo', ownerId: u.id }).run();
    db.insert(projectMembers).values({ projectId: pid, userId: u.id, role: 'owner' }).run();
    // owner FK is RESTRICT: cannot hard-delete a user who owns projects
    expect(() => db.delete(users).where(eq(users.id, u.id)).run()).toThrow();
    db.delete(projects).where(eq(projects.id, pid)).run();
    expect(db.select().from(projectMembers).all()).toHaveLength(0);
  });

  it('rejects unknown role ids in user_roles', () => {
    const { db } = freshDb();
    const id = newId();
    db.insert(users)
      .values({ id, username: 'a', email: 'a@x.io', displayName: 'A', passwordHash: 'x' })
      .run();
    expect(() => db.insert(userRoles).values({ userId: id, roleId: 'superuser' }).run()).toThrow();
  });
});
