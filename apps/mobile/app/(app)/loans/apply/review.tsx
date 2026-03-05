import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useMeQuery } from '../../../../src/features/home/home.queries';
import { useAvailableLoanProducts } from '../../../../src/features/loan-products/loanProducts.queries';
import { createBorrowerLoanApplication } from '../../../../src/lib/api';
import { formatNairaFromKobo } from '../../../../src/lib/format';
import { useKycGate } from '../../../../src/kyc/use-kyc-gate';
import { Button, Card, ErrorState, Screen, SectionHeader, Skeleton, Text, colors, spacing, typography } from '../../../../src/ui';

export default function ReviewLoanScreen() {
  const { allowed } = useKycGate('FULL');
  const params = useLocalSearchParams<{ productId?: string | string[]; amount?: string | string[]; tenor?: string | string[] }>();
  const productId = normalizeParam(params.productId);
  const amount = parsePositiveInt(normalizeParam(params.amount));
  const tenor = parsePositiveInt(normalizeParam(params.tenor));
  const productsQuery = useAvailableLoanProducts();
  const meQuery = useMeQuery();

  const [accepted, setAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const selectedProduct = React.useMemo(() => {
    const products = productsQuery.data ?? [];
    return products.find((item) => item.id === productId) ?? null;
  }, [productsQuery.data, productId]);

  if (!allowed) {
    return null;
  }

  if (productsQuery.isLoading) {
    return <ReviewLoadingState />;
  }

  if (productsQuery.isError) {
    return (
      <Screen>
        <SectionHeader title="Review application" subtitle="Confirm details before submission." />
        <ErrorState title="Unable to load application details" message="Please try again." onRetry={() => void productsQuery.refetch()} />
      </Screen>
    );
  }

  if (!selectedProduct || !amount || !tenor) {
    return (
      <Screen>
        <SectionHeader title="Review application" subtitle="Confirm details before submission." />
        <ErrorState
          title="Application details missing"
          message="Please reconfigure your application."
          onRetry={() => router.replace('/loans/apply/offers' as never)}
        />
      </Screen>
    );
  }

  const interestRate = 0.08;
  const interestAmount = Math.round(amount * interestRate);
  const totalRepayable = amount + interestAmount;

  const onSubmit = async () => {
    if (!accepted) {
      return;
    }
    if (!meQuery.data?.profile) {
      setErrorText('Complete your profile details before applying for a loan.');
      router.push('/profile/kyc/personal' as never);
      return;
    }
    try {
      setSubmitting(true);
      setErrorText(null);
      const response = await createBorrowerLoanApplication({
        amountRequested: amount,
        tenorDays: tenor
      });
      router.replace(`/loans/apply/submitted?id=${encodeURIComponent(response.applicationId)}` as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to submit loan application.';
      setErrorText(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Review application" subtitle="Confirm details before submission." />
      <Card>
        <Row label="Product" value={selectedProduct.name} />
        <Row label="Amount" value={formatNairaFromKobo(amount)} />
        <Row label="Tenor" value={`${tenor} days`} />
        <Row label="Interest (estimated)" value={formatNairaFromKobo(interestAmount)} />
        <Row label="Total Repayable" value={formatNairaFromKobo(totalRepayable)} />
      </Card>
      <Card>
        <View style={styles.row}>
          <Text style={styles.body}>I accept terms and repayment policy.</Text>
          <Switch value={accepted} onValueChange={setAccepted} />
        </View>
        {errorText ? (
          <Text variant="caption" color="danger">
            {errorText}
          </Text>
        ) : null}
      </Card>
      <Button label="Submit Application" disabled={!accepted} loading={submitting} onPress={() => void onSubmit()} />
    </Screen>
  );
}

function normalizeParam(value?: string | string[]): string {
  if (!value) {
    return '';
  }
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ReviewLoadingState() {
  return (
    <Screen>
      <SectionHeader title="Review application" subtitle="Confirm details before submission." />
      <Card>
        <Skeleton height={16} width="35%" />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="100%" />
      </Card>
      <Card>
        <Skeleton height={18} width="80%" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  caption: { ...typography.body, color: colors.textMuted },
  value: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  body: { ...typography.body, color: colors.text }
});
