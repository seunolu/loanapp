import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Input } from '../../../../src/ui/Input';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';

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
