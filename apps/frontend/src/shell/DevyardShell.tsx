import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FolderKanban, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
  AppShell,
  ApplicationHeader,
  IconButton,
  NavigationGroup,
  NavigationItem,
  NotificationCenter,
  PermissionGate,
  SearchField,
  Select,
  SideNavigation,
  Text,
  useAppShell,
  type MenuEntry,
} from '@enterprise-ui/react';
import mark24 from '../assets/devyard-mark-24.svg';
import { useAuth } from '../auth/AuthProvider';
import { APP_VERSION } from '../config';
import { NAVIGATION, filterNavigation, findActive, type NavNode } from './navigation';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  developer: 'Developer',
  viewer: 'Viewer',
};

const USER_MENU: MenuEntry[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'sessions', label: 'Active sessions' },
  { type: 'separator' },
  { id: 'account', label: 'Manage account' },
  { id: 'logout', label: 'Sign out' },
];

const HELP_MENU: MenuEntry[] = [
  { id: 'docs', label: 'Documentation' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'about', label: 'About Devyard' },
];

function ProjectContext({ fullWidth = false }: { fullWidth?: boolean }) {
  // Phase 1 B5: only "All projects" until the projects API (B4/B6) lands.
  const [value, setValue] = useState<string | null>('all');
  return (
    <div className={fullWidth ? undefined : 'dy-header-context'}>
      <Select
        aria-label="Project context"
        size="md"
        value={value}
        onChange={setValue}
        options={[
          { value: 'all', label: 'All projects', icon: <FolderKanban size={16} aria-hidden /> },
        ]}
      />
    </div>
  );
}

function NavTree({
  activeId,
  permissions,
}: {
  activeId: string | undefined;
  permissions: readonly string[];
}) {
  const shell = useAppShell();
  const navigate = useNavigate();
  const groups = useMemo(() => filterNavigation(NAVIGATION, permissions), [permissions]);
  const byId = useMemo(() => {
    const m = new Map<string, NavNode>();
    const walk = (ns: NavNode[]) =>
      ns.forEach((n) => (m.set(n.id, n), n.children && walk(n.children)));
    groups.forEach((g) => walk(g.items));
    return m;
  }, [groups]);
  const isMobile = shell?.isMobile ?? false;
  const activeTop = activeId?.split('.')[0];

  const onNavigate = (id: string, event: MouseEvent) => {
    const node = byId.get(id);
    if (!node) return;
    event.preventDefault();
    navigate(node.path);
    shell?.setMobileNavOpen(false);
  };

  const renderNode = (n: NavNode): ReactNode => {
    const Icon = n.icon;
    const item = (
      <NavigationItem
        key={n.id}
        id={n.id}
        label={n.label}
        href={n.children ? undefined : n.path}
        icon={Icon ? <Icon size={16} aria-hidden /> : undefined}
        defaultExpanded={
          !isMobile && n.id === activeTop && n.id !== 'admin'
            ? true
            : n.id === 'projects' && !isMobile
        }
      >
        {n.children?.map(renderNode)}
      </NavigationItem>
    );
    return n.permission ? (
      <PermissionGate key={n.id} allowed={permissions.includes(n.permission)}>
        {item}
      </PermissionGate>
    ) : (
      item
    );
  };

  const collapsed = shell?.navCollapsed ?? false;
  return (
    <div className={isMobile ? 'dy-drawer-body' : 'dy-nav-body'}>
      {isMobile && (
        <div className="dy-drawer-context">
          <ProjectContext fullWidth />
        </div>
      )}
      <SideNavigation
        className="dy-nav"
        activeId={activeId}
        onNavigate={onNavigate}
        collapsed={collapsed}
        footer={
          <li className="dy-nav-footer">
            {!collapsed && (
              <Text size="xs" tone="secondary">
                Phase 1 · v{APP_VERSION}
              </Text>
            )}
            {!isMobile && (
              <IconButton
                icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                variant="tertiary"
                neutral
                size="sm"
                onClick={() => shell?.setNavCollapsed(!collapsed)}
              />
            )}
          </li>
        }
      >
        {groups.map((g) => (
          <NavigationGroup key={g.label} label={g.label}>
            {g.items.map(renderNode)}
          </NavigationGroup>
        ))}
      </SideNavigation>
    </div>
  );
}

function Header() {
  const { status, logout } = useAuth();
  const shell = useAppShell();
  const navigate = useNavigate();
  const user = status.kind === 'authenticated' ? status.auth.user : null;
  const isMobile = shell?.isMobile ?? false;

  const onUserAction = (id: string) => {
    if (id === 'logout') void logout().then(() => navigate('/'));
    else if (id === 'sessions') navigate('/account/sessions');
    else navigate('/account');
  };

  return (
    <ApplicationHeader
      productName="Devyard"
      secondaryTitle={isMobile ? undefined : 'Build. Test. Deploy.'}
      logo={<img src={mark24} width={24} height={24} alt="" />}
      homeHref="/"
      search={
        <div className="dy-header-search">
          <SearchField
            aria-label="Search"
            placeholder="Search projects, pipelines, deployments…"
            size="md"
          />
        </div>
      }
      actions={isMobile ? undefined : <ProjectContext />}
      helpItems={HELP_MENU}
      onHelpAction={() => {}}
      notificationCount={0}
      notifications={<NotificationCenter notifications={[]} />}
      onNotificationsClick={() => {}}
      user={
        user
          ? {
              name: user.displayName,
              email: user.email,
              role: user.roles.map((r) => ROLE_LABEL[r] ?? r).join(', '),
            }
          : undefined
      }
      userMenuItems={USER_MENU}
      onUserAction={onUserAction}
    />
  );
}

/** DY-D1 Screen 2: AppShell + ApplicationHeader + SideNavigation (§23, permission-filtered). */
export function DevyardShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { pathname } = useLocation();
  const permissions = status.kind === 'authenticated' ? status.auth.user.permissions : [];
  const active = findActive(NAVIGATION, pathname);

  return (
    <AppShell
      header={<Header />}
      navigation={<NavTree activeId={active?.id} permissions={permissions} />}
    >
      {children}
    </AppShell>
  );
}
