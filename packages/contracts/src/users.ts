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
