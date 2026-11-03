import { Card, Link, Stack, Text } from '@enterprise-ui/react';
import { AuthLayout } from './AuthLayout';

/** Plan §5.6: no email channel in the MVP; an administrator issues a one-time reset token. */
export function PasswordResetInfo() {
  return (
    <AuthLayout>
      <Card title="Reset your password" headingLevel={2}>
        <Stack gap={4}>
          <Text as="p">
            Devyard doesn't send email. Ask an administrator to issue a one-time password reset
            token for your account, then use the reset link they give you.
          </Text>
          <Link href="/">Back to sign in</Link>
        </Stack>
      </Card>
    </AuthLayout>
  );
}
