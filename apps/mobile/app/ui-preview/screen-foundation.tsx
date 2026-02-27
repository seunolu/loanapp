import * as React from 'react';
import { Box, Button, Card, ErrorState, Screen, ScreenFooter, ScreenHeader, Text } from '../../src/ui';

const sampleParagraphs = Array.from({ length: 10 }).map((_, index) => `Scrollable content row ${index + 1}`);

export default function ScreenFoundationPreview(): React.JSX.Element {
  const [retryCount, setRetryCount] = React.useState(0);

  return (
    <Screen
      preset="scroll"
      padding="md"
      header={<ScreenHeader title="UI Preview" subtitle="Screen Foundation" safeTop={false} divider />}
    >
      <Card>
        <Text variant="h2">1) Fixed Screen</Text>
        <Text variant="bodyMuted">Header, fixed content and sticky footer action.</Text>
        <Box style={{ height: 260, overflow: 'hidden' }} radius="md" borderColor="border" borderWidth={1} mt="sm">
          <Screen
            preset="fixed"
            padding="sm"
            safeTop={false}
            safeBottom={false}
            header={<ScreenHeader title="Account Summary" safeTop={false} divider />}
            footer={
              <ScreenFooter>
                <Button label="Continue" fullWidth />
              </ScreenFooter>
            }
          >
            <Text>Fixed screens do not scroll and keep actions pinned.</Text>
          </Screen>
        </Box>
      </Card>

      <Card>
        <Text variant="h2">2) Scroll Screen</Text>
        <Text variant="bodyMuted">Long content automatically scrolls with keyboard-safe taps.</Text>
        <Box style={{ height: 260, overflow: 'hidden' }} radius="md" borderColor="border" borderWidth={1} mt="sm">
          <Screen preset="scroll" padding="sm" safeTop={false} safeBottom={false} header={<ScreenHeader title="Terms" safeTop={false} divider />}>
            <Box gap="sm">
              {sampleParagraphs.map((row) => (
                <Text key={row} variant="bodyMuted">
                  {row}
                </Text>
              ))}
            </Box>
          </Screen>
        </Box>
      </Card>

      <Card>
        <Text variant="h2">3) Error State</Text>
        <Text variant="bodyMuted">Retry callback count: {retryCount}</Text>
        <ErrorState
          title="Unable to load applications"
          message="Network request failed. Please retry."
          retryLabel="Retry"
          onRetry={() => setRetryCount((value) => value + 1)}
        />
      </Card>
    </Screen>
  );
}
