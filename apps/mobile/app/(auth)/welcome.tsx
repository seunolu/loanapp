import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, spacing, typography } from '../../src/ui/theme';

export default function WelcomeScreen() {
  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Borrow with confidence.</Text>
        <Text style={styles.subtitle}>
          Fast application, clear repayment plans, and full visibility on your loan status.
        </Text>
      </View>
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
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  cardTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm }
});
