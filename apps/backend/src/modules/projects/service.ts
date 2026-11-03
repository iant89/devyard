import type { Project, ProjectMemberRole } from '@devyard/contracts';
import { and, eq, isNull, like } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { projectMembers, projects, users } from '../../db/schema.js';
import { loadRolesAndPermissions } from '../auth/service.js';
import { isGlobalViewerOnly, type Principal, type ProjectRole } from '../permissions/service.js';

export type ProjectRow = typeof projects.$inferSelect;

export function toProject(p: ProjectRow, myRole: ProjectRole): Project {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    ownerId: p.ownerId,
    projectType: p.projectType as Project['projectType'],
    primaryLanguage: p.primaryLanguage,
    framework: p.framework,
    archived: !!p.archivedAt,
    myRole,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function slugify(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return s.length >= 2 ? s : `project-${s || 'x'}`.slice(0, 40);
}

/** Slugs stay reserved after soft delete (unique index covers deleted rows). */
export function slugTaken(db: Pick<Db, 'select'>, slug: string): boolean {
  return !!db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).get();
}

export function uniqueSlug(db: Pick<Db, 'select'>, base: string): string {
  if (!slugTaken(db, base)) return base;
  const taken = new Set(
    db
      .select({ s: projects.slug })
      .from(projects)
      .where(like(projects.slug, `${base}-%`))
      .all()
      .map((r) => r.s),
  );
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export function findLiveProject(db: Pick<Db, 'select'>, id: string): ProjectRow | undefined {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .get();
}

/**
 * Plan §4 / D6: a global Viewer can never hold more than project `viewer`. Applied on every write
 * (add, update) so the stored role never exceeds the cap; `effectiveProjectRole` caps on read too.
 */
export function capRoleForUser(
  db: Db,
  userId: string,
  requested: ProjectMemberRole,
): { role: ProjectMemberRole; capped: boolean } {
  const { roles, permissions } = loadRolesAndPermissions(db, userId);
  const principal: Principal = { id: userId, roles, permissions };
  if (isGlobalViewerOnly(principal) && requested !== 'viewer')
    return { role: 'viewer', capped: true };
  return { role: requested, capped: false };
}

export function isGlobalViewer(db: Db, userId: string): boolean {
  const { roles, permissions } = loadRolesAndPermissions(db, userId);
  return isGlobalViewerOnly({ id: userId, roles, permissions });
}

export function memberRow(db: Pick<Db, 'select'>, projectId: string, userId: string) {
  return db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get();
}

export function listMembers(db: Pick<Db, 'select'>, projectId: string) {
  return db
    .select({
      userId: projectMembers.userId,
      username: users.username,
      displayName: users.displayName,
      role: projectMembers.role,
      addedAt: projectMembers.createdAt,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(and(eq(projectMembers.projectId, projectId), isNull(users.deletedAt)))
    .orderBy(projectMembers.createdAt, projectMembers.userId)
    .all()
    .map((m) => ({ ...m, addedAt: m.addedAt.toISOString() }));
}
