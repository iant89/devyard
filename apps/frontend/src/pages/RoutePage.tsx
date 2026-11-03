import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { RefreshCw } from 'lucide-react';
import { AppBreadcrumbBar, Button, IconButton, Page, useAppShell } from '@enterprise-ui/react';
import { NAVIGATION, findActive, trailFor } from '../shell/navigation';

/** Breadcrumb bar (Devyard / … / current) + Page for a §23 route. */
export function RoutePage({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const { pathname } = useLocation();
  const shell = useAppShell();
  const isMobile = shell?.isMobile ?? false;
  const active = findActive(NAVIGATION, pathname);
  const trail = active ? trailFor(NAVIGATION, active.id) : [];
  const items = [
    { label: 'Devyard', href: '/' },
    ...trail.map((n, i) =>
      i === trail.length - 1
        ? { label: n.label }
        : { label: n.label, href: n.children?.[0]?.path ?? n.path },
    ),
  ];
  const crumbs = trail.length === 0 && title ? [...items, { label: title }] : items;

  return (
    <>
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
              onClick={() => window.location.reload()}
            />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          )
        }
      />
      <Page title={title ?? active?.label ?? 'Devyard'} subtitle={subtitle} actions={actions}>
        {children}
      </Page>
    </>
  );
}
