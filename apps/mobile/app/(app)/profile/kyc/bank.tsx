import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button, Card, Input, Screen, SectionHeader } from '../../../../src/ui';

export default function KycBankScreen() {
  const { markComplete } = useKyc();
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  return (
    <Screen>
      <SectionHeader title="Bank Account" />
      <Card>
        <Input label="Bank Name" value={bankName} onChangeText={setBankName} />
        <Input label="Account Number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
      </Card>
      <Button
        label="Save and Continue"
        onPress={async () => {
          await markComplete('bank');
          router.push('/profile/kyc/nok' as any);
        }}
      />
    </Screen>
  );
}


