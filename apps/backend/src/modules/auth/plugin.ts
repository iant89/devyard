import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { PermissionKey } from '../../db/seed.js';
import { ApiError } from '../../lib/errors.js';
import { can } from '../permissions/service.js';
import {
  csrfMatches,
  resolveSession,
  toPublicUser,
  type SessionRow,
  type UserRow,
} from './service.js';
import type { PublicUser } from '@devyard/contracts';

export interface AuthContext {
  user: UserRow;
  publicUser: PublicUser;
  session: SessionRow;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
  interface FastifyContextConfig {
    /** Require a valid session (plan §5.9). Default false; set true on every non-public route. */
    auth?: boolean;
    /** Require a global permission (implies auth). */
    permission?: PermissionKey;
    /** Skip the CSRF token check for this unsafe route (public, session-less routes only). */
    csrf?: false;
  }
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function sessionCookieName(secure: boolean): string {
  return secure ? '__Host-dy_session' : 'dy_session';
}

export function setSessionCookie(app: FastifyInstance, reply: FastifyReply, token: string): void {
  reply.setCookie(sessionCookieName(app.config.cookieSecure), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: app.config.cookieSecure,
    path: '/',
    maxAge: Math.floor(app.config.sessionTtlMs / 1000),
  });
}

export function clearSessionCookie(app: FastifyInstance, reply: FastifyReply): void {
  reply.clearCookie(sessionCookieName(app.config.cookieSecure), {
    httpOnly: true,
    sameSite: 'lax',
    secure: app.config.cookieSecure,
    path: '/',
  });
}

/**
 * Plan §5.5: unsafe requests must come from an allow-listed origin (DEVYARD_PUBLIC_ORIGINS, exact
 * scheme + host + port). Falls back to Referer; rejects when both are missing or `Origin: null`.
 */
export function originAllowed(req: FastifyRequest, allowed: readonly string[]): boolean {
  let origin = req.headers.origin;
  if (!origin) {
    const referer = req.headers.referer;
    if (!referer) return false;
    try {
      origin = new URL(referer).origin;
    } catch {
      return false;
    }
  }
  return origin !== 'null' && allowed.includes(origin);
}

/**
 * Session preHandler + CSRF (plan §5.5, §5.9). Resolves `request.auth` from the cookie, then enforces
 * route config `auth` / `permission` and the synchronizer token on unsafe methods.
 */
export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('auth', null);

  app.addHook('preHandler', async (req) => {
    const token = req.cookies[sessionCookieName(app.config.cookieSecure)];
    if (token) {
      const resolved = resolveSession(app.db, app.config, token);
      if (resolved) req.auth = { ...resolved, publicUser: toPublicUser(app.db, resolved.user) };
    }

    const cfg = req.routeOptions.config;
    if (UNSAFE.has(req.method)) {
      if (!originAllowed(req, app.config.publicOrigins))
        throw new ApiError('CSRF_FAILED', 'Cross-site request rejected');
      if (cfg.csrf !== false && req.auth) {
        const provided = req.headers['x-csrf-token'];
        if (typeof provided !== 'string' || !csrfMatches(req.auth.session, provided))
          throw new ApiError('CSRF_FAILED', 'Missing or invalid CSRF token');
      }
    }

    if ((cfg.auth || cfg.permission) && !req.auth)
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    if (cfg.permission && !can(req.auth!.publicUser, cfg.permission))
      throw new ApiError('FORBIDDEN', 'Insufficient permissions');
  });
});
