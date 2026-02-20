import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Input } from '../../../../src/ui/Input';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';

export default function KycEmploymentScreen() {
  const { markComplete } = useKyc();
  const [employment, setEmployment] = React.useState('');
  const [income, setIncome] = React.useState('');
  return (
    <Screen>
      <SectionHeader title="Employment Details" />
      <Card>
        <Input label="Employment Status" value={employment} onChangeText={setEmployment} />
        <Input label="Monthly Income" value={income} onChangeText={setIncome} keyboardType="number-pad" />
      </Card>
      <Button
        label="Save and Continue"
        onPress={async () => {
          await markComplete('employment');
          router.push('/profile/kyc/bank' as any);
        }}
      />
    </Screen>
  );
}
