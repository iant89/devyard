import { ErrorResponse, HealthResponse } from '@devyard/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testApp } from './helpers.js';

describe('app skeleton', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await testApp();
  });
  afterAll(async () => app.close());

  it('GET /api/v1/health reports ok + db ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(HealthResponse.parse(res.json())).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('unknown routes return the structured error envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    const body = ErrorResponse.parse(res.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeTruthy();
  });

  it('sets security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
