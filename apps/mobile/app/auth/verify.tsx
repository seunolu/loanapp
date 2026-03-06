import { useLocalSearchParams } from 'expo-router';
import { LegacyRouteRedirect, toHref } from '../../src/routing/LegacyRouteRedirect';

export default function LegacyAuthVerifyScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();

  return <LegacyRouteRedirect href={toHref('/otp', params)} message="Opening verification" />;
}