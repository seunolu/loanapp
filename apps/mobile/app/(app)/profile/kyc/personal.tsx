import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useMeQuery } from '../../../../src/features/home/home.queries';
import { updateMyProfile } from '../../../../src/lib/api';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button, Card, Input, ModalSheet, Screen, SectionHeader, Text } from '../../../../src/ui';

const ADULT_AGE = 18;

export default function KycPersonalScreen() {
  const queryClient = useQueryClient();
  const { markComplete } = useKyc();
  const meQuery = useMeQuery();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [fallbackVisible, setFallbackVisible] = React.useState(false);
  const [year, setYear] = React.useState(1995);
  const [month, setMonth] = React.useState(1);
  const [day, setDay] = React.useState(1);

  const seededRef = React.useRef(false);

  React.useEffect(() => {
    if (!meQuery.data || seededRef.current) {
      return;
    }

    const { first, last } = resolveNames(meQuery.data);
    setFirstName(first);
    setLastName(last);
    setDob(meQuery.data.profile?.dateOfBirth ?? '');
    seededRef.current = true;
  }, [meQuery.data]);

  const age = getAge(dob);
  const underage = age !== null && age < ADULT_AGE;

  const openDobPicker = React.useCallback(async () => {
    const current = parseDob(dob) ?? new Date(1995, 0, 1);
    const nativeOpened = await openNativeDatePicker(current, (selectedDate) => {
      setDob(formatDateValue(selectedDate));
      setErrorText(null);
    });

    if (nativeOpened) {
      return;
    }

    setYear(current.getFullYear());
    setMonth(current.getMonth() + 1);
    setDay(current.getDate());
    setFallbackVisible(true);
  }, [dob]);

  const saveFallbackDate = () => {
    const safeDay = Math.min(day, daysInMonth(year, month));
    const selected = new Date(year, month - 1, safeDay);
    setDob(formatDateValue(selected));
    setFallbackVisible(false);
    setErrorText(null);
  };

  const onSave = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorText('Enter your legal first and last name.');
      return;
    }

    if (!dob) {
      setErrorText('Select your date of birth.');
      return;
    }

    if (underage) {
      setErrorText('You must be at least 18 years old to continue.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorText(null);
      await updateMyProfile({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dateOfBirth: dob
      });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await markComplete('personal');
      router.push('/profile/kyc/identity' as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to save personal details.';
      setErrorText(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Personal Information" />
      <Card>
        <Input label="First Name" value={firstName} onChangeText={setFirstName} />
        <Input label="Last Name" value={lastName} onChangeText={setLastName} />
        <View style={styles.dateFieldWrap}>
          <Input label="Date of Birth" value={dob} editable={false} placeholder="Select your date of birth" />
          <View style={styles.dateButtonWrap}>
            <Button label="Pick Date" variant="secondary" onPress={() => void openDobPicker()} />
          </View>
        </View>
        {underage ? (
          <Text variant="caption" color="warning">
            You are below 18 years. Profile submission will be blocked.
          </Text>
        ) : null}
        {errorText ? (
          <Text variant="caption" color="danger">
            {errorText}
          </Text>
        ) : null}
      </Card>
      <Text>Save your legal identity details.</Text>
      <Button label="Save and Continue" onPress={() => void onSave()} loading={isSaving} />

      <ModalSheet visible={fallbackVisible} onClose={() => setFallbackVisible(false)} title="Select Date of Birth">
        <View style={styles.fallbackBody}>
          <Stepper
            label="Year"
            value={year}
            onDecrement={() => setYear((prev) => Math.max(1920, prev - 1))}
            onIncrement={() => setYear((prev) => Math.min(new Date().getFullYear(), prev + 1))}
          />
          <Stepper
            label="Month"
            value={month}
            onDecrement={() => setMonth((prev) => Math.max(1, prev - 1))}
            onIncrement={() => setMonth((prev) => Math.min(12, prev + 1))}
          />
          <Stepper
            label="Day"
            value={Math.min(day, daysInMonth(year, month))}
            onDecrement={() => setDay((prev) => Math.max(1, prev - 1))}
            onIncrement={() => setDay((prev) => Math.min(daysInMonth(year, month), prev + 1))}
          />
          <Button label="Use Date" onPress={saveFallbackDate} />
        </View>
      </ModalSheet>
    </Screen>
  );
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.stepperRow}>
      <Text>{label}</Text>
      <View style={styles.stepperControls}>
        <Button label="-" variant="secondary" onPress={onDecrement} />
        <Text>{String(value)}</Text>
        <Button label="+" variant="secondary" onPress={onIncrement} />
      </View>
    </View>
  );
}

type MeLike = {
  fullName?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

function resolveNames(me: MeLike): { first: string; last: string } {
  const profileFirst = me.profile?.firstName?.trim() ?? '';
  const profileLast = me.profile?.lastName?.trim() ?? '';
  if (profileFirst || profileLast) {
    return { first: profileFirst, last: profileLast };
  }

  const fullName = me.fullName?.trim() ?? '';
  if (!fullName) {
    return { first: '', last: '' };
  }
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
  return {
    first: first ?? '',
    last: rest.join(' ')
  };
}

function parseDob(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAge(dob: string): number | null {
  const parsed = parseDob(dob);
  if (!parsed) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

async function openNativeDatePicker(currentDate: Date, onSelected: (date: Date) => void): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const picker = require('@react-native-community/datetimepicker') as typeof import('@react-native-community/datetimepicker');
    picker.DateTimePickerAndroid.open({
      value: currentDate,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          onSelected(selectedDate);
        }
      }
    });
    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  dateFieldWrap: {
    gap: 8
  },
  dateButtonWrap: {
    alignSelf: 'flex-start'
  },
  fallbackBody: {
    gap: 12
  },
  stepperRow: {
    gap: 8
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  }
});
