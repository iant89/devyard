import { z } from 'zod';
import { RoleName, Username, Password } from './auth.js';
import { PageQuery } from './common.js';

export const CreateUserRequest = z.object({
  username: Username,
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  password: Password,
  roles: z.array(RoleName).min(1).default(['developer']),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

export const UpdateUserRequest = z
  .object({
    email: z.string().email(),
    displayName: z.string().min(1).max(100),
    status: z.enum(['active', 'disabled']),
    roles: z.array(RoleName).min(1),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'at least one field required');
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>;

export const UserListQuery = PageQuery.extend({
  status: z.enum(['active', 'disabled']).optional(),
  role: RoleName.optional(),
});

export const PasswordResetIssued = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});

/** What callers without `users.manage` see of other users (plan §6.3: share-target picking). */
export const UserSummary = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
});
export type UserSummary = z.infer<typeof UserSummary>;

/** GET /users/:id/activity item (spec §5.2 "view user activity", §21.2). */
export const AuditEntry = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  outcome: z.enum(['success', 'failure']),
  ip: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

/** Sortable fields for GET /users (`field` or `-field`). */
export const USER_SORT_FIELDS = ['username', 'displayName', 'email', 'createdAt', 'lastLoginAt'] as const;
