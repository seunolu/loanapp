import AsyncStorage from '@react-native-async-storage/async-storage';

const IN_APP_NOTIFICATIONS_KEY = 'loanapp.mobile.preferences.inAppNotifications';

export async function getInAppNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(IN_APP_NOTIFICATIONS_KEY);
  if (value === null) {
    return true;
  }
  return value === 'true';
}

export async function setInAppNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(IN_APP_NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
}
