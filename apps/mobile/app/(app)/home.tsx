import { Link, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { brand } from '../../src/brand';
import { useHomeKycSignals, useCreditQuery, useMeQuery, useRecentLoansQuery } from '../../src/features/home/home.queries';
import { formatNairaFromKobo } from '../../src/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, Pressable, Screen, Skeleton, Text, colors, spacing, typography } from '../../src/ui';

export default function HomeScreen() {
  const meQuery = useMeQuery();
  const creditQuery = useCreditQuery();
  const recentLoansQuery = useRecentLoansQuery(3);

  const kycStatus = meQuery.data?.kycStatus?.toUpperCase() ?? 'PENDING';
  const isKycVerified = kycStatus === 'VERIFIED';
  const { identityQuery, mandatesQuery } = useHomeKycSignals(!isKycVerified);

  const isLoading = meQuery.isLoading || creditQuery.isLoading || recentLoansQuery.isLoading;
  const hasError = meQuery.isError || recentLoansQuery.isError;

  const onRetry = () => {
    void Promise.all([meQuery.refetch(), creditQuery.refetch(), recentLoansQuery.refetch()]);
  };

  if (isLoading) {
    return <HomeLoadingState />;
  }

  if (hasError) {
    return (
      <Screen>
        <ErrorState title="Unable to load dashboard" message="Please check your connection and try again." onRetry={onRetry} />
      </Screen>
    );
  }

  const me = meQuery.data;
  const recentLoans = recentLoansQuery.data ?? [];
  const firstName = me?.profile?.firstName?.trim() ?? '';
  const greeting = firstName ? `Hi, ${firstName}` : 'Hi there';
  const avatarText = (firstName || brand.appName).slice(0, 1).toUpperCase();
  const availableCredit = creditQuery.data?.availableCreditKobo ?? 0;
  const creditCtaLabel = isKycVerified ? 'Apply for Loan' : 'Complete KYC';
  const creditCtaRoute = isKycVerified ? '/loans/apply/offers' : '/profile/kyc';

  const personalDone = Boolean(me?.profile);
  const identityDone = identityQuery.data?.status === 'VERIFIED';
  const bankDone = Boolean((mandatesQuery.data ?? []).length);
  const kycSteps = [
    { label: 'Personal', completed: personalDone },
    { label: 'Identity', completed: identityDone },
    { label: 'Bank', completed: bankDone }
  ];
  const completedStepCount = kycSteps.filter((step) => step.completed).length;

  return (
    <Screen>
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>{brand.appName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{greeting}</Text>
            <Text style={styles.headerSubtitle}>Let&apos;s get you funded today</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.iconCircle}>
            <Text>*</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
        </View>
      </View>

      <Card style={styles.creditCard}>
        <View style={styles.creditRow}>
          <Text style={styles.creditTitle}>Available Credit</Text>
          <Badge tone={isKycVerified ? 'success' : 'warning'} label={isKycVerified ? 'Verified' : 'KYC Pending'} />
        </View>
        <Text style={styles.creditAmount}>{formatNairaFromKobo(availableCredit)}</Text>
        {creditQuery.data?.sourceLabel ? <Text style={styles.creditHint}>{creditQuery.data.sourceLabel}</Text> : null}
        <Link href={creditCtaRoute as never} asChild>
          <Button label={creditCtaLabel} />
        </Link>
        {!isKycVerified ? (
          <Pressable onPress={() => router.push('/support' as never)}>
            <Text style={styles.learnMore}>Learn how it works</Text>
          </Pressable>
        ) : null}
      </Card>

      {!isKycVerified ? (
        <Card style={styles.kycCard}>
          <Text style={styles.kycTitle}>Complete your KYC to unlock higher limits</Text>
          <View style={styles.kycSteps}>
            {kycSteps.map((step) => (
              <View key={step.label} style={styles.kycStepItem}>
                <View style={[styles.kycDot, step.completed ? styles.kycDotDone : null]} />
                <Text style={styles.kycStepLabel}>{step.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.kycProgressTrack}>
            <View style={[styles.kycProgressFill, { width: `${(completedStepCount / kycSteps.length) * 100}%` }]} />
          </View>
          <Link href={'/profile/kyc' as never} asChild>
            <Button label="Continue" />
          </Link>
        </Card>
      ) : null}

      <Card>
        <View style={styles.quickActionsRow}>
          <QuickAction label="Apply" onPress={() => router.push('/loans/apply/offers' as never)} glyph="^" />
          <QuickAction label="Repay" onPress={() => router.push('/repay' as never)} glyph="$" />
          <QuickAction label="Support" onPress={() => router.push('/support' as never)} glyph="?" />
        </View>
      </Card>

      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Loans</Text>
        <Pressable onPress={() => router.push('/loans' as never)}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {recentLoans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          body="Your loan activity will appear here once you submit an application."
          ctaLabel="Apply for loan"
          onPressCta={() => router.push('/loans/apply/offers' as never)}
        />
      ) : (
        <Card style={styles.loanListCard}>
          <View style={styles.loanRows}>
            {recentLoans.slice(0, 3).map((loan) => (
              <View key={loan.id} style={styles.loanRow}>
                <View style={styles.loanAmountWrap}>
                  <View style={styles.loanBullet} />
                  <Text style={styles.loanAmount}>{formatNairaFromKobo(loan.amountKobo)}</Text>
                </View>
                <Badge tone={loan.status.toUpperCase() === 'ACTIVE' ? 'success' : 'info'} label={toLoanStatusLabel(loan.status)} />
                <Text style={styles.loanDate}>{formatShortDate(loan.createdAt)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}

function QuickAction({ label, onPress, glyph }: { label: string; onPress: () => void; glyph: string }) {
  return (
    <Pressable onPress={onPress} style={styles.quickActionItem}>
      <View style={styles.quickActionCircle}>
        <Text style={styles.quickActionGlyph}>{glyph}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function formatShortDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function toLoanStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function HomeLoadingState() {
  return (
    <Screen>
      <Card>
        <Skeleton height={24} width="45%" />
        <Skeleton height={14} width="70%" />
      </Card>
      <Card>
        <Skeleton height={16} width="40%" />
        <Skeleton height={38} width="60%" />
        <Skeleton height={40} width="45%" />
      </Card>
      <Card>
        <Skeleton height={18} width="35%" />
        <Skeleton height={52} width="100%" />
      </Card>
      <Card>
        <Skeleton height={20} width="30%" />
        <Skeleton height={46} width="100%" />
        <Skeleton height={46} width="100%" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center'
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: brand.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandBadgeText: {
    ...typography.button,
    color: colors.textInverse
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.text
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center'
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    ...typography.button,
    color: colors.text
  },
  creditCard: {
    gap: spacing.sm
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  creditTitle: {
    ...typography.subtitle,
    color: colors.text
  },
  creditAmount: {
    ...typography.display,
    color: colors.text
  },
  creditHint: {
    ...typography.caption,
    color: colors.textMuted
  },
  learnMore: {
    ...typography.caption,
    color: brand.colors.primary
  },
  kycCard: {
    gap: spacing.sm
  },
  kycTitle: {
    ...typography.subtitle,
    color: colors.text
  },
  kycSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  kycStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  kycDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceMuted
  },
  kycDotDone: {
    backgroundColor: colors.success
  },
  kycStepLabel: {
    ...typography.caption,
    color: colors.text
  },
  kycProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden'
  },
  kycProgressFill: {
    height: '100%',
    backgroundColor: colors.success
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  quickActionItem: {
    alignItems: 'center',
    gap: spacing.xxs
  },
  quickActionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickActionGlyph: {
    ...typography.subtitle,
    color: colors.textInverse
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.text
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recentTitle: {
    ...typography.subtitle,
    color: colors.text
  },
  viewAll: {
    ...typography.caption,
    color: colors.textMuted
  },
  loanListCard: {
    paddingVertical: spacing.sm
  },
  loanRows: {
    gap: spacing.sm
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm
  },
  loanAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1
  },
  loanBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted
  },
  loanAmount: {
    ...typography.subtitle,
    color: colors.text
  },
  loanDate: {
    ...typography.caption,
    color: colors.textMuted
  }
});



