import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Input } from '../../../../src/ui/Input';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';

export default function KycNokScreen() {
  const { markComplete } = useKyc();
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  return (
    <Screen>
      <SectionHeader title="Next of Kin" />
      <Card>
        <Input label="Full Name" value={name} onChangeText={setName} />
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Card>
      <Button
        label="Finish KYC"
        onPress={async () => {
          await markComplete('nok');
          router.replace('/profile/kyc' as any);
        }}
      />
    </Screen>
  );
}
