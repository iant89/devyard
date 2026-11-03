import { permissions, rolePermissions, roles } from './schema.js';
import type { Db } from './client.js';

/** Spec §5.3 built-in roles. Global permissions; project-level rights come from project_members. */
export const PERMISSIONS = {
  'users.read': 'List and view users',
  'users.manage': 'Create, disable, delete users; reset passwords; assign roles',
  'projects.create': 'Create projects',
  'projects.read_all': 'View every project regardless of membership',
  'projects.manage_all': 'Manage every project regardless of membership',
  'admin.access': 'Platform configuration and infrastructure',
  'audit.read': 'Read audit logs',
} as const;
export type PermissionKey = keyof typeof PERMISSIONS;

export const ROLE_GRANTS: Record<'admin' | 'developer' | 'viewer', PermissionKey[]> = {
  admin: Object.keys(PERMISSIONS) as PermissionKey[],
  developer: ['projects.create', 'users.read'],
  viewer: ['users.read'],
};

const ROLE_DESCRIPTIONS = {
  admin: 'Full platform access',
  developer: 'Create and manage permitted projects',
  viewer: 'Read-only access to permitted projects',
};

/** Idempotent. */
export function seedRbac(db: Db): void {
  db.transaction((tx) => {
    for (const [id, description] of Object.entries(PERMISSIONS)) {
      tx.insert(permissions).values({ id, description }).onConflictDoNothing().run();
    }
    for (const [id, grants] of Object.entries(ROLE_GRANTS)) {
      tx.insert(roles)
        .values({
          id,
          name: id,
          description: ROLE_DESCRIPTIONS[id as keyof typeof ROLE_DESCRIPTIONS],
          builtIn: true,
        })
        .onConflictDoNothing()
        .run();
      for (const permissionId of grants) {
        tx.insert(rolePermissions).values({ roleId: id, permissionId }).onConflictDoNothing().run();
      }
    }
  });
}
