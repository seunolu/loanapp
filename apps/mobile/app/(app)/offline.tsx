import { useRouter } from 'expo-router';
import { Button, Card, Screen, Text } from '../../src/ui';

export default function OfflineScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Text variant="h2">You are offline</Text>
        <Text variant="bodyMuted">Reconnect to keep your balances, repayments, and support activity up to date.</Text>
        <Button label="Retry" onPress={() => router.replace('/home' as never)} />
      </Card>
    </Screen>
  );
}