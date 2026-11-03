import { useRef, useState, type FormEvent } from 'react';
import { User } from 'lucide-react';
import {
  Button,
  Card,
  Flex,
  Form,
  FormField,
  Input,
  Link,
  MessageStrip,
  Stack,
  Title,
} from '@enterprise-ui/react';
import { ApiError } from '../api/client';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { useAuth } from './AuthProvider';

type Failure = { title: string; body: string; fieldError?: string } | null;

function describe(error: unknown): NonNullable<Failure> {
  if (error instanceof ApiError) {
    if (error.code === 'UNAUTHENTICATED')
      return {
        title: 'Sign-in failed',
        body: 'The username or password is incorrect. Check your details and try again.',
        fieldError: 'Incorrect username or password.',
      };
    if (error.code === 'RATE_LIMITED')
      return { title: 'Too many attempts', body: 'Wait a minute before trying to sign in again.' };
    if (error.code === 'NETWORK') return { title: 'Server unreachable', body: error.message };
  }
  return {
    title: 'Sign-in failed',
    body: 'Something went wrong on the server. Try again in a moment.',
  };
}

/** DY-D1 Screen 1 (normal / error / loading) + session-expired note. */
export function LoginPage({ expired = false }: { expired?: boolean }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await login({ login: username.trim(), password });
    } catch (error) {
      setFailure(describe(error));
      setPassword('');
      setBusy(false);
      passwordRef.current?.focus();
    }
  };

  return (
    <AuthLayout>
      <Card
        className="dy-auth__card"
        header={
          <Title level={2} size="xl">
            Sign in
          </Title>
        }
      >
        <Form onSubmit={onSubmit} noValidate aria-label="Sign in">
          <Stack gap={5}>
            {failure && (
              <MessageStrip tone="error" title={failure.title} announce="assertive">
                {failure.body}
              </MessageStrip>
            )}
            {!failure && expired && (
              <MessageStrip tone="warning" announce="polite">
                Your session expired. Sign in again to continue.
              </MessageStrip>
            )}
            <FormField label="Username or email" required disabled={busy}>
              <Input
                name="login"
                autoComplete="username"
                placeholder="ian@devyard.local"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                startAdornment={<User aria-hidden size={16} />}
                disabled={busy}
                autoFocus
              />
            </FormField>
            <FormField label="Password" required disabled={busy} error={failure?.fieldError}>
              <PasswordInput
                ref={passwordRef}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </FormField>
            {/* No "keep me signed in": sessions are fixed (7 days, 24 h idle) — plan §5. */}
            <Flex justify="flex-end" align="center">
              <Link
                href="/password-reset"
                aria-disabled={busy || undefined}
                tabIndex={busy ? -1 : undefined}
                onClick={(e) => busy && e.preventDefault()}
              >
                Forgot password?
              </Link>
            </Flex>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Form>
      </Card>
    </AuthLayout>
  );
}
