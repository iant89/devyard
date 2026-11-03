import { Text } from '@enterprise-ui/react';
import { RoutePage } from './RoutePage';

/** Routes from §23 whose screens ship in later batches/phases. */
export function PlaceholderPage({ title }: { title?: string }) {
  return (
    <RoutePage title={title}>
      <Text tone="secondary">This area isn't available in Phase 1 yet.</Text>
    </RoutePage>
  );
}
