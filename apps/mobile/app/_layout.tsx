import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppQueryProvider } from '../src/providers/query-provider';

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppQueryProvider>
  );
}
