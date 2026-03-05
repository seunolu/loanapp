import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAvailableLoanProducts } from '../../../../src/features/loan-products/loanProducts.queries';
import { formatNairaFromKobo } from '../../../../src/lib/format';
import { useKycGate } from '../../../../src/kyc/use-kyc-gate';
import { Badge, Button, Card, ErrorState, Screen, SectionHeader, Skeleton, Text, colors, spacing, typography } from '../../../../src/ui';

export default function OffersScreen() {
  const { allowed } = useKycGate('FULL');
  const productsQuery = useAvailableLoanProducts();
  const [selectedProductId, setSelectedProductId] = React.useState('');

  React.useEffect(() => {
    if (!productsQuery.data?.length) {
      return;
    }
    if (!selectedProductId) {
      setSelectedProductId(productsQuery.data[0]?.id ?? '');
    }
  }, [productsQuery.data, selectedProductId]);

  if (!allowed) {
    return null;
  }

  if (productsQuery.isLoading) {
    return <OfferLoadingState />;
  }

  if (productsQuery.isError) {
    return (
      <Screen>
        <SectionHeader title="Loan Products" subtitle="Pick a product to continue." />
        <ErrorState title="Unable to load loan products" message="Please try again." onRetry={() => void productsQuery.refetch()} />
      </Screen>
    );
  }

  const products = productsQuery.data ?? [];
  const selectedProduct = products.find((item) => item.id === selectedProductId) ?? products[0] ?? null;

  return (
    <Screen>
      <SectionHeader title="Loan Products" subtitle="Select the loan product you want to apply for." />
      {products.map((product) => (
        <Card key={product.id} style={[styles.productCard, selectedProduct?.id === product.id ? styles.productCardSelected : null]}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.source === 'policy' ? <Badge label="Policy fallback" tone="info" /> : <Badge label="Active" tone="success" />}
          </View>
          <Text style={styles.metaText}>
            Amount: {formatNairaFromKobo(product.minPrincipal)} - {formatNairaFromKobo(product.maxPrincipal)}
          </Text>
          <Text style={styles.metaText}>
            Tenor: {product.minTenorDays} - {product.maxTenorDays} days
          </Text>
          {product.source === 'policy' ? (
            <Text style={styles.metaHint}>Product list is currently derived from tenant policy defaults.</Text>
          ) : null}
          <Button
            label={selectedProduct?.id === product.id ? 'Selected' : 'Select'}
            variant={selectedProduct?.id === product.id ? 'primary' : 'secondary'}
            onPress={() => setSelectedProductId(product.id)}
          />
        </Card>
      ))}
      <Button
        label="Continue"
        disabled={!selectedProduct}
        onPress={() => {
          if (!selectedProduct) {
            return;
          }
          router.push(`/loans/apply/configure?productId=${encodeURIComponent(selectedProduct.id)}` as any);
        }}
      />
    </Screen>
  );
}

function OfferLoadingState() {
  return (
    <Screen>
      <SectionHeader title="Loan Products" subtitle="Pick a product to continue." />
      <Card>
        <Skeleton height={20} width="60%" />
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="80%" />
        <Skeleton height={42} width="40%" />
      </Card>
      <Card>
        <Skeleton height={20} width="52%" />
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="80%" />
        <Skeleton height={42} width="40%" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  productCard: {
    gap: spacing.xs
  },
  productCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  productName: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1
  },
  metaText: {
    ...typography.body,
    color: colors.textMuted
  },
  metaHint: {
    ...typography.caption,
    color: colors.textMuted
  }
});
