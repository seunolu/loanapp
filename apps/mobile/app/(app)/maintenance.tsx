import { useRouter } from 'expo-router';
import { Button, Card, Screen, Text } from '../../src/ui';

export default function MaintenanceScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Text variant="h2">Scheduled maintenance</Text>
        <Text variant="bodyMuted">We are temporarily unavailable while we improve core services. Please try again shortly.</Text>
        <Button label="Back to home" onPress={() => router.replace('/home' as never)} />
      </Card>
    </Screen>
  );
}