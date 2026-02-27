import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { getIdentityStatus, recordIdentityConsent, verifyIdentityBvn } from '../../../../src/lib/api';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Badge, Button, Card, Input, Screen, SectionHeader, colors, spacing, typography } from '../../../../src/ui';

export default function KycIdentityScreen() {
  const {
    consentAccepted,
    setConsentAccepted,
    identityStatus,
    setIdentityStatus,
    markComplete,
    markPending
  } = useKyc();
  const [bvn, setBvn] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const latest = await getIdentityStatus();
        if (!latest) return;
        await setIdentityStatus(latest.status);
        if (latest.status === 'VERIFIED') {
          await markComplete('identity');
        } else {
          await markPending('identity');
        }
      } catch {
        return;
      }
    })();
  }, [markComplete, markPending, setIdentityStatus]);

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      await recordIdentityConsent('KYC_CONSENT');
      await setConsentAccepted(true);
      const result = await verifyIdentityBvn(bvn.trim());
      await setIdentityStatus(result.status);
      if (result.status === 'VERIFIED') {
        await markComplete('identity');
        router.push('/profile/kyc/employment' as any);
      } else {
        await markPending('identity');
      }
    } catch (e) {
      await setIdentityStatus('FAILED');
      await markPending('identity');
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Identity Verification" subtitle="Consent and BVN verification are required." />
      <Card>
        <View style={styles.row}>
          <Text style={styles.text}>I consent to KYC and data processing checks.</Text>
          <Switch value={consentAccepted} onValueChange={(value) => void setConsentAccepted(value)} />
        </View>
      </Card>
      <Card>
        <Input label="BVN" value={bvn} onChangeText={setBvn} keyboardType="number-pad" maxLength={11} />
        <View style={styles.statusRow}>
          <Text style={styles.text}>Verification status</Text>
          <Badge
            label={identityStatus}
            tone={
              identityStatus === 'VERIFIED'
                ? 'success'
                : identityStatus === 'MANUAL_REVIEW'
                  ? 'warning'
                  : identityStatus === 'FAILED'
                    ? 'danger'
                    : 'muted'
            }
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>
      <Button
        label="Verify BVN"
        onPress={onVerify}
        loading={loading}
        disabled={!consentAccepted || bvn.trim().length !== 11}
      />
      {identityStatus === 'MANUAL_REVIEW' ? (
        <Card>
          <Text style={styles.text}>Your verification is pending manual review. You cannot apply yet.</Text>
        </Card>
      ) : null}
      {identityStatus === 'FAILED' ? (
        <Card>
          <Text style={styles.text}>Verification failed. Please confirm BVN and retry.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  text: { ...typography.body, color: colors.text, flex: 1 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs }
});



