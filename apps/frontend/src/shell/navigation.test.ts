import { describe, expect, it } from 'vitest';
import {
  NAVIGATION,
  filterNavigation,
  findActive,
  flattenNavigation,
  trailFor,
} from './navigation';

describe('§23 navigation', () => {
  it('lists the top-level sections in spec order', () => {
    expect(NAVIGATION.flatMap((g) => g.items.map((i) => i.label))).toEqual([
      'Dashboard',
      'Projects',
      'Playground',
      'Development',
      'Git',
      'Pipelines',
      'Deployments',
      'Monitoring',
      'Notifications',
      'Administration',
    ]);
  });

  it('hides Administration without admin.access', () => {
    const labels = flattenNavigation(filterNavigation(NAVIGATION, ['projects.create'])).map(
      (n) => n.label,
    );
    expect(labels).not.toContain('Administration');
    expect(labels).not.toContain('Users');
    expect(labels).toContain('Projects');
  });

  it('shows Administration and its six children for admins', () => {
    const admin = flattenNavigation(filterNavigation(NAVIGATION, ['admin.access'])).find(
      (n) => n.id === 'admin',
    );
    expect(admin?.children?.map((c) => c.label)).toEqual([
      'Users',
      'Permissions',
      'Storage',
      'Infrastructure',
      'Security',
      'Settings',
    ]);
  });

  it('resolves the active node and breadcrumb trail', () => {
    expect(findActive(NAVIGATION, '/')?.id).toBe('dashboard');
    expect(findActive(NAVIGATION, '/projects')?.id).toBe('projects.all');
    expect(findActive(NAVIGATION, '/projects/mine')?.id).toBe('projects.mine');
    expect(findActive(NAVIGATION, '/git/branches/x')?.id).toBe('git.branches');
    expect(trailFor(NAVIGATION, 'projects.all').map((n) => n.label)).toEqual([
      'Projects',
      'All Projects',
    ]);
  });
});
