import type { ComponentType } from 'react';
import {
  Activity,
  Bell,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  MonitorCog,
  Rocket,
  Shield,
  SquareCode,
  Workflow,
} from 'lucide-react';

/** One node of the SPEC §23 navigation tree. `permission` gates visibility (SPEC §23 "adapt to permissions"). */
export interface NavNode {
  id: string;
  label: string;
  path: string;
  icon?: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  permission?: string;
  children?: NavNode[];
}

export interface NavGroup {
  label: string;
  items: NavNode[];
}

const leaf = (id: string, label: string, path: string): NavNode => ({ id, label, path });

/** SPEC §23, exact order and labels; DY-D1 Screen 2 groups "Build" / "System". */
export const NAVIGATION: NavGroup[] = [
  {
    label: 'Build',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
      {
        id: 'projects',
        label: 'Projects',
        path: '/projects',
        icon: FolderGit2,
        children: [
          leaf('projects.all', 'All Projects', '/projects'),
          leaf('projects.mine', 'My Projects', '/projects/mine'),
          leaf('projects.shared', 'Shared Projects', '/projects/shared'),
        ],
      },
      {
        id: 'playground',
        label: 'Playground',
        path: '/playground',
        icon: SquareCode,
        children: [
          leaf('playground.new', 'New Playground', '/playground/new'),
          leaf('playground.saved', 'Saved Playgrounds', '/playground/saved'),
        ],
      },
      {
        id: 'development',
        label: 'Development',
        path: '/development',
        icon: MonitorCog,
        children: [
          leaf('development.workspaces', 'Workspaces', '/development/workspaces'),
          leaf('development.environments', 'Environments', '/development/environments'),
        ],
      },
      {
        id: 'git',
        label: 'Git',
        path: '/git',
        icon: GitBranch,
        children: [
          leaf('git.repositories', 'Repositories', '/git/repositories'),
          leaf('git.branches', 'Branches', '/git/branches'),
          leaf('git.remotes', 'Remotes', '/git/remotes'),
        ],
      },
      {
        id: 'pipelines',
        label: 'Pipelines',
        path: '/pipelines',
        icon: Workflow,
        children: [
          leaf('pipelines.all', 'All Pipelines', '/pipelines'),
          leaf('pipelines.history', 'Build History', '/pipelines/history'),
          leaf('pipelines.runners', 'Runners', '/pipelines/runners'),
        ],
      },
      {
        id: 'deployments',
        label: 'Deployments',
        path: '/deployments',
        icon: Rocket,
        children: [
          leaf('deployments.applications', 'Applications', '/deployments/applications'),
          leaf('deployments.history', 'Deployment History', '/deployments/history'),
          leaf('deployments.domains', 'Domains', '/deployments/domains'),
        ],
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        path: '/monitoring',
        icon: Activity,
        children: [
          leaf('monitoring.system', 'System', '/monitoring/system'),
          leaf('monitoring.applications', 'Applications', '/monitoring/applications'),
          leaf('monitoring.logs', 'Logs', '/monitoring/logs'),
        ],
      },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
      {
        id: 'admin',
        label: 'Administration',
        path: '/admin',
        icon: Shield,
        permission: 'admin.access',
        children: [
          leaf('admin.users', 'Users', '/admin/users'),
          leaf('admin.permissions', 'Permissions', '/admin/permissions'),
          leaf('admin.storage', 'Storage', '/admin/storage'),
          leaf('admin.infrastructure', 'Infrastructure', '/admin/infrastructure'),
          leaf('admin.security', 'Security', '/admin/security'),
          leaf('admin.settings', 'Settings', '/admin/settings'),
        ],
      },
    ],
  },
];

/** Removes nodes the user lacks permission for (recursively); drops empty groups. UI-only — the API enforces. */
export function filterNavigation(groups: NavGroup[], permissions: readonly string[]): NavGroup[] {
  const has = new Set(permissions);
  const visit = (nodes: NavNode[]): NavNode[] =>
    nodes
      .filter((n) => !n.permission || has.has(n.permission))
      .map((n) => (n.children ? { ...n, children: visit(n.children) } : n));
  return groups.map((g) => ({ ...g, items: visit(g.items) })).filter((g) => g.items.length > 0);
}

/** All nodes, depth first. */
export function flattenNavigation(groups: NavGroup[]): NavNode[] {
  const out: NavNode[] = [];
  const walk = (nodes: NavNode[]) =>
    nodes.forEach((n) => {
      out.push(n);
      if (n.children) walk(n.children);
    });
  groups.forEach((g) => walk(g.items));
  return out;
}

/** The deepest node whose path matches `pathname` exactly, else the longest prefix match. */
export function findActive(groups: NavGroup[], pathname: string): NavNode | undefined {
  const all = flattenNavigation(groups);
  const exactLeaf = [...all].reverse().find((n) => n.path === pathname);
  if (exactLeaf) return exactLeaf;
  return all
    .filter((n) => n.path !== '/' && pathname.startsWith(n.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

/** Breadcrumb trail (labels + paths) for a node id. */
export function trailFor(groups: NavGroup[], id: string): NavNode[] {
  const search = (nodes: NavNode[], acc: NavNode[]): NavNode[] | null => {
    for (const n of nodes) {
      const next = [...acc, n];
      if (n.id === id) return next;
      if (n.children) {
        const found = search(n.children, next);
        if (found) return found;
      }
    }
    return null;
  };
  for (const g of groups) {
    const found = search(g.items, []);
    if (found) return found;
  }
  return [];
}
