import { router } from 'expo-router';
import * as React from 'react';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button, Card, Screen, SectionHeader, SelectField, Text } from '../../../../src/ui';

type EmploymentStatus =
  | 'EMPLOYED'
  | 'SELF_EMPLOYED'
  | 'UNEMPLOYED'
  | 'STUDENT'
  | 'RETIRED'
  | 'OTHER';

type IncomeBand = '0-50000' | '50000-100000' | '100000-250000' | '250000-500000' | '500000-1000000' | '1000000+';

const EMPLOYMENT_OPTIONS: { label: string; value: EmploymentStatus }[] = [
  { label: 'Employed', value: 'EMPLOYED' },
  { label: 'Self-employed', value: 'SELF_EMPLOYED' },
  { label: 'Unemployed', value: 'UNEMPLOYED' },
  { label: 'Student', value: 'STUDENT' },
  { label: 'Retired', value: 'RETIRED' },
  { label: 'Other', value: 'OTHER' }
];

const INCOME_BAND_OPTIONS: { label: string; value: IncomeBand }[] = [
  { label: '0 - 50,000', value: '0-50000' },
  { label: '50,000 - 100,000', value: '50000-100000' },
  { label: '100,000 - 250,000', value: '100000-250000' },
  { label: '250,000 - 500,000', value: '250000-500000' },
  { label: '500,000 - 1,000,000', value: '500000-1000000' },
  { label: '1,000,000+', value: '1000000+' }
];

export default function KycEmploymentScreen() {
  const { markComplete } = useKyc();
  const [employmentStatus, setEmploymentStatus] = React.useState<EmploymentStatus | ''>('');
  const [incomeBand, setIncomeBand] = React.useState<IncomeBand | ''>('');
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const onContinue = async () => {
    if (!employmentStatus || !incomeBand) {
      setErrorText('Select your employment status and income range.');
      return;
    }
    setErrorText(null);
    await markComplete('employment');
    router.push('/profile/kyc/bank' as any);
  };

  return (
    <Screen>
      <SectionHeader title="Employment Details" />
      <Card>
        <SelectField
          label="Employment Status"
          value={employmentStatus}
          options={EMPLOYMENT_OPTIONS}
          onChange={setEmploymentStatus}
          placeholder="Select employment status"
        />
        <SelectField
          label="Monthly Income Band"
          value={incomeBand}
          options={INCOME_BAND_OPTIONS}
          onChange={setIncomeBand}
          placeholder="Select monthly income"
        />
        {errorText ? (
          <Text variant="caption" color="danger">
            {errorText}
          </Text>
        ) : null}
      </Card>
      <Button label="Save and Continue" onPress={() => void onContinue()} />
    </Screen>
  );
}

