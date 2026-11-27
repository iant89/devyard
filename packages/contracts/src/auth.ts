import { z } from 'zod';
import { Id, IsoDateTime } from './common.js';

export const RoleName = z.enum(['admin', 'developer', 'viewer']);
export type RoleName = z.infer<typeof RoleName>;

export const Username = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'lowercase letters, digits, . _ -');
export const Password = z.string().min(12).max(256);

export const PublicUser = z.object({
  id: Id,
  username: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  status: z.enum(['active', 'disabled']),
  roles: z.array(RoleName),
  permissions: z.array(z.string()),
  createdAt: IsoDateTime,
  lastLoginAt: IsoDateTime.nullable(),
});
export type PublicUser = z.infer<typeof PublicUser>;

/** POST /api/v1/auth/login — spec §5.1: username OR email + password. */
export const LoginRequest = z.object({
  login: z.string().min(1).max(254),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const SessionInfo = z.object({
  id: Id,
  createdAt: IsoDateTime,
  lastSeenAt: IsoDateTime,
  expiresAt: IsoDateTime,
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  current: z.boolean(),
});
export type SessionInfo = z.infer<typeof SessionInfo>;

export const AuthState = z.object({
  user: PublicUser,
  session: SessionInfo,
  csrfToken: z.string(),
});
export type AuthState = z.infer<typeof AuthState>;

export const ChangePasswordRequest = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: Password,
});

/** Spec §5.1 password reset: admin-issued one-time token (no SMTP in MVP; see plan §5.6). */
export const PasswordResetConfirmRequest = z.object({
  token: z.string().min(32).max(128),
  newPassword: Password,
});

/** First-run bootstrap: only allowed while zero users exist. */
export const BootstrapRequest = z.object({
  username: Username,
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  password: Password,
});

/** GET /api/v1/auth/bootstrap → `{ data: BootstrapStatus }` (plan §6.2). */
export const BootstrapStatus = z.object({ required: z.boolean() });
export type BootstrapStatus = z.infer<typeof BootstrapStatus>;
