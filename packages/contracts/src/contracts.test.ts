import { describe, expect, it } from 'vitest';
import {
  CreateProjectRequest,
  CreateUserRequest,
  ErrorResponse,
  LoginRequest,
  PageQuery,
} from './index.js';

describe('contracts', () => {
  it('applies defaults to page query', () => {
    expect(PageQuery.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(() => PageQuery.parse({ pageSize: 500 })).toThrow();
  });
  it('validates login', () => {
    expect(LoginRequest.safeParse({ login: 'ian', password: 'x' }).success).toBe(true);
    expect(LoginRequest.safeParse({ login: '' }).success).toBe(false);
  });
  it('enforces password policy and username format', () => {
    const base = { username: 'ian', email: 'i@example.com', displayName: 'Ian', password: 'short' };
    expect(CreateUserRequest.safeParse(base).success).toBe(false);
    const ok = CreateUserRequest.parse({ ...base, password: 'a-long-enough-pass' });
    expect(ok.roles).toEqual(['developer']);
    expect(CreateUserRequest.safeParse({ ...ok, username: 'Bad Name' }).success).toBe(false);
  });
  it('defaults project template to empty', () => {
    expect(CreateProjectRequest.parse({ name: 'X' }).template).toBe('empty');
  });
  it('shapes errors', () => {
    expect(
      ErrorResponse.safeParse({ error: { code: 'NOT_FOUND', message: 'nope', requestId: 'r1' } })
        .success,
    ).toBe(true);
  });
});
