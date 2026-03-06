import { useRouter } from 'expo-router';
import { Button, Card, Screen, Text } from '../../src/ui';

export default function SessionExpiredScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Text variant="h2">Session expired</Text>
        <Text variant="bodyMuted">Your session is no longer valid. Sign in again to continue safely.</Text>
        <Button label="Sign in again" onPress={() => router.replace('/login' as never)} />
      </Card>
    </Screen>
  );
}