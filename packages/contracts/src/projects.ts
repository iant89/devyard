import { z } from 'zod';
import { Id, IsoDateTime, PageQuery } from './common.js';

/** Spec §6.1 creation sources. Phase 1 implements only 'empty'; others are reserved (Phases 2–4). */
export const ProjectTemplate = z.enum([
  'empty',
  'playground',
  'html-css-js',
  'react',
  'react-ts',
  'vanilla-js',
  'node',
  'local-git',
  'github-import',
]);
export const ProjectMemberRole = z.enum(['owner', 'maintainer', 'developer', 'viewer']);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRole>;

export const ProjectSlug = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

export const Project = z.object({
  id: Id,
  slug: ProjectSlug,
  name: z.string(),
  description: z.string(),
  ownerId: Id,
  projectType: ProjectTemplate,
  primaryLanguage: z.string().nullable(),
  framework: z.string().nullable(),
  archived: z.boolean(),
  /** The caller's membership role (Viewer cap applied); null when they see it only as an admin. */
  myRole: ProjectMemberRole.nullable(),
  /** How the caller can see the project: through membership, or through admin permissions. */
  access: z.enum(['member', 'admin']),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Project = z.infer<typeof Project>;

export const CreateProjectRequest = z.object({
  name: z.string().min(1).max(100),
  slug: ProjectSlug.optional(),
  description: z.string().max(2000).default(''),
  template: ProjectTemplate.default('empty'),
  primaryLanguage: z.string().max(40).optional(),
  framework: z.string().max(40).optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequest>;

export const UpdateProjectRequest = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(2000),
    primaryLanguage: z.string().max(40).nullable(),
    framework: z.string().max(40).nullable(),
    archived: z.boolean(),
  })
  .partial();

export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequest>;

export const ProjectListQuery = PageQuery.extend({
  scope: z.enum(['all', 'mine', 'shared']).default('all'),
  // Not z.coerce.boolean(): that turns the query string "false" into true.
  archived: z.enum(['true', 'false', 'all']).default('false'),
});

export const ProjectMember = z.object({
  userId: Id,
  username: z.string(),
  displayName: z.string(),
  role: ProjectMemberRole,
  addedAt: IsoDateTime,
});
export type ProjectMember = z.infer<typeof ProjectMember>;

/** Response of POST/PATCH members: `roleCapped` is true when a global Viewer's requested role was lowered to `viewer`. */
export const ProjectMemberWrite = ProjectMember.extend({ roleCapped: z.boolean() });
export type ProjectMemberWrite = z.infer<typeof ProjectMemberWrite>;

export const AddProjectMemberRequest = z.object({
  userId: Id,
  role: ProjectMemberRole.exclude(['owner']),
});
export const UpdateProjectMemberRequest = z.object({ role: ProjectMemberRole.exclude(['owner']) });
export const TransferOwnershipRequest = z.object({ newOwnerId: Id });

/** Sortable fields for GET /projects (`field` or `-field`). Default `-updatedAt`. */
export const PROJECT_SORT_FIELDS = ['name', 'slug', 'createdAt', 'updatedAt'] as const;
