import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { KycActionSheet } from '../../../src/features/kyc/KycActionSheet';
import { useLoanDetail } from '../../../src/features/loan-history/loanDetail.queries';
import { useLoanHistory } from '../../../src/features/loan-history/loanHistory.queries';
import { useKycRequirement } from '../../../src/kyc/use-kyc-requirement';
import { initiateRepayment, setupMandate } from '../../../src/lib/api';
import { formatMoneyNGN, parseAmountInput } from '../../../src/lib/format';
import { Button, Card, EmptyState, Input, ModalSheet, Screen, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

type RepayMethod = 'MANDATE' | 'CARD' | 'BANK_TRANSFER';

function createBankTransferPlaceholder() {
  const timestamp = Date.now();
  return {
    paymentIntentId: `bank-${timestamp}`,
    reference: `BANK-${timestamp}`,
    authorizationUrl: null
  };
}

export default function PayNowScreen() {
  const params = useLocalSearchParams<{ loanId?: string | string[]; method?: string | string[] }>();
  const { allowed } = useKycRequirement('FULL');
  const [amount, setAmount] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [kycSheetVisible, setKycSheetVisible] = useState(false);
  const historyQuery = useLoanHistory({ limit: 20 });
  const paramLoanId = useMemo(() => {
    const value = params.loanId;
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  }, [params.loanId]);
  const paramMethod = useMemo<RepayMethod>(() => {
    const value = params.method;
    const resolved = Array.isArray(value) ? value[0] ?? 'CARD' : value ?? 'CARD';
    return resolved === 'MANDATE' || resolved === 'BANK_TRANSFER' ? resolved : 'CARD';
  }, [params.method]);
  const resolvedLoanId = (paramLoanId || historyQuery.data?.find((item) => ['ACTIVE', 'APPROVED', 'DISBURSED'].includes(item.status.toUpperCase()))?.id) ?? '';
  const loanDetailQuery = useLoanDetail(resolvedLoanId);
  const amountValue = parseAmountInput(amount);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (paramMethod === 'MANDATE') {
        return setupMandate({ loanId: resolvedLoanId, maxAmount: amountValue });
      }
      if (paramMethod === 'BANK_TRANSFER') {
        return createBankTransferPlaceholder();
      }
      return initiateRepayment({ loanId: resolvedLoanId, amount: amountValue });
    },
    onSuccess: async (result) => {
      setConfirmVisible(false);
      if (result.authorizationUrl) {
        await Linking.openURL(result.authorizationUrl).catch(() => undefined);
      }
      router.replace({
        pathname: '/repay/processing',
        params: {
          loanId: resolvedLoanId,
          amount: String(amountValue),
          method: paramMethod,
          reference: result.reference ?? result.paymentIntentId
        }
      } as never);
    }
  });

  if (!resolvedLoanId) {
    return (
      <Screen>
        <TopNav title="Pay now" onBack={() => router.back()} />
        <EmptyState title="No active loan" body="You need an active loan before starting a repayment." />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopNav title="Pay now" subtitle="Confirm the repayment amount and method." onBack={() => router.back()} />
      <Card style={styles.card}>
        <Text style={styles.label}>Selected method</Text>
        <Text style={styles.value}>{toMethodLabel(paramMethod)}</Text>
        <Text style={styles.helper}>
          {loanDetailQuery.data?.dueDate ? `Due ${loanDetailQuery.data.dueDate}` : 'Repayment schedule will be confirmed during processing.'}
        </Text>
      </Card>
      <Input
        label="Amount (NGN)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Enter repayment amount"
        helperText={amountValue > 0 ? `Preview: ${formatMoneyNGN(amountValue, 'naira')}` : 'Enter the amount you want to repay.'}
      />
      <Button
        label="Review payment"
        disabled={amountValue <= 0 || payMutation.isPending}
        onPress={() => {
          if (!allowed) {
            setKycSheetVisible(true);
            return;
          }
          setConfirmVisible(true);
        }}
      />

      <ModalSheet visible={confirmVisible} onClose={() => setConfirmVisible(false)} title="Confirm repayment">
        <Text variant="bodyMuted">Amount</Text>
        <Text variant="h2">{formatMoneyNGN(amountValue, 'naira')}</Text>
        <Text variant="bodyMuted">Method: {toMethodLabel(paramMethod)}</Text>
        <Button label="Continue" loading={payMutation.isPending} onPress={() => payMutation.mutate()} />
        <Button label="Cancel" variant="secondary" onPress={() => setConfirmVisible(false)} />
      </ModalSheet>
      <KycActionSheet visible={kycSheetVisible} onClose={() => setKycSheetVisible(false)} />
    </Screen>
  );
}

function toMethodLabel(method: RepayMethod): string {
  if (method === 'MANDATE') {
    return 'Mandate';
  }
  if (method === 'BANK_TRANSFER') {
    return 'Bank transfer';
  }
  return 'Card';
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs
  },
  label: {
    ...typography.caption,
    color: colors.textMuted
  },
  value: {
    ...typography.subtitle,
    color: colors.text
  },
  helper: {
    ...typography.body,
    color: colors.textMuted
  }
});
