import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen, colors, typography } from '../../../../src/ui';

export default function SubmittedScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Application submitted</Text>
        <Text style={styles.body}>We have received your request. You can now track your application status.</Text>
        {id ? (
          <Link href={`/loans/${id}` as any} asChild>
            <Button label="View Status" />
          </Link>
        ) : (
          <Link href={'/loans' as any} asChild>
            <Button label="Back to Loans" />
          </Link>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.success },
  body: { ...typography.body, color: colors.textMuted }
});

