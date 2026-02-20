import { router } from 'expo-router';
import * as React from 'react';
import { Text } from 'react-native';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Input } from '../../../../src/ui/Input';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';

export default function KycPersonalScreen() {
  const { markComplete } = useKyc();
  const [fullName, setFullName] = React.useState('');
  const [dob, setDob] = React.useState('');

  return (
    <Screen>
      <SectionHeader title="Personal Information" />
      <Card>
        <Input label="Full Name" value={fullName} onChangeText={setFullName} />
        <Input label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
      </Card>
      <Text>Save your legal identity details.</Text>
      <Button
        label="Save and Continue"
        onPress={async () => {
          await markComplete('personal');
          router.push('/profile/kyc/identity' as any);
        }}
      />
    </Screen>
  );
}
