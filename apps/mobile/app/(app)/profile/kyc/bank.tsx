import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { upsertMyBankAccount } from '../../../../src/lib/api';
import { NIGERIA_BANKS } from '../../../../src/features/kyc/banks';
import { shouldUseBankVerificationMock, verifyBankAccount } from '../../../../src/features/kyc/bankVerification.api';
import { Button, Card, Input, Screen, SectionHeader, SelectField, Text } from '../../../../src/ui';

export default function KycBankScreen() {
  const { markComplete } = useKyc();
  const [bankCode, setBankCode] = React.useState<string>('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [verifiedName, setVerifiedName] = React.useState('');
  const [verifiedKey, setVerifiedKey] = React.useState('');
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = React.useState(false);
  const [saveLoading, setSaveLoading] = React.useState(false);

  const selectedBank = NIGERIA_BANKS.find((item) => item.code === bankCode) ?? null;
  const normalizedAccountNumber = accountNumber.replace(/\D/g, '').slice(0, 10);
  const currentKey = selectedBank ? `${selectedBank.code}:${normalizedAccountNumber}` : '';
  const canVerify = Boolean(selectedBank) && /^\d{10}$/.test(normalizedAccountNumber);
  const isVerified = Boolean(verifiedName) && verifiedKey === currentKey;
  const mockEnabled = shouldUseBankVerificationMock();

  React.useEffect(() => {
    if (!currentKey || currentKey !== verifiedKey) {
      setVerifiedName('');
    }
  }, [currentKey, verifiedKey]);

  const onVerify = async () => {
    if (!selectedBank || !/^\d{10}$/.test(normalizedAccountNumber)) {
      setErrorText('Select your bank and enter a valid 10-digit account number.');
      return;
    }

    try {
      setVerifyLoading(true);
      setErrorText(null);
      const result = await verifyBankAccount({
        bankCode: selectedBank.code,
        accountNumber: normalizedAccountNumber
      });
      setVerifiedName(result.resolvedName);
      setVerifiedKey(`${selectedBank.code}:${normalizedAccountNumber}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to verify account right now.';
      setVerifiedName('');
      setVerifiedKey('');
      setErrorText(message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const onContinue = async () => {
    if (!selectedBank) {
      setErrorText('Select your bank.');
      return;
    }
    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      setErrorText('Enter a valid 10-digit account number.');
      return;
    }
    if (!isVerified) {
      setErrorText('Verify your account name before continuing.');
      return;
    }

    try {
      setSaveLoading(true);
      setErrorText(null);
      await upsertMyBankAccount({
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber: normalizedAccountNumber,
        accountName: verifiedName,
        isDefault: true
      });
      await markComplete('bank');
      router.push('/profile/kyc/nok' as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to save bank details.';
      setErrorText(message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Bank Account" />
      <Card>
        <SelectField
          label="Bank"
          value={bankCode}
          options={NIGERIA_BANKS.map((bank) => ({ label: bank.name, value: bank.code }))}
          onChange={setBankCode}
          placeholder="Select bank"
        />
        <Input
          label="Account Number"
          value={normalizedAccountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
          maxLength={10}
        />
        <Button label="Verify Account" variant="secondary" onPress={() => void onVerify()} loading={verifyLoading} disabled={!canVerify} />
        {verifiedName ? (
          <Text variant="caption" color="success">
            Account name: {verifiedName}
          </Text>
        ) : null}
        {mockEnabled ? (
          <Text variant="caption" color="textMuted">
            Dev mode: account verification uses mock resolution.
          </Text>
        ) : null}
        {errorText ? (
          <Text variant="caption" color="danger">
            {errorText}
          </Text>
        ) : null}
      </Card>
      <Button label="Save and Continue" onPress={() => void onContinue()} loading={saveLoading} disabled={!isVerified} />
    </Screen>
  );
}
