import type { FastifyInstance } from 'fastify';
import { bootstrap, freshIp, login, type Authed } from '../auth/fixtures.js';

export const PW = 'member password 123';

export interface Actors {
  admin: Authed;
  developer: Authed;
  viewer: Authed;
  ids: { admin: string; developer: string; viewer: string };
}

export async function createUser(
  app: FastifyInstance,
  as: Authed,
  username: string,
  roles: string[],
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: { cookie: as.cookie, 'x-csrf-token': as.csrf },
    payload: {
      username,
      email: `${username}@example.com`,
      displayName: username,
      password: PW,
      roles,
    },
  });
  if (res.statusCode !== 201) throw new Error(`create ${username}: ${res.statusCode} ${res.body}`);
  return res.json().data.id;
}

export async function setupActors(app: FastifyInstance): Promise<Actors> {
  const admin = await bootstrap(app);
  const devId = await createUser(app, admin, 'dev', ['developer']);
  const viewerId = await createUser(app, admin, 'view', ['viewer']);
  return {
    admin,
    developer: await login(app, 'dev', PW, freshIp()),
    viewer: await login(app, 'view', PW, freshIp()),
    ids: { admin: admin.body.data.user.id, developer: devId, viewer: viewerId },
  };
}

export const call = (
  app: FastifyInstance,
  as: Authed | null,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: unknown,
) =>
  app.inject({
    method,
    url,
    headers: as ? { cookie: as.cookie, 'x-csrf-token': as.csrf } : {},
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
