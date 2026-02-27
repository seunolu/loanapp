import * as React from 'react';
import { Button } from '../components';
import { Box, Text } from '../primitives';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  message?: string;
  ctaLabel?: string;
  actionLabel?: string;
  onPressCta?: () => void;
  onActionPress?: () => void;
};

export function EmptyState({
  icon,
  title,
  body,
  message,
  ctaLabel,
  actionLabel,
  onPressCta,
  onActionPress
}: EmptyStateProps): React.JSX.Element {
  const resolvedBody = body ?? message;
  const resolvedLabel = ctaLabel ?? actionLabel;
  const resolvedAction = onPressCta ?? onActionPress;

  return (
    <Box bg="surface" borderColor="border" borderWidth={1} radius="lg" p="lg" align="center" justify="center" gap="sm">
      <Box
        bg="surfaceMuted"
        borderColor="border"
        borderWidth={1}
        radius="pill"
        style={{ width: 48, height: 48 }}
        align="center"
        justify="center"
      >
        {icon ?? <Text color="textMuted">○</Text>}
      </Box>
      <Text variant="h2">{title}</Text>
      {resolvedBody ? (
        <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
          {resolvedBody}
        </Text>
      ) : null}
      {resolvedLabel ? <Button variant="secondary" label={resolvedLabel} onPress={resolvedAction} /> : null}
    </Box>
  );
}

export type { EmptyStateProps };
