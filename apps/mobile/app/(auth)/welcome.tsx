import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet } from 'react-native';
import { brand } from '../../src/brand';
import { clearLocalAppState } from '../../src/lib/storage';
import { useAuth } from '../../src/providers/auth-provider';
import { useTenant } from '../../src/tenant/tenant-context';
import { Box, Button, Card, Screen, ScreenFooter, ScreenHeader, Text, colors, spacing, typography } from '../../src/ui';

export default function WelcomeScreen() {
  const { logout } = useAuth();
  const { clearTenant } = useTenant();
  const [isResetting, setIsResetting] = useState(false);

  const onResetLocalState = () => {
    Alert.alert('Reset local app state?', 'This clears local auth, tenant, and device info on this emulator only.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsResetting(true);
            await logout();
            await clearLocalAppState();
            clearTenant();
            Alert.alert('Done', 'Local app state was cleared.');
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Failed to reset local app state.';
            Alert.alert('Reset failed', message);
          } finally {
            setIsResetting(false);
          }
        }
      }
    ]);
  };

  return (
    <Screen
      preset="fixed"
      safeTop={false}
      contentStyle={styles.content}
      header={<ScreenHeader title={brand.appName} subtitle={brand.tagline} safeTop variant="transparent" />}
      footer={
        <ScreenFooter style={styles.footer}>
          <Button label="Reset Local App State" loading={isResetting} onPress={onResetLocalState} variant="danger" />
        </ScreenFooter>
      }
    >
      <Box style={styles.hero}>
        <Image source={brand.logo} resizeMode="contain" style={styles.logo} />
        <Text style={[styles.title, { color: brand.colors.primary }]}>{brand.appName}</Text>
        <Text style={styles.subtitle}>
          {brand.tagline} Fast application, clear repayment plans, and full visibility on your loan status.
        </Text>
      </Box>
      <Card>
        <Text style={styles.cardTitle}>Get started</Text>
        <Link href={'/login' as any} asChild>
          <Button label="Log In" />
        </Link>
        <Link href={'/signup' as any} asChild>
          <Button label="Create Account" variant="secondary" />
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', flex: 1, gap: spacing.xl },
  hero: { gap: spacing.sm },
  footer: { gap: spacing.sm },
  logo: { width: 40, height: 40 },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  cardTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm }
});
