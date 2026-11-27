import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { RefreshCw } from 'lucide-react';
import { AppBreadcrumbBar, Button, IconButton, Page, useAppShell } from '@enterprise-ui/react';
import { NAVIGATION, findActive, trailFor } from '../shell/navigation';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb bar (Devyard / … / current) with a Refresh action. `crumbs` replaces the trail
 * derived from §23 navigation (used by detail pages such as a project).
 */
export function RouteCrumbs({
  title,
  crumbs: override,
  onRefresh,
}: {
  title?: string;
  crumbs?: Crumb[];
  onRefresh?: () => void;
}) {
  const { pathname } = useLocation();
  const shell = useAppShell();
  const isMobile = shell?.isMobile ?? false;
  const active = findActive(NAVIGATION, pathname);
  const trail = active ? trailFor(NAVIGATION, active.id) : [];
  const derived: Crumb[] = trail.map((n, i) =>
    i === trail.length - 1
      ? { label: n.label }
      : { label: n.label, href: n.children?.[0]?.path ?? n.path },
  );
  const items: Crumb[] = [{ label: 'Devyard', href: '/' }, ...(override ?? derived)];
  const crumbs = !override && trail.length === 0 && title ? [...items, { label: title }] : items;
  const refresh = onRefresh ?? (() => window.location.reload());

  return (
    <AppBreadcrumbBar
      barClassName="dy-crumbs"
      items={isMobile ? crumbs.slice(-2) : crumbs}
      actions={
        isMobile ? (
          <IconButton
            icon={<RefreshCw />}
            label="Refresh"
            variant="tertiary"
            neutral
            onClick={refresh}
          />
        ) : (
          <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={refresh}>
            Refresh
          </Button>
        )
      }
    />
  );
}

/** Breadcrumb bar + Page for a §23 route. */
export function RoutePage({
  title,
  subtitle,
  actions,
  crumbs,
  onRefresh,
  children,
}: {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
  onRefresh?: () => void;
  children?: ReactNode;
}) {
  const { pathname } = useLocation();
  const active = findActive(NAVIGATION, pathname);
  return (
    <>
      <RouteCrumbs title={title} crumbs={crumbs} onRefresh={onRefresh} />
      <Page title={title ?? active?.label ?? 'Devyard'} subtitle={subtitle} actions={actions}>
        {children}
      </Page>
    </>
  );
}
