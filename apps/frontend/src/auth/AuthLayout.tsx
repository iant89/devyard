import type { ReactNode } from 'react';
import { Stack, Text, Title } from '@enterprise-ui/react';
import mark40 from '../assets/devyard-mark-40.svg';
import { APP_VERSION, INSTANCE_HOST } from '../config';

/** Shell-less auth layout (DY-D1 Screen 1): brand block, card, footer. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dy-auth">
      <main className="dy-auth__column">
        <Stack gap={6}>
          <Stack gap={2} align="center" className="dy-auth__brand">
            <img src={mark40} width={40} height={40} alt="" />
            <Title level={1} size="2xl">
              Devyard
            </Title>
            <Text size="sm" tone="secondary">
              Build. Test. Deploy.
            </Text>
          </Stack>
          {children}
          <div className="dy-auth__footer">
            <Text size="xs" tone="secondary">
              Self-hosted instance · {INSTANCE_HOST}
            </Text>
            <Text size="xs" tone="secondary">
              v{APP_VERSION}
            </Text>
          </div>
        </Stack>
      </main>
    </div>
  );
}
