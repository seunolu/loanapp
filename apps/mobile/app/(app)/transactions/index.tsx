import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { TransactionRow } from '../../../src/features/transactions/components/TransactionRow';
import { useTransactions } from '../../../src/features/transactions/transactions.queries';
import type { TransactionFilter } from '../../../src/features/transactions/transactions.types';
import { Card, EmptyState, ErrorState, Input, Pressable, Screen, Skeleton, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

const FILTERS: TransactionFilter[] = ['ALL', 'LOANS', 'REPAYMENTS', 'FEES'];

export default function TransactionsIndexScreen() {
  const [filter, setFilter] = useState<TransactionFilter>('ALL');
  const [search, setSearch] = useState('');
  const transactionsQuery = useTransactions({ filter, search });

  return (
    <Screen preset="fixed">
      <TopNav title="Transactions" subtitle="Track loans, repayments, and fees." />
      <View style={styles.controls}>
        <Input
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by reference or note"
          autoCapitalize="none"
        />
        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, filter === item ? styles.filterChipActive : null]}
            >
              <Text style={filter === item ? styles.filterChipTextActive : styles.filterChipText}>{toFilterLabel(item)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {transactionsQuery.isLoading ? <TransactionsLoadingState /> : null}
      {transactionsQuery.isError ? (
        <View style={styles.stateBlock}>
          <ErrorState
            title="Unable to load transactions"
            message="Please try again in a moment."
            onRetry={() => void transactionsQuery.refetch()}
          />
        </View>
      ) : null}
      {!transactionsQuery.isLoading && !transactionsQuery.isError && (transactionsQuery.data?.length ?? 0) === 0 ? (
        <View style={styles.stateBlock}>
          <EmptyState
            title="No transactions yet"
            body="Loan, repayment, and fee activity will appear here once it becomes available."
          />
        </View>
      ) : null}
      {!transactionsQuery.isLoading && !transactionsQuery.isError && (transactionsQuery.data?.length ?? 0) > 0 ? (
        <FlatList
          data={transactionsQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} onPress={() => router.push(`/transactions/${item.id}` as never)} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={transactionsQuery.isRefetching} onRefresh={() => void transactionsQuery.refetch()} />
          }
        />
      ) : null}
    </Screen>
  );
}

function toFilterLabel(filter: TransactionFilter): string {
  if (filter === 'ALL') {
    return 'All';
  }
  if (filter === 'LOANS') {
    return 'Loans';
  }
  if (filter === 'REPAYMENTS') {
    return 'Repayments';
  }
  return 'Fees';
}

function TransactionsLoadingState() {
  return (
    <View style={styles.stateBlock}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`transaction-skeleton-${index}`} style={styles.skeletonCard}>
          <Skeleton width="45%" height={18} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="35%" height={14} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text
  },
  filterChipTextActive: {
    ...typography.caption,
    color: colors.textInverse
  },
  stateBlock: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center'
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl
  },
  skeletonCard: {
    gap: spacing.sm
  }
});
