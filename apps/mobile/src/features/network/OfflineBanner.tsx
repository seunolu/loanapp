import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../ui/primitives';
import { useTheme } from '../../ui/theme';
import { showToast } from '../../ui/feedback/toast-store';
import { useNetworkStatus } from './useNetworkStatus';

export function OfflineBanner(): React.JSX.Element | null {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { isOffline, hasResolved } = useNetworkStatus();
  const wasOffline = React.useRef(false);

  React.useEffect(() => {
    if (!hasResolved) {
      return;
    }

    if (wasOffline.current && !isOffline) {
      showToast({ type: 'success', title: 'Back online' });
    }

    wasOffline.current = isOffline;
  }, [hasResolved, isOffline]);

  if (!hasResolved || !isOffline) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top,
          backgroundColor: t.colors.warningSurface,
          borderColor: t.colors.warningBorder
        }
      ]}
    >
      <Text color="warning" weight="600">
        You&apos;re offline. Some features may not work.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 50
  }
});

