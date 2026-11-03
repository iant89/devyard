import { Route, Routes } from 'react-router';
import { BusyIndicator, Button, Card, MessageStrip, Stack } from '@enterprise-ui/react';
import { useAuth } from './auth/AuthProvider';
import { AuthLayout } from './auth/AuthLayout';
import { BootstrapPage } from './auth/BootstrapPage';
import { LoginPage } from './auth/LoginPage';
import { PasswordResetInfo } from './auth/PasswordResetInfo';
import { DevyardShell } from './shell/DevyardShell';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NAVIGATION, filterNavigation, flattenNavigation } from './shell/navigation';

export function App() {
  const { status, retry } = useAuth();

  if (status.kind === 'loading')
    return (
      <AuthLayout>
        <Stack align="center">
          <BusyIndicator active delay={300} text="Loading Devyard" />
        </Stack>
      </AuthLayout>
    );
  if (status.kind === 'error')
    return (
      <AuthLayout>
        <Card>
          <Stack gap={4}>
            <MessageStrip tone="error" title="Can't reach Devyard" announce="assertive">
              {status.message}
            </MessageStrip>
            <Button variant="primary" onClick={retry}>
              Try again
            </Button>
          </Stack>
        </Card>
      </AuthLayout>
    );
  if (status.kind === 'bootstrap') return <BootstrapPage />;
  if (status.kind === 'anonymous')
    return (
      <Routes>
        <Route path="/password-reset" element={<PasswordResetInfo />} />
        <Route path="*" element={<LoginPage expired={status.expired} />} />
      </Routes>
    );

  const allowed = flattenNavigation(
    filterNavigation(NAVIGATION, status.auth.user.permissions),
  ).filter((n) => n.path !== '/');
  return (
    <DevyardShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        {[...new Set(allowed.map((n) => n.path))].map((p) => (
          <Route key={p} path={p} element={<PlaceholderPage />} />
        ))}
        <Route path="/account/*" element={<PlaceholderPage title="Account" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
    </DevyardShell>
  );
}
