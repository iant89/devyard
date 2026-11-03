import { useState, type FormEvent } from 'react';
import { BootstrapRequest } from '@devyard/contracts';
import {
  Button,
  Card,
  Form,
  FormField,
  Input,
  MessageStrip,
  Stack,
  Text,
  Title,
} from '@enterprise-ui/react';
import { ApiError } from '../api/client';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { useAuth } from './AuthProvider';

type Field = 'username' | 'email' | 'displayName' | 'password' | 'confirm';
const MESSAGES: Partial<Record<Field, string>> = {
  username: 'Use 3–32 lowercase letters, digits, dots, hyphens or underscores.',
  email: 'Enter a valid email address.',
  displayName: 'Enter your name.',
  password: 'Use at least 12 characters.',
};

/** First-run bootstrap (plan §5.8): shown only while `GET /auth/bootstrap` says `required`. */
export function BootstrapPage() {
  const { bootstrap, retry } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({
    username: '',
    email: '',
    displayName: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (f: Field) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [f]: e.target.value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const input = {
      username: values.username.trim(),
      email: values.email.trim(),
      displayName: values.displayName.trim(),
      password: values.password,
    };
    const next: Partial<Record<Field, string>> = {};
    const parsed = BootstrapRequest.safeParse(input);
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as Field;
        next[f] ??= MESSAGES[f] ?? issue.message;
      }
    if (values.confirm !== values.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(`bootstrap-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await bootstrap(input);
    } catch (error) {
      setBusy(false);
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        retry(); // someone else finished setup; fall back to sign-in
        return;
      }
      setFailure(error instanceof Error ? error.message : 'Setup failed.');
    }
  };

  const field = (f: Field, label: string, control: React.ReactNode) => (
    <FormField id={`bootstrap-${f}`} label={label} required error={errors[f]} disabled={busy}>
      {control}
    </FormField>
  );

  return (
    <AuthLayout>
      <Card className="dy-auth__card">
        <Form onSubmit={onSubmit} noValidate aria-label="Create the first administrator">
          <Stack gap={5}>
            <Title level={2} size="xl">
              Set up Devyard
            </Title>
            <Text as="p" size="sm" tone="secondary">
              No accounts exist yet. Create the first administrator for this instance.
            </Text>
            {failure && (
              <MessageStrip tone="error" title="Setup failed" announce="assertive">
                {failure}
              </MessageStrip>
            )}
            {field(
              'displayName',
              'Full name',
              <Input
                value={values.displayName}
                onChange={set('displayName')}
                autoComplete="name"
                disabled={busy}
              />,
            )}
            {field(
              'username',
              'Username',
              <Input
                value={values.username}
                onChange={set('username')}
                autoComplete="username"
                disabled={busy}
              />,
            )}
            {field(
              'email',
              'Email',
              <Input
                type="email"
                value={values.email}
                onChange={set('email')}
                autoComplete="email"
                disabled={busy}
              />,
            )}
            {field(
              'password',
              'Password',
              <PasswordInput
                value={values.password}
                onChange={set('password')}
                autoComplete="new-password"
                disabled={busy}
              />,
            )}
            {field(
              'confirm',
              'Confirm password',
              <PasswordInput
                value={values.confirm}
                onChange={set('confirm')}
                autoComplete="new-password"
                disabled={busy}
              />,
            )}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
              {busy ? 'Creating administrator…' : 'Create administrator'}
            </Button>
          </Stack>
        </Form>
      </Card>
    </AuthLayout>
  );
}
