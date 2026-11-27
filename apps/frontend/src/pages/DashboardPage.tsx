import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Activity, AlertTriangle, Hammer, Plus, Rocket } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  MessageStrip,
  MetricCard,
  StatusIndicator,
  Text,
} from '@enterprise-ui/react';
import { useAuth } from '../auth/AuthProvider';
import { CreateProjectDialog } from '../projects/CreateProjectDialog';
import { onProjectsChanged } from '../lib/projectsBus';
import { useResource } from '../lib/useResource';
import { RoutePage } from './RoutePage';

function EmptyCard({
  title,
  icon,
  empty,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  description: string;
}) {
  return (
    <Card title={title} headingLevel={2} className="dy-span-2">
      <EmptyState size="sm" icon={icon} title={empty} description={description} headingLevel={3} />
    </Card>
  );
}

/**
 * DY-D1 Screen 3. Phase 1 has projects but no builds, deployments or activity feed yet, so those
 * widgets keep their mockup slots and show empty states until their phases land.
 */
export function DashboardPage() {
  const { api, status } = useAuth();
  const navigate = useNavigate();
  const user = status.kind === 'authenticated' ? status.auth.user : null;
  const first = user?.displayName.split(' ')[0] ?? '';
  const canCreate = !!user?.permissions.includes('projects.create');
  const [creating, setCreating] = useState(false);

  const counts = useResource(async () => {
    const [all, shared] = await Promise.all([
      api.listProjects({ scope: 'all', pageSize: 1 }),
      api.listProjects({ scope: 'shared', pageSize: 1 }),
    ]);
    return { all: all.meta.total, shared: shared.meta.total };
  }, 'dashboard-counts');
  const { reload } = counts;
  useEffect(() => onProjectsChanged(reload), [reload]);

  return (
    <RoutePage
      title="Dashboard"
      subtitle={`Welcome back, ${first}`}
      onRefresh={reload}
      actions={
        <>
          {canCreate && (
            <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
              New project
            </Button>
          )}
          <Button variant="secondary" disabled title="The playground arrives in Phase 2">
            New playground
          </Button>
        </>
      }
    >
      {counts.state === 'error' && (
        <MessageStrip
          tone="error"
          title="Couldn’t load project counts"
          actions={
            <Button variant="tertiary" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          {counts.error.message}
        </MessageStrip>
      )}
      <div className="dy-dashboard">
        <MetricCard
          title="Projects"
          value={counts.data?.all ?? '—'}
          loading={!counts.data && counts.state === 'loading'}
          onClick={() => navigate('/projects')}
          footer={
            counts.data && (
              <Text size="xs" tone="secondary">
                {counts.data.shared} shared with you
              </Text>
            )
          }
          headingLevel={2}
        />
        <MetricCard
          title="Builds (7 days)"
          value="—"
          footer={
            <Text size="xs" tone="secondary">
              No builds yet
            </Text>
          }
          headingLevel={2}
        />
        <MetricCard
          title="Build success rate"
          value="—"
          footer={
            <Text size="xs" tone="secondary">
              No builds yet
            </Text>
          }
          headingLevel={2}
        />
        <MetricCard
          title="Active deployments"
          value="—"
          footer={<StatusIndicator tone="neutral">Nothing deployed</StatusIndicator>}
          headingLevel={2}
        />
        <EmptyCard
          title="Recent builds"
          icon={<Hammer size={32} aria-hidden />}
          empty="No builds yet"
          description="Builds run once the build engine is enabled (Phase 5)."
        />
        <EmptyCard
          title="Deployments"
          icon={<Rocket size={32} aria-hidden />}
          empty="No deployments yet"
          description="Deployments arrive with the deployment engine (Phase 6)."
        />
        <EmptyCard
          title="Recent activity"
          icon={<Activity size={32} aria-hidden />}
          empty="No recent activity"
          description="Commit, build and deploy events will show here as those phases land."
        />
        <Card title="Projects needing attention" headingLevel={2} className="dy-span-2">
          <EmptyState
            size="sm"
            icon={<AlertTriangle size={32} aria-hidden />}
            title="Nothing needs attention"
            description="Failed builds and unhealthy deployments will be flagged here."
            actions={
              <Button variant="tertiary" onClick={() => navigate('/projects')}>
                View all projects
              </Button>
            }
            headingLevel={3}
          />
        </Card>
      </div>
      <CreateProjectDialog open={creating} onClose={() => setCreating(false)} />
    </RoutePage>
  );
}
