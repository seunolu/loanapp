import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Screen } from '../../../../src/ui/Screen';
import { colors, typography } from '../../../../src/ui/theme';

export default function SubmittedScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? 'loan_mock_001';

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Application submitted</Text>
        <Text style={styles.body}>We have received your request. You can now track your application status.</Text>
        <Link href={`/loans/${id}` as any} asChild>
          <Button label="View Status" />
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.success },
  body: { ...typography.body, color: colors.textMuted }
});
