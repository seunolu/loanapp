import * as React from 'react';
import { Box, Button, Screen, Text } from '../ui';
import { getMaintenanceModeState, subscribeMaintenanceMode } from './maintenance';

export function MaintenanceOverlay(): React.JSX.Element | null {
  const [active, setActive] = React.useState(() => getMaintenanceModeState());

  React.useEffect(() => {
    return subscribeMaintenanceMode(() => setActive(true));
  }, []);

  if (!active) {
    return null;
  }

  return (
    <Screen preset="fixed" safeTop safeBottom padding="lg">
      <Box flex={1} align="center" justify="center" gap="md">
        <Text variant="h1">Service under maintenance</Text>
        <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
          We&apos;re making a quick update. Please try again shortly.
        </Text>
        <Button label="Retry" onPress={() => setActive(false)} />
      </Box>
    </Screen>
  );
}

