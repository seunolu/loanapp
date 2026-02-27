import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../src/providers/auth-provider';
import { useKyc } from '../../../src/providers/kyc-provider';
import { Badge, Button, Card, Screen, SectionHeader, colors, spacing, typography } from '../../../src/ui';

export default function ProfileIndexScreen() {
  const { logout } = useAuth();
  const { percentComplete, isComplete } = useKyc();
  return (
    <Screen>
      <SectionHeader title="Jane Borrower" subtitle="Account profile" right={<Badge label={isComplete ? 'KYC Complete' : 'KYC Pending'} tone={isComplete ? 'success' : 'warning'} />} />
      <Card>
        <Text style={styles.body}>KYC Progress: {percentComplete}%</Text>
        <View style={styles.tiles}>
          <Link href={'/profile/kyc' as any} asChild>
            <Button label="KYC Checklist" variant="secondary" />
          </Link>
          <Link href={'/profile/settings' as any} asChild>
            <Button label="Settings" variant="secondary" />
          </Link>
        </View>
      </Card>
      <Card>
        <Text style={styles.body}>Support and legal resources will be linked here.</Text>
      </Card>
      <Button label="Logout" variant="danger" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.text },
  tiles: { gap: spacing.sm }
});


