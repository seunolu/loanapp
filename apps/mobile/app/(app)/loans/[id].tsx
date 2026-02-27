import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLoanDetail } from '../../../src/features/loan-history/loanDetail.queries';
import { formatMoneyNGN } from '../../../src/lib/format';
import { useSensitiveScreenCaptureGuard } from '../../../src/security/screen-capture';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

// Audit findings:
// - Existing mobile single-loan detail endpoint wrapper was missing.
// - Reused auth/tenant-aware pattern by adding fetchLoanDetail(id) in src/features/loan-history/loanHistory.api.ts,
//   backed by apiRequest requiresAuth routes /loans/applications/:id and /loans/offers/:applicationId.
// - Existing response types available from backend contracts: LoanApplicationDetailsDto and LoanOfferDetailsDto.

export default function LoanStatusScreen() {
  useSensitiveScreenCaptureGuard('loan-detail');
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const loanId = normalizeId(params.id);
  const loanQuery = useLoanDetail(loanId);

  if (!loanId) {
    return (
      <Screen>
        <TopNav title="Loan details" />
        <EmptyState title="Loan not found" body="The selected loan could not be resolved." />
      </Screen>
    );
  }

  if (loanQuery.isLoading) {
    return <LoanDetailLoadingScreen />;
  }

  if (loanQuery.isError) {
    if (getErrorStatus(loanQuery.error) === 404) {
      return (
        <Screen>
          <TopNav title="Loan details" />
          <EmptyState title="Loan not found" body="This loan does not exist or is no longer available." />
        </Screen>
      );
    }

    return (
      <Screen>
        <TopNav title="Loan details" />
        <ErrorState title="Unable to load loan details" message="Please try again in a moment." onRetry={() => void loanQuery.refetch()} />
      </Screen>
    );
  }

  const loan = loanQuery.data;
  if (!loan) {
    return (
      <Screen>
        <TopNav title="Loan details" />
        <EmptyState title="Loan not found" body="No data was returned for this loan." />
      </Screen>
    );
  }

  const normalizedStatus = loan.status.toUpperCase();
  const isActive = normalizedStatus === 'ACTIVE' || normalizedStatus === 'DISBURSED' || normalizedStatus === 'APPROVED';

  return (
    <Screen preset="fixed">
      <TopNav title="Loan details" subtitle={`Application ${loan.id}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loanQuery.isRefetching} onRefresh={() => void loanQuery.refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.headerCard}>
          <Text style={styles.headerAmount}>{formatMoneyNGN(loan.amountKobo, 'kobo')}</Text>
          <View style={styles.headerMeta}>
            <Badge tone={loan.statusTone} label={loan.statusLabel} />
            <Text style={styles.metaText}>Created {formatDate(loan.createdAt)}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Loan summary</Text>
          <InfoRow label="Principal" value={formatMoneyNGN(loan.principalKobo, 'kobo')} />
          <InfoRow label="Tenor" value={`${loan.tenorDays} days`} />
          <InfoRow label="Interest" value={formatMoneyNGN(loan.interestKobo, 'kobo')} />
          <InfoRow label="Total payable" value={formatMoneyNGN(loan.totalPayableKobo, 'kobo')} />
          <InfoRow label="Next due date" value={loan.dueDate ? formatDate(loan.dueDate) : '-'} />
          {loan.reference ? <InfoRow label="Reference" value={loan.reference} /> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Repayment status</Text>
          {isActive ? (
            <View style={styles.statusBlock}>
              <Text style={styles.bodyText}>Remaining balance: {formatMoneyNGN(loan.totalPayableKobo, 'kobo')}</Text>
              <Text style={styles.bodyText}>Next due: {loan.dueDate ? formatDate(loan.dueDate) : 'Not scheduled'}</Text>
              <Button label="Repay now" onPress={() => router.push(`/repay/pay-now?id=${encodeURIComponent(loan.id)}` as never)} />
            </View>
          ) : null}
          {normalizedStatus === 'REPAID' || normalizedStatus === 'PAID' ? (
            <View style={styles.statusBlock}>
              <Badge tone="success" label="Loan fully repaid" />
            </View>
          ) : null}
          {normalizedStatus === 'DECLINED' || normalizedStatus === 'REJECTED' ? (
            <View style={styles.statusBlock}>
              <Badge tone="danger" label="Application declined" />
              <Text style={styles.bodyText}>This application did not meet current approval criteria.</Text>
            </View>
          ) : null}
          {normalizedStatus === 'PENDING' || normalizedStatus === 'UNDER_REVIEW' || normalizedStatus === 'SUBMITTED' ? (
            <View style={styles.statusBlock}>
              <Badge tone="muted" label="Pending review" />
            </View>
          ) : null}
        </Card>

        {loan.timeline.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timeline}>
              {loan.timeline.map((event) => (
                <View key={`${event.label}-${event.date}`} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineTexts}>
                    <Text style={styles.timelineTitle}>{event.label}</Text>
                    <Text style={styles.timelineDate}>{formatDate(event.date)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function normalizeId(value?: string | string[]): string {
  if (!value) {
    return '';
  }
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }
  return null;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LoanDetailLoadingScreen() {
  return (
    <Screen>
      <TopNav title="Loan details" />
      <Card style={styles.headerCard}>
        <Skeleton width="55%" height={36} />
        <Skeleton width="35%" height={18} />
      </Card>
      <Card style={styles.card}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="100%" height={14} />
      </Card>
      <Card style={styles.card}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="100%" height={16} />
        <Skeleton width="70%" height={40} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xl
  },
  headerCard: {
    gap: spacing.sm
  },
  headerAmount: {
    ...typography.display,
    color: colors.text
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted
  },
  card: {
    gap: spacing.sm
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md
  },
  infoLabel: {
    ...typography.body,
    color: colors.textMuted
  },
  infoValue: {
    ...typography.body,
    color: colors.text
  },
  statusBlock: {
    gap: spacing.sm
  },
  bodyText: {
    ...typography.body,
    color: colors.textMuted
  },
  timeline: {
    gap: spacing.sm
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: colors.primary
  },
  timelineTexts: {
    flex: 1
  },
  timelineTitle: {
    ...typography.body,
    color: colors.text
  },
  timelineDate: {
    ...typography.caption,
    color: colors.textMuted
  }
});

