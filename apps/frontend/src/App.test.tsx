import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@enterprise-ui/react';
import { ApiClient } from './api/client';
import { AuthProvider } from './auth/AuthProvider';
import { App } from './App';

const user = (permissions: string[], roles = ['admin']) => ({
  id: 'u1',
  username: 'ian',
  email: 'ian@devyard.local',
  displayName: 'Ian Thomas',
  status: 'active',
  roles,
  permissions,
  createdAt: '2026-11-01T00:00:00.000Z',
  lastLoginAt: null,
});
const auth = (permissions: string[], roles?: string[]) => ({
  user: user(permissions, roles),
  session: {
    id: 's1',
    createdAt: '2026-11-01T00:00:00.000Z',
    lastSeenAt: '2026-11-01T00:00:00.000Z',
    expiresAt: '2026-11-08T00:00:00.000Z',
    userAgent: null,
    ip: null,
    current: true,
  },
  csrfToken: 'csrf',
});
const res = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const unauth = () =>
  res(401, { error: { code: 'UNAUTHENTICATED', message: 'no', requestId: 'r' } });

type Handler = (url: string, init?: RequestInit) => Response;
function setup(handler: Handler, path = '/') {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => handler(String(input), init));
  const api = new ApiClient({ fetch });
  render(
    <ThemeProvider theme="dark">
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider api={api}>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
  return fetch;
}

describe('auth flows', () => {
  it('shows bootstrap when no users exist and lands in the shell after setup', async () => {
    setup((url, init) => {
      if (url.endsWith('/auth/me')) return unauth();
      if (url.endsWith('/auth/bootstrap') && init?.method === 'GET')
        return res(200, { data: { required: true } });
      if (url.endsWith('/auth/bootstrap')) return res(201, { data: auth(['admin.access']) });
      throw new Error(url);
    });
    const u = userEvent.setup();
    await screen.findByRole('heading', { name: 'Set up Devyard' });
    await u.click(screen.getByRole('button', { name: 'Create administrator' }));
    expect(await screen.findByText('Use at least 12 characters.')).toBeInTheDocument();

    await u.type(screen.getByLabelText(/Full name/), 'Ian Thomas');
    await u.type(screen.getByLabelText(/^Username/), 'ian');
    await u.type(screen.getByLabelText(/^Email/), 'ian@devyard.local');
    await u.type(screen.getByLabelText(/^Password/), 'correct horse battery');
    await u.type(screen.getByLabelText(/Confirm password/), 'correct horse battery');
    await u.click(screen.getByRole('button', { name: 'Create administrator' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows a generic error on bad credentials, clears the password, then signs in', async () => {
    let attempts = 0;
    setup((url) => {
      if (url.endsWith('/auth/me')) return unauth();
      if (url.endsWith('/auth/bootstrap')) return res(200, { data: { required: false } });
      if (url.endsWith('/auth/login'))
        return ++attempts === 1
          ? unauth()
          : res(200, { data: auth(['projects.create'], ['developer']) });
      throw new Error(url);
    });
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText(/Username or email/), 'ian');
    await u.type(screen.getByLabelText(/^Password/), 'wrong');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Sign-in failed')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');

    await u.type(screen.getByLabelText(/^Password/), 'right');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByText('Projects')).toBeInTheDocument();
    expect(within(nav).queryByText('Administration')).not.toBeInTheDocument();
  });

  it('restores a session, shows Administration for admins, and signs out', async () => {
    const fetch = setup((url) => {
      if (url.endsWith('/auth/me')) return res(200, { data: auth(['admin.access']) });
      if (url.endsWith('/auth/logout')) return res(204);
      if (url.endsWith('/auth/bootstrap')) return res(200, { data: { required: false } });
      throw new Error(url);
    });
    const u = userEvent.setup();
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByText('Administration')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Ian Thomas/ }));
    await u.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    await screen.findByRole('button', { name: 'Sign in' });
    const logoutCall = fetch.mock.calls.find(([u]) => String(u).endsWith('/auth/logout'));
    expect((logoutCall![1]!.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf');
  });
});

describe('login form', () => {
  it('has no "keep me signed in" option (fixed session lifetime)', async () => {
    setup((url) => {
      if (url.endsWith('/auth/me')) return unauth();
      return res(200, { data: { required: false } });
    });
    await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/keep me signed in/i)).not.toBeInTheDocument();
  });
});
