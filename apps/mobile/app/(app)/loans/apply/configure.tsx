import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAvailableLoanProducts } from '../../../../src/features/loan-products/loanProducts.queries';
import { formatNairaFromKobo } from '../../../../src/lib/format';
import { useKycGate } from '../../../../src/kyc/use-kyc-gate';
import { Button, Card, ErrorState, Screen, SectionHeader, Skeleton, Text, colors, spacing, typography } from '../../../../src/ui';

export default function ConfigureLoanScreen() {
  const { allowed } = useKycGate('FULL');
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const requestedProductId = normalizeParam(params.productId);
  const productsQuery = useAvailableLoanProducts();

  const selectedProduct = React.useMemo(() => {
    const products = productsQuery.data ?? [];
    return products.find((item) => item.id === requestedProductId) ?? products[0] ?? null;
  }, [productsQuery.data, requestedProductId]);

  const amountOptions = React.useMemo(
    () => {
      if (!selectedProduct) {
        return [];
      }
      if (selectedProduct.source === 'policy') {
        return [selectedProduct.minPrincipal];
      }
      return buildRangeOptions(selectedProduct.minPrincipal, selectedProduct.maxPrincipal);
    },
    [selectedProduct]
  );
  const tenorOptions = React.useMemo(
    () => {
      if (!selectedProduct) {
        return [];
      }
      if (selectedProduct.source === 'policy') {
        return [selectedProduct.minTenorDays];
      }
      return buildRangeOptions(selectedProduct.minTenorDays, selectedProduct.maxTenorDays);
    },
    [selectedProduct]
  );

  const [amount, setAmount] = React.useState<number>(0);
  const [tenor, setTenor] = React.useState<number>(0);

  React.useEffect(() => {
    if (!amountOptions.length) {
      return;
    }
    setAmount((current) => (amountOptions.includes(current) ? current : amountOptions[0] ?? 0));
  }, [amountOptions]);

  React.useEffect(() => {
    if (!tenorOptions.length) {
      return;
    }
    setTenor((current) => (tenorOptions.includes(current) ? current : tenorOptions[0] ?? 0));
  }, [tenorOptions]);

  const totalRepayable = Math.round(amount * 1.08);

  if (!allowed) {
    return null;
  }

  if (productsQuery.isLoading) {
    return <ConfigureLoadingState />;
  }

  if (productsQuery.isError) {
    return (
      <Screen>
        <SectionHeader title="Configure Loan" subtitle="Choose amount and tenor." />
        <ErrorState title="Unable to load product details" message="Please try again." onRetry={() => void productsQuery.refetch()} />
      </Screen>
    );
  }

  if (!selectedProduct) {
    return (
      <Screen>
        <SectionHeader title="Configure Loan" subtitle="Choose amount and tenor." />
        <ErrorState title="Loan product not found" message="Select another product to continue." onRetry={() => router.replace('/loans/apply/offers' as never)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader title="Configure Loan" subtitle={selectedProduct.name} />
      <Card>
        {selectedProduct.source === 'policy' ? (
          <Text style={styles.caption}>This tenant currently uses policy defaults for borrower applications.</Text>
        ) : null}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.row}>
          {amountOptions.map((value) => (
            <Button
              key={value}
              label={formatNairaFromKobo(value)}
              variant={amount === value ? 'primary' : 'secondary'}
              onPress={() => setAmount(value)}
            />
          ))}
        </View>
        <Text style={styles.label}>Tenor</Text>
        <View style={styles.row}>
          {tenorOptions.map((value) => (
            <Button key={value} label={`${value} days`} variant={tenor === value ? 'primary' : 'secondary'} onPress={() => setTenor(value)} />
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.summary}>Total repayable: {formatNairaFromKobo(totalRepayable)}</Text>
        <Text style={styles.caption}>Estimated repayment terms will be confirmed at review.</Text>
      </Card>
      <Button
        label="Continue to Review"
        onPress={() =>
          router.push(
            `/loans/apply/review?productId=${encodeURIComponent(selectedProduct.id)}&amount=${amount}&tenor=${tenor}` as any
          )
        }
      />
    </Screen>
  );
}

function normalizeParam(value?: string | string[]): string {
  if (!value) {
    return '';
  }
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function buildRangeOptions(minValue: number, maxValue: number): number[] {
  const min = Math.max(1, Math.round(minValue));
  const max = Math.max(min, Math.round(maxValue));
  const midpoint = Math.round((min + max) / 2);
  return Array.from(new Set([min, midpoint, max])).sort((a, b) => a - b);
}

function ConfigureLoadingState() {
  return (
    <Screen>
      <SectionHeader title="Configure Loan" subtitle="Choose amount and tenor." />
      <Card>
        <Skeleton height={16} width="25%" />
        <Skeleton height={48} width="100%" />
        <Skeleton height={16} width="25%" />
        <Skeleton height={48} width="100%" />
      </Card>
      <Card>
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="80%" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  summary: { ...typography.subtitle, color: colors.text },
  caption: { ...typography.body, color: colors.textMuted }
});
