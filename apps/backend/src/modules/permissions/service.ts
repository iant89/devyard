import type { RoleName } from '@devyard/contracts';
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { Db } from '../../db/client.js';
import { projectMembers, projects } from '../../db/schema.js';
import type { PermissionKey } from '../../db/seed.js';
import { ApiError } from '../../lib/errors.js';

/** The minimum a caller needs for authorization decisions (PublicUser satisfies it). */
export interface Principal {
  id: string;
  roles: RoleName[];
  permissions: string[];
}

export type ProjectRole = 'owner' | 'maintainer' | 'developer' | 'viewer';
export const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 0,
  developer: 1,
  maintainer: 2,
  owner: 3,
};

/** Global permission check (spec §5.3). Project rights go through `effectiveProjectRole`. */
export function can(principal: Principal | null | undefined, permission: PermissionKey): boolean {
  return !!principal && principal.permissions.includes(permission);
}

/** Global Viewers (no admin/developer role) are capped at project `viewer` (plan §4, D6). */
export function isGlobalViewerOnly(p: Principal): boolean {
  return !p.roles.some((r) => r === 'admin' || r === 'developer');
}

/**
 * Resolves the caller's effective role on a project, or null when they have no access
 * (or the project doesn't exist / is soft-deleted). Admins with `projects.manage_all` act as owner;
 * `projects.read_all` grants at least viewer.
 */
export function effectiveProjectRole(db: Db, p: Principal, projectId: string): ProjectRole | null {
  const project = db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .get();
  if (!project) return null;
  if (can(p, 'projects.manage_all')) return 'owner';
  const m = db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, p.id)))
    .get();
  let role: ProjectRole | null = m ? m.role : null;
  if (role && isGlobalViewerOnly(p)) role = 'viewer';
  if (!role && can(p, 'projects.read_all')) role = 'viewer';
  return role;
}

/**
 * Throws NOT_FOUND when the caller can't see the project at all (existence must not leak, §25)
 * and FORBIDDEN when they can see it but their role is below `minRole`. Returns the effective role.
 */
export function requireProjectRole(
  db: Db,
  p: Principal,
  projectId: string,
  minRole: ProjectRole,
): ProjectRole {
  const role = effectiveProjectRole(db, p, projectId);
  if (!role) throw new ApiError('NOT_FOUND', 'Project not found');
  if (PROJECT_ROLE_RANK[role] < PROJECT_ROLE_RANK[minRole])
    throw new ApiError('FORBIDDEN', 'Insufficient project role');
  return role;
}

/**
 * Route preHandler: requires a session and at least one of the given permissions.
 * `allowSelf` also admits the caller when `params.id` is their own user id.
 */
export function requirePermission(
  anyOf: PermissionKey | PermissionKey[],
  opts: { allowSelf?: boolean } = {},
) {
  const perms = Array.isArray(anyOf) ? anyOf : [anyOf];
  return async (req: FastifyRequest): Promise<void> => {
    const p = req.auth?.publicUser;
    if (!p) throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    if (opts.allowSelf && (req.params as { id?: string } | undefined)?.id === p.id) return;
    if (!perms.some((perm) => can(p, perm)))
      throw new ApiError('FORBIDDEN', 'Insufficient permissions');
  };
}
