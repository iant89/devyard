import type { FastifyInstance, LightMyRequestResponse } from 'fastify';

export const ADMIN = {
  username: 'admin',
  email: 'admin@example.com',
  displayName: 'Admin',
  password: 'correct horse battery staple',
};

let ipCounter = 1;
/** Unique client IP per call site so the per-IP login rate limit doesn't couple tests. */
export function freshIp(): string {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

export function sessionCookie(res: LightMyRequestResponse): string {
  const c = res.cookies.find((x) => x.name.endsWith('dy_session'));
  if (!c) throw new Error('no session cookie set');
  return `${c.name}=${c.value}`;
}

export interface Authed {
  cookie: string;
  csrf: string;
  body: { data: { user: { id: string }; session: { id: string }; csrfToken: string } };
}

export async function bootstrap(app: FastifyInstance, ip = freshIp()): Promise<Authed> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/bootstrap',
    payload: ADMIN,
    headers: { 'x-forwarded-for': ip },
  });
  if (res.statusCode !== 201) throw new Error(`bootstrap failed ${res.statusCode} ${res.body}`);
  const body = res.json();
  return { cookie: sessionCookie(res), csrf: body.data.csrfToken, body };
}

export async function login(
  app: FastifyInstance,
  loginName = ADMIN.username,
  password = ADMIN.password,
  ip = freshIp(),
): Promise<Authed> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { login: loginName, password },
    headers: { 'x-forwarded-for': ip },
  });
  if (res.statusCode !== 200) throw new Error(`login failed ${res.statusCode} ${res.body}`);
  const body = res.json();
  return { cookie: sessionCookie(res), csrf: body.data.csrfToken, body };
}
