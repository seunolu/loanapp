import { useRouter } from 'expo-router';
import { Alert, Linking, StyleSheet } from 'react-native';
import { Button, Card, Screen, Text, TopNav, colors, typography } from '../../../src/ui';

export default function LegalScreen() {
  const router = useRouter();

  const openPlaceholderLink = async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', `${label} link is not configured yet.`);
    }
  };

  return (
    <Screen>
      <TopNav title="Legal" subtitle="Privacy, terms, and policy placeholders." onBack={() => router.back()} />
      <Card>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.body}>Review how your data is handled and protected.</Text>
        <Button label="Open privacy policy" variant="secondary" onPress={() => void openPlaceholderLink('https://example.com/privacy', 'Privacy Policy')} />
      </Card>
      <Card>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.body}>Review the account, repayment, and usage terms.</Text>
        <Button label="Open terms" variant="secondary" onPress={() => void openPlaceholderLink('https://example.com/terms', 'Terms of Service')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subtitle, color: colors.text },
  body: { ...typography.body, color: colors.textMuted }
});
