import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderPlus, Plus } from 'lucide-react';
import type { Project } from '@devyard/contracts';
import {
  AlertDialog,
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  MessageStrip,
  ObjectIdentifier,
  OverflowMenu,
  Pagination,
  SearchField,
  SegmentedButton,
  Select,
  Table,
  Text,
  useAppShell,
  useToast,
  type SortState,
  type TableColumn,
} from '@enterprise-ui/react';
import { useAuth } from '../auth/AuthProvider';
import { RoutePage } from '../pages/RoutePage';
import { notifyProjectsChanged, onProjectsChanged } from '../lib/projectsBus';
import { timeAgo } from '../lib/time';
import { useResource } from '../lib/useResource';
import { CreateProjectDialog } from './CreateProjectDialog';
import { ROLE_LABEL, templateLabel } from './templates';

export type ProjectScope = 'all' | 'mine' | 'shared';

const SCOPE_PATH: Record<ProjectScope, string> = {
  all: '/projects',
  mine: '/projects/mine',
  shared: '/projects/shared',
};

const SORTS = [
  { value: '-updatedAt', label: 'Last activity' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: '-name', label: 'Name (Z–A)' },
  { value: '-createdAt', label: 'Newest' },
  { value: 'createdAt', label: 'Oldest' },
];

const COLUMN_SORT: Record<string, string> = {
  name: 'name',
  updated: 'updatedAt',
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** DY-D1 Screen 4: Projects list (All / Mine / Shared), desktop table and mobile list. */
export function ProjectsPage({ scope }: { scope: ProjectScope }) {
  const { api, status } = useAuth();
  const me = status.kind === 'authenticated' ? status.auth.user : null;
  const canCreate = !!me?.permissions.includes('projects.create');
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useAppShell()?.isMobile ?? false;

  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 250);
  const [sort, setSort] = useState('-updatedAt');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const [pageSize, setPageSize] = useState(25);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  // Any filter change sends the user back to page 1.
  const filterKey = `${scope}|${q}|${sort}|${pageSize}`;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const list = useResource(
    () => api.listProjects({ scope, q: q || undefined, sort, page, pageSize }),
    JSON.stringify({ scope, q, sort, page, pageSize }),
  );
  const { reload } = list;
  useEffect(() => onProjectsChanged(reload), [reload]);

  const rows = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const filtered = q !== '';
  const firstLoad = list.state === 'loading' && !list.data;
  const empty = !firstLoad && total === 0 && !filtered && list.state !== 'error';

  const openProject = (p: Project) => navigate(`/projects/${p.id}`);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteProject(deleting.id);
      toast.show({ title: `Project ${deleting.name} deleted`, tone: 'success' });
      notifyProjectsChanged();
    } catch (err) {
      toast.show({
        title: 'Could not delete the project',
        description: err instanceof Error ? err.message : undefined,
        tone: 'error',
      });
    } finally {
      setDeleting(null);
    }
  };

  const rowMenu = (p: Project) => (
    <OverflowMenu
      label={`Actions for ${p.name}`}
      items={[
        { id: 'open', label: 'Open' },
        ...(p.myRole === 'owner'
          ? [{ id: 'delete', label: 'Delete', destructive: true } as const]
          : []),
      ]}
      onAction={(id) => (id === 'open' ? openProject(p) : setDeleting(p))}
    />
  );

  const ownerCell = (p: Project) => (
    <span className="dy-owner">
      <Avatar name={p.owner.displayName} size="xs" decorative />
      <span>{p.owner.id === me?.id ? `${p.owner.displayName} (you)` : p.owner.displayName}</span>
      {p.owner.id !== me?.id && p.access === 'member' && <Badge tone="warning">Shared</Badge>}
    </span>
  );

  const columns: TableColumn<Project>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        rowHeader: true,
        width: 280,
        cell: (p) => (
          <ObjectIdentifier
            title={p.name}
            text={p.description || undefined}
            href={`/projects/${p.id}`}
            onClick={() => openProject(p)}
          />
        ),
      },
      { id: 'template', header: 'Template / Framework', width: 200, cell: (p) => templateLabel(p) },
      { id: 'owner', header: 'Owner', cell: ownerCell },
      {
        id: 'role',
        header: 'Your role',
        width: 130,
        cell: (p) => (p.myRole ? ROLE_LABEL[p.myRole] : <Text tone="secondary">Admin access</Text>),
      },
      {
        id: 'updated',
        header: 'Updated',
        sortable: true,
        width: 130,
        cell: (p) => (
          <span title={new Date(p.updatedAt).toLocaleString()}>{timeAgo(p.updatedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: <span className="dy-sr-only">Actions</span>,
        width: 56,
        align: 'end',
        cell: rowMenu,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me?.id],
  );

  const tableSort: SortState | null = (() => {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    const col = Object.entries(COLUMN_SORT).find(([, f]) => f === field)?.[0];
    return col ? { columnId: col, direction: desc ? 'descending' : 'ascending' } : null;
  })();
  const onTableSort = (s: SortState | null) => {
    if (!s) return setSort('-updatedAt');
    const field = COLUMN_SORT[s.columnId];
    if (field) setSort(s.direction === 'descending' ? `-${field}` : field);
  };

  const newButton = canCreate ? (
    isMobile ? (
      <IconButton
        icon={<Plus />}
        label="New project"
        variant="primary"
        onClick={() => setCreating(true)}
      />
    ) : (
      <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
        New project
      </Button>
    )
  ) : undefined;

  const scopeToggle = (
    <SegmentedButton
      aria-label="Project scope"
      className={isMobile ? 'dy-full-width' : undefined}
      items={[
        { value: 'all', label: 'All' },
        { value: 'mine', label: 'Mine' },
        { value: 'shared', label: 'Shared' },
      ]}
      value={[scope]}
      onChange={(v) => v[0] && navigate(SCOPE_PATH[v[0] as ProjectScope])}
    />
  );

  const emptyCopy: Record<ProjectScope, { title: string; description: string }> = {
    all: {
      title: 'No projects yet',
      description:
        'Create a project from a template, start from a Quick Playground, or import an existing Git or GitHub repository.',
    },
    mine: {
      title: 'You don’t own any projects yet',
      description: 'Projects you create appear here.',
    },
    shared: {
      title: 'Nothing shared with you yet',
      description: 'Projects other people add you to appear here.',
    },
  };

  const filteredEmpty = (
    <EmptyState
      size="sm"
      title="No projects match these filters"
      actions={
        <Button variant="tertiary" onClick={() => setSearch('')}>
          Clear filters
        </Button>
      }
    />
  );

  const scopeEmptyState = (
    <div className="dy-empty-center">
      <EmptyState
        size={isMobile ? 'sm' : 'md'}
        icon={<FolderPlus size={48} aria-hidden />}
        title={emptyCopy[scope].title}
        description={emptyCopy[scope].description}
        actions={
          canCreate && scope !== 'shared' ? (
            <div className={isMobile ? 'dy-stack-actions' : 'dy-row-actions'}>
              <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
                New project
              </Button>
              <Button variant="secondary" disabled title="Repository import arrives in Phase 4">
                Import repository
              </Button>
            </div>
          ) : scope !== 'all' ? (
            <Button variant="secondary" onClick={() => navigate('/projects')}>
              View all projects
            </Button>
          ) : undefined
        }
      />
    </div>
  );

  return (
    <RoutePage
      title="Projects"
      subtitle={firstLoad ? '\u00a0' : `${total} ${total === 1 ? 'project' : 'projects'}`}
      actions={newButton}
      onRefresh={reload}
    >
      {list.state === 'error' && (
        <MessageStrip
          tone="error"
          title="Couldn’t load projects"
          actions={
            <Button variant="tertiary" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          {list.error.message}
        </MessageStrip>
      )}

      {empty && scope === 'all' ? (
        scopeEmptyState
      ) : (
        <div className="dy-list-page">
          <div className={isMobile ? 'dy-toolbar dy-toolbar-mobile' : 'dy-toolbar'}>
            <div className="dy-toolbar-search">
              <SearchField
                aria-label="Filter projects"
                placeholder="Filter by name or description"
                value={search}
                onChange={setSearch}
                loading={list.state === 'loading' && !!list.data && filtered}
              />
            </div>
            {scopeToggle}
            {!isMobile && (
              <div className="dy-toolbar-end">
                <Select
                  aria-label="Sort projects"
                  value={sort}
                  onChange={(v) => v && setSort(v)}
                  options={SORTS}
                />
              </div>
            )}
          </div>

          {empty ? (
            scopeEmptyState
          ) : isMobile ? (
            <ul
              className="dy-mobile-list"
              aria-label="Projects"
              aria-busy={list.state === 'loading'}
            >
              {rows.length === 0 && !firstLoad && <li>{filteredEmpty}</li>}
              {rows.map((p) => (
                <li key={p.id} className="dy-mobile-row">
                  <div className="dy-mobile-row-main">
                    <ObjectIdentifier
                      title={p.name}
                      href={`/projects/${p.id}`}
                      onClick={() => openProject(p)}
                    />
                    <Text size="xs" tone="secondary">
                      {[
                        templateLabel(p),
                        p.myRole ? ROLE_LABEL[p.myRole] : 'Admin',
                        timeAgo(p.updatedAt),
                      ].join(' · ')}
                    </Text>
                  </div>
                  {rowMenu(p)}
                </li>
              ))}
            </ul>
          ) : (
            <Table
              aria-label="Projects"
              columns={columns}
              data={rows}
              getRowId={(p) => p.id}
              getRowLabel={(p) => p.name}
              sort={tableSort}
              onSortChange={onTableSort}
              manualSorting
              loading={firstLoad}
              loadingRowCount={5}
              emptyState={filteredEmpty}
            />
          )}

          {total > 0 && (
            <Pagination
              page={page}
              onPageChange={setPage}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={isMobile ? undefined : [10, 25, 50, 100]}
              onPageSizeChange={setPageSize}
              showSummary
              aria-label="Projects pages"
            />
          )}
        </div>
      )}

      <CreateProjectDialog open={creating} onClose={() => setCreating(false)} />
      <AlertDialog
        open={!!deleting}
        tone="error"
        title={`Delete ${deleting?.name ?? 'project'}?`}
        confirmLabel="Delete project"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      >
        The project is removed for everyone who has access to it.
      </AlertDialog>
    </RoutePage>
  );
}
