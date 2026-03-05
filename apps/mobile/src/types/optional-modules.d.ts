declare module 'expo-contacts' {
  export type ContactPhoneNumber = {
    number?: string;
    label?: string;
  };

  export type Contact = {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phoneNumbers?: ContactPhoneNumber[] | null;
  };

  export const Fields: {
    PhoneNumbers: string;
  };

  export function requestPermissionsAsync(): Promise<{ granted: boolean; status: string }>;
  export function getContactsAsync(input?: {
    fields?: string[];
    pageSize?: number;
    pageOffset?: number;
  }): Promise<{ data: Contact[] }>;
}

declare module '@react-native-community/datetimepicker' {
  export const DateTimePickerAndroid: {
    open: (params: {
      value: Date;
      mode?: 'date' | 'time' | 'datetime';
      is24Hour?: boolean;
      minimumDate?: Date;
      maximumDate?: Date;
      onChange: (event: { type: 'set' | 'dismissed' | 'neutralButtonPressed' }, date?: Date) => void;
    }) => void;
  };
}

