import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GitBranch, GitCommitHorizontal, Hammer, Rocket, Users } from 'lucide-react';
import type { Project } from '@devyard/contracts';
import {
  AlertDialog,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  MessageStrip,
  MetricCard,
  ObjectPage,
  OverflowMenu,
  Skeleton,
  StatusIndicator,
  Text,
  useToast,
} from '@enterprise-ui/react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { RouteCrumbs } from '../pages/RoutePage';
import { notifyProjectsChanged } from '../lib/projectsBus';
import { formatDate, timeAgo } from '../lib/time';
import { useResource } from '../lib/useResource';
import { ROLE_LABEL, templateLabel } from './templates';

/** A card whose content arrives in a later phase: honest empty state, same slot as the mockup. */
function LaterCard({
  title,
  icon,
  empty,
  phase,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  phase: string;
  className?: string;
}) {
  return (
    <Card title={title} headingLevel={3} className={className}>
      <EmptyState size="sm" icon={icon} title={empty} description={phase} headingLevel={4} />
    </Card>
  );
}

function MembersCard({ project }: { project: Project }) {
  const { api } = useAuth();
  const members = useResource(() => api.projectMembers(project.id), project.id);
  return (
    <Card title="Members" headingLevel={3} className="dy-col-5">
      {members.state === 'error' ? (
        <MessageStrip tone="error">{members.error.message}</MessageStrip>
      ) : !members.data ? (
        <Skeleton variant="text" lines={3} />
      ) : (
        <ul className="dy-member-list" aria-label="Project members">
          {members.data.map((m) => (
            <li key={m.userId} className="dy-member">
              <Avatar name={m.displayName} size="sm" decorative />
              <span className="dy-member-name">
                <Text>{m.displayName}</Text>
                <Text size="xs" tone="secondary">
                  @{m.username} · added {timeAgo(m.addedAt)}
                </Text>
              </span>
              <Badge tone={m.role === 'owner' ? 'warning' : 'neutral'}>{ROLE_LABEL[m.role]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Overview({ project }: { project: Project }) {
  return (
    <div className="dy-overview">
      <MetricCard
        className="dy-col-4"
        title="Build success (30 days)"
        value="—"
        footer={
          <Text size="xs" tone="secondary">
            No builds yet
          </Text>
        }
        headingLevel={3}
      />
      <MetricCard
        className="dy-col-4"
        title="Last build"
        value="—"
        footer={
          <Text size="xs" tone="secondary">
            No builds yet
          </Text>
        }
        headingLevel={3}
      />
      <MetricCard
        className="dy-col-4"
        title="Current deployment"
        subtitle="Application health"
        value="—"
        footer={<StatusIndicator tone="neutral">Not deployed</StatusIndicator>}
        headingLevel={3}
      />
      <LaterCard
        className="dy-col-7"
        title="Recent builds"
        icon={<Hammer size={32} aria-hidden />}
        empty="No builds yet"
        phase="Builds run once the build engine is enabled (Phase 5)."
      />
      <MembersCard project={project} />
      <LaterCard
        className="dy-col-7"
        title="Deployment history"
        icon={<Rocket size={32} aria-hidden />}
        empty="No deployments yet"
        phase="Deployments arrive with the deployment engine (Phase 6)."
      />
      <LaterCard
        className="dy-col-5"
        title="Recent commits"
        icon={<GitCommitHorizontal size={32} aria-hidden />}
        empty="No commits yet"
        phase="Commits appear once Git integration is enabled (Phase 4)."
      />
    </div>
  );
}

function LaterSection({
  icon,
  title,
  phase,
}: {
  icon: React.ReactNode;
  title: string;
  phase: string;
}) {
  return (
    <div className="dy-empty-center">
      <EmptyState size="sm" icon={icon} title={title} description={phase} headingLevel={3} />
    </div>
  );
}

/** DY-D1 Screen 6: project dashboard (ObjectPage, Overview tab). */
export function ProjectPage() {
  const { id = '' } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const project = useResource(() => api.getProject(id), id);
  const [deleting, setDeleting] = useState(false);

  if (project.state === 'error' && !project.data) {
    const notFound = project.error instanceof ApiError && project.error.status === 404;
    return (
      <>
        <RouteCrumbs
          crumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Not found' }]}
          onRefresh={project.reload}
        />
        <div className="dy-empty-center">
          <EmptyState
            title={notFound ? 'Project not found' : 'Couldn’t load this project'}
            description={
              notFound
                ? 'It may have been deleted, or you don’t have access to it.'
                : project.error.message
            }
            actions={
              <Button variant="secondary" onClick={() => navigate('/projects')}>
                Back to projects
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const p = project.data;
  if (!p)
    return (
      <>
        <RouteCrumbs crumbs={[{ label: 'Projects', href: '/projects' }, { label: '…' }]} />
        <div className="dy-page-pad" role="status" aria-busy="true" aria-label="Loading project">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" lines={4} />
        </div>
      </>
    );

  const confirmDelete = async () => {
    try {
      await api.deleteProject(p.id);
      notifyProjectsChanged();
      toast.show({ title: `Project ${p.name} deleted`, tone: 'success' });
      navigate('/projects');
    } catch (err) {
      setDeleting(false);
      toast.show({
        title: 'Could not delete the project',
        description: err instanceof Error ? err.message : undefined,
        tone: 'error',
      });
    }
  };

  const menu = [
    { id: 'settings', label: 'Settings', disabled: true, description: 'Coming in B6b' },
    { id: 'share', label: 'Share', disabled: true, description: 'Coming in B6b' },
    ...(p.myRole === 'owner' ? [{ id: 'delete', label: 'Delete', destructive: true }] : []),
  ];

  return (
    <>
      <RouteCrumbs
        crumbs={[{ label: 'Projects', href: '/projects' }, { label: p.name }]}
        onRefresh={project.reload}
      />
      <ObjectPage
        className="dy-object-page"
        title={p.name}
        subtitle={p.description || undefined}
        avatar={<Avatar name={p.name.replace(/[-_]+/g, ' ')} shape="square" size="lg" decorative />}
        status={
          p.archived ? (
            <StatusIndicator tone="warning">Archived</StatusIndicator>
          ) : (
            <StatusIndicator tone="neutral">Not deployed</StatusIndicator>
          )
        }
        actions={
          <>
            <Button variant="primary" disabled title="The IDE arrives in Phase 3">
              Open in IDE
            </Button>
            <OverflowMenu
              label="More project actions"
              items={menu}
              onAction={(a) => a === 'delete' && setDeleting(true)}
            />
          </>
        }
        attributes={[
          { label: 'Owner', value: p.owner.displayName },
          { label: 'Template', value: templateLabel(p) },
          { label: 'Language', value: p.primaryLanguage ?? '—' },
          { label: 'Your role', value: p.myRole ? ROLE_LABEL[p.myRole] : 'Admin access' },
          { label: 'Created', value: formatDate(p.createdAt) },
          { label: 'Updated', value: timeAgo(p.updatedAt) },
        ]}
        navigation="tabs"
        sections={[
          { id: 'overview', title: 'Overview', content: <Overview project={p} /> },
          {
            id: 'builds',
            title: 'Builds',
            content: (
              <LaterSection
                icon={<Hammer size={40} aria-hidden />}
                title="No builds yet"
                phase="Builds run once the build engine is enabled (Phase 5)."
              />
            ),
          },
          {
            id: 'deployments',
            title: 'Deployments',
            content: (
              <LaterSection
                icon={<Rocket size={40} aria-hidden />}
                title="No deployments yet"
                phase="Deployments arrive with the deployment engine (Phase 6)."
              />
            ),
          },
          {
            id: 'repository',
            title: 'Repository',
            content: (
              <LaterSection
                icon={<GitBranch size={40} aria-hidden />}
                title="No repository yet"
                phase="Repository management arrives with Git integration (Phase 4)."
              />
            ),
          },
          {
            id: 'settings',
            title: 'Settings',
            content: (
              <LaterSection
                icon={<Users size={40} aria-hidden />}
                title="Settings and members are on the way"
                phase="Project settings and member management ship in the next batch (B6b)."
              />
            ),
          },
        ]}
      />
      <AlertDialog
        open={deleting}
        tone="error"
        title={`Delete ${p.name}?`}
        confirmLabel="Delete project"
        onCancel={() => setDeleting(false)}
        onConfirm={confirmDelete}
      >
        The project is removed for everyone who has access to it.
      </AlertDialog>
    </>
  );
}
