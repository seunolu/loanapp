import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '../../../src/ui/Badge';
import { Button } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { Input } from '../../../src/ui/Input';
import { Screen } from '../../../src/ui/Screen';
import { SectionHeader } from '../../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../../src/ui/theme';
import { initiateRepayment, setupMandate } from '../../../src/lib/api';

export default function PayNowScreen() {
  const [loanId, setLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();
  const payNowMutation = useMutation({
    mutationFn: async () =>
      initiateRepayment({
        loanId: loanId.trim(),
        amount: Number(amount)
      }),
    onSuccess: async (result) => {
      if (result.authorizationUrl) {
        await Linking.openURL(result.authorizationUrl);
      }
    }
  });

  const setupMandateMutation = useMutation({
    mutationFn: async () =>
      setupMandate({
        loanId: loanId.trim(),
        maxAmount: Number(amount)
      }),
    onSuccess: async (result) => {
      if (result.authorizationUrl) {
        await Linking.openURL(result.authorizationUrl);
      }
      await queryClient.invalidateQueries({ queryKey: ['borrower', 'mandates'] });
    }
  });

  return (
    <Screen>
      <SectionHeader title="Pay now" subtitle="Use one-time payment or enable auto-debit." />
      <Card>
        <View style={styles.stack}>
          <Badge label="Paystack" tone="info" />
          <Input
            label="Loan ID"
            value={loanId}
            onChangeText={setLoanId}
            autoCapitalize="none"
            placeholder="Enter loan application ID"
          />
          <Input
            label="Amount (NGN)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="e.g. 15000"
          />
          <Text style={styles.body}>
            You will be redirected to Paystack to complete payment authorization securely.
          </Text>
          <Button
            label="Pay now"
            onPress={() => payNowMutation.mutate()}
            loading={payNowMutation.isPending}
            disabled={!loanId.trim() || !amount.trim()}
          />
          <Button
            label="Enable auto-debit"
            variant="secondary"
            onPress={() => setupMandateMutation.mutate()}
            loading={setupMandateMutation.isPending}
            disabled={!loanId.trim() || !amount.trim()}
          />
          {(payNowMutation.error || setupMandateMutation.error) ? (
            <Text style={styles.error}>
              {(payNowMutation.error as Error | null)?.message ??
                (setupMandateMutation.error as Error | null)?.message ??
                'Action failed.'}
            </Text>
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  body: { ...typography.body, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger }
});
