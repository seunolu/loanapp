import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { TransactionStatusPill } from '../../../src/features/transactions/components/TransactionStatusPill';
import { useTransactionDetail } from '../../../src/features/transactions/transactions.queries';
import { copyToClipboard } from '../../../src/lib/copy';
import { formatDateTime, formatMoneyNGN } from '../../../src/lib/format';
import { Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text, TopNav, colors, showToast, spacing, typography } from '../../../src/ui';

export default function TransactionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const transactionId = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  }, [params.id]);
  const transactionQuery = useTransactionDetail(transactionId);

  if (!transactionId) {
    return (
      <Screen>
        <TopNav title="Transaction detail" onBack={() => router.back()} />
        <EmptyState title="Transaction not found" body="We could not resolve this transaction." />
      </Screen>
    );
  }

  if (transactionQuery.isLoading) {
    return <TransactionDetailLoadingScreen />;
  }

  if (transactionQuery.isError) {
    return (
      <Screen>
        <TopNav title="Transaction detail" onBack={() => router.back()} />
        <ErrorState
          title="Unable to load transaction"
          message="Please try again in a moment."
          onRetry={() => void transactionQuery.refetch()}
        />
      </Screen>
    );
  }

  const transaction = transactionQuery.data;
  if (!transaction) {
    return (
      <Screen>
        <TopNav title="Transaction detail" onBack={() => router.back()} />
        <EmptyState title="Transaction not found" body="No details were returned for this transaction." />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopNav title="Transaction detail" subtitle={transaction.reference} onBack={() => router.back()} />
      <Card style={styles.headerCard}>
        <Text style={styles.amount}>{formatMoneyNGN(transaction.amountKobo, 'kobo')}</Text>
        <View style={styles.headerMeta}>
          <TransactionStatusPill statusLabel={transaction.statusLabel} tone={transaction.statusTone} />
          <Text style={styles.meta}>{transaction.kindLabel}</Text>
        </View>
        <Text style={styles.narration}>{transaction.narration}</Text>
      </Card>
      <Card style={styles.detailCard}>
        {transaction.metadata.map((item) => (
          <View key={item.label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.label.toLowerCase().includes('created') || item.label.toLowerCase().includes('submitted') || item.label.toLowerCase().includes('date') ? formatDateTime(item.value) : item.value}</Text>
          </View>
        ))}
      </Card>
      <Button
        label="Copy reference"
        variant="secondary"
        onPress={async () => {
          const copied = await copyToClipboard(transaction.reference);
          showToast({
            type: copied ? 'success' : 'info',
            title: copied ? 'Reference copied' : 'Reference ready',
            message: copied ? 'The transaction reference was copied to your clipboard.' : transaction.reference
          });
        }}
      />
    </Screen>
  );
}

function TransactionDetailLoadingScreen() {
  return (
    <Screen>
      <TopNav title="Transaction detail" onBack={() => router.back()} />
      <Card style={styles.headerCard}>
        <Skeleton width="50%" height={34} />
        <Skeleton width="30%" height={18} />
        <Skeleton width="100%" height={16} />
      </Card>
      <Card style={styles.detailCard}>
        <Skeleton width="100%" height={16} />
        <Skeleton width="100%" height={16} />
        <Skeleton width="100%" height={16} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    gap: spacing.sm
  },
  detailCard: {
    gap: spacing.sm
  },
  amount: {
    ...typography.display,
    color: colors.text
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  narration: {
    ...typography.body,
    color: colors.textMuted
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  infoLabel: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right'
  }
});
