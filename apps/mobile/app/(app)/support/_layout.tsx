import { Stack } from 'expo-router';

export default function SupportLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Support' }} />
      <Stack.Screen name="new" options={{ title: 'New Case' }} />
      <Stack.Screen name="[id]" options={{ title: 'Case Detail' }} />
    </Stack>
  );
}

