import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text as NativeText, View } from 'react-native';
import { normalizePhoneE164, toNigeriaLocalPhoneInput } from '../../../../src/lib/phone';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Button, Card, Input, ModalSheet, Pressable, Screen, SectionHeader, Text, colors, spacing } from '../../../../src/ui';

type ContactCandidate = {
  id: string;
  name: string;
  phone: string;
};

export default function KycNokScreen() {
  const { markComplete } = useKyc();
  const [name, setName] = React.useState('');
  const [phoneLocal, setPhoneLocal] = React.useState('');
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [contactsLoading, setContactsLoading] = React.useState(false);
  const [contactsOpen, setContactsOpen] = React.useState(false);
  const [contacts, setContacts] = React.useState<ContactCandidate[]>([]);

  const normalizedPhone = normalizePhoneE164(phoneLocal);

  const onOpenContacts = async () => {
    try {
      setContactsLoading(true);
      setErrorText(null);

      const contactsModule = loadExpoContacts();
      if (!contactsModule) {
        setErrorText('Contacts are unavailable on this device. Enter details manually.');
        return;
      }
      const permission = await contactsModule.requestPermissionsAsync();
      if (!permission.granted) {
        setErrorText('Contacts permission was denied. Enter details manually.');
        return;
      }

      const payload = await contactsModule.getContactsAsync({
        fields: [contactsModule.Fields.PhoneNumbers],
        pageSize: 200
      });

      const mapped = (payload.data ?? [])
        .map((contact) => {
          const phone = contact.phoneNumbers?.[0]?.number?.trim() ?? '';
          const normalized = normalizePhoneE164(phone);
          const displayName =
            contact.name?.trim() || `${contact.firstName?.trim() ?? ''} ${contact.lastName?.trim() ?? ''}`.trim();
          if (!displayName || !normalized) {
            return null;
          }
          return {
            id: contact.id,
            name: displayName,
            phone: normalized
          };
        })
        .filter((item): item is ContactCandidate => Boolean(item))
        .slice(0, 50);

      if (mapped.length === 0) {
        setErrorText('No contacts with phone numbers were found.');
        return;
      }

      setContacts(mapped);
      setContactsOpen(true);
    } catch {
      setErrorText('Contacts are unavailable on this device. Enter details manually.');
    } finally {
      setContactsLoading(false);
    }
  };

  const onSelectContact = (contact: ContactCandidate) => {
    setName(contact.name);
    setPhoneLocal(toNigeriaLocalPhoneInput(contact.phone));
    setContactsOpen(false);
  };

  return (
    <Screen>
      <SectionHeader title="Next of Kin" />
      <Card>
        <Input label="Full Name" value={name} onChangeText={setName} />
        <Input
          label="Phone Number"
          value={phoneLocal}
          onChangeText={(value) => setPhoneLocal(toNigeriaLocalPhoneInput(value))}
          keyboardType="phone-pad"
          placeholder="8012345678"
          leftAccessory={<NativeText style={styles.prefix}>+234</NativeText>}
        />
        <Button label="Pick from Contacts" variant="secondary" onPress={() => void onOpenContacts()} loading={contactsLoading} />
        {errorText ? (
          <Text variant="caption" color="danger">
            {errorText}
          </Text>
        ) : null}
      </Card>
      <Button
        label="Finish KYC"
        onPress={async () => {
          if (!name.trim()) {
            setErrorText('Enter next of kin name.');
            return;
          }
          if (!/^\+234\d{10}$/.test(normalizedPhone)) {
            setErrorText('Enter a valid Nigerian phone number.');
            return;
          }
          setErrorText(null);
          await markComplete('nok');
          router.replace('/profile/kyc' as any);
        }}
      />

      <ModalSheet visible={contactsOpen} onClose={() => setContactsOpen(false)} title="Select Contact">
        <View style={styles.contactList}>
          {contacts.map((contact) => (
            <Pressable key={contact.id} onPress={() => onSelectContact(contact)} style={styles.contactRow}>
              <Text>{contact.name}</Text>
              <Text variant="caption" color="textMuted">
                {contact.phone}
              </Text>
            </Pressable>
          ))}
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prefix: {
    fontWeight: '700'
  },
  contactList: {
    gap: spacing.xs
  },
  contactRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4
  }
});

function loadExpoContacts(): typeof import('expo-contacts') | null {
  try {
    return require('expo-contacts') as typeof import('expo-contacts');
  } catch {
    return null;
  }
}
