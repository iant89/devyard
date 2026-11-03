import { Card, Skeleton, Stack } from '@enterprise-ui/react';
import { useAuth } from '../auth/AuthProvider';
import { RoutePage } from './RoutePage';

/** Shell frame for Screen 2: dashboard widgets arrive with B6/Phase 2; skeleton blocks stand in (DY-D1 Screen 2). */
export function DashboardPage() {
  const { status } = useAuth();
  const first = status.kind === 'authenticated' ? status.auth.user.displayName.split(' ')[0] : '';
  return (
    <RoutePage title="Dashboard" subtitle={`Welcome back, ${first}`}>
      <div
        className="dy-skeleton-grid"
        role="status"
        aria-busy="true"
        aria-label="Dashboard widgets loading"
      >
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} flat>
            <Stack gap={3}>
              <Skeleton variant="text" width="35%" />
              <Skeleton variant="rect" width="55%" height={16} />
            </Stack>
          </Card>
        ))}
        {[0, 1].map((i) => (
          <Card key={`w${i}`} flat className="dy-span-2">
            <Skeleton variant="text" lines={7} />
          </Card>
        ))}
      </div>
    </RoutePage>
  );
}
