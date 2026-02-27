import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLoanHistory } from '../../../src/features/loan-history/loanHistory.queries';
import type { LoanHistoryItem } from '../../../src/features/loan-history/loanHistory.types';
import { formatMoneyNGN } from '../../../src/lib/format';
import { useKyc } from '../../../src/providers/kyc-provider';
import { Badge, Button, Card, EmptyState, ErrorState, Pressable, Screen, Skeleton, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function LoansIndexScreen() {
  const { isComplete } = useKyc();
  const historyQuery = useLoanHistory({ limit: 20 });
  const applyRoute = isComplete ? '/loans/apply/offers' : '/profile/kyc';

  const renderLoading = () => (
    <View style={styles.stateBlock}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`loan-skeleton-${index}`} style={styles.rowCard}>
          <Skeleton width="45%" height={20} />
          <Skeleton width="30%" height={14} style={styles.skeletonSpacer} />
          <Skeleton width="55%" height={14} />
        </Card>
      ))}
    </View>
  );

  const renderError = () => (
    <View style={styles.stateBlock}>
      <ErrorState
        title="Unable to load loans"
        message="We could not fetch your loan history right now."
        onRetry={() => void historyQuery.refetch()}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.stateBlock}>
      <EmptyState
        title="No loans yet"
        body="Your submitted loan applications will appear here."
        ctaLabel="Apply for a loan"
        onPressCta={() => router.push(applyRoute as never)}
      />
    </View>
  );

  const renderItem = ({ item }: { item: LoanHistoryItem }) => (
    <Pressable onPress={() => router.push(`/loans/${item.id}` as never)}>
      <Card style={styles.rowCard}>
        <View style={styles.rowTop}>
          <Text style={styles.amount}>{formatMoneyNGN(item.amountKobo, 'kobo')}</Text>
          <Badge tone={item.statusTone} label={item.statusLabel} />
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.subtext}>{formatDueText(item.dueDate)}</Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <Screen preset="fixed">
      <TopNav title="Loans" subtitle="Track active and past applications." />
      {historyQuery.isLoading ? renderLoading() : null}
      {historyQuery.isError ? renderError() : null}
      {!historyQuery.isLoading && !historyQuery.isError && (historyQuery.data?.length ?? 0) === 0 ? renderEmpty() : null}
      {!historyQuery.isLoading && !historyQuery.isError && (historyQuery.data?.length ?? 0) > 0 ? (
        <FlatList
          data={historyQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={historyQuery.isRefetching} onRefresh={() => void historyQuery.refetch()} />
          }
          ListFooterComponent={
            <View style={styles.footerCta}>
              <Button label="Apply for a loan" onPress={() => router.push(applyRoute as never)} />
            </View>
          }
        />
      ) : null}
    </Screen>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDueText(dueDate?: string): string {
  if (!dueDate) {
    return 'Due date unavailable';
  }
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return 'Due date unavailable';
  }
  const dayMs = 86_400_000;
  const diffDays = Math.ceil((due.getTime() - Date.now()) / dayMs);
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  }
  return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  stateBlock: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center'
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl
  },
  rowCard: {
    gap: spacing.xxs
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  amount: {
    ...typography.subtitle,
    color: colors.text
  },
  date: {
    ...typography.caption,
    color: colors.textMuted
  },
  subtext: {
    ...typography.caption,
    color: colors.text
  },
  skeletonSpacer: {
    marginTop: spacing.xxs
  },
  footerCta: {
    marginTop: spacing.sm
  }
});

