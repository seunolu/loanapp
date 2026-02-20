import { Stack } from 'expo-router';

export default function HardshipLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Hardship' }} />
      <Stack.Screen name="new" options={{ title: 'New Hardship Request' }} />
      <Stack.Screen name="[id]" options={{ title: 'Hardship Detail' }} />
    </Stack>
  );
}

