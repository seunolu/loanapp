import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button, Card, Input, Screen, SectionHeader } from '../../../../src/ui';

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


