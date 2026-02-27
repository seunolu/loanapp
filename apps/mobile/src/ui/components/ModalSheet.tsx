import * as React from 'react';
import { Animated, Easing, Modal, StyleSheet, View } from 'react-native';
import { Pressable, Text } from '../primitives';
import { useTheme } from '../theme';

type ModalSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function ModalSheet({ visible, onClose, title, children }: ModalSheetProps): React.JSX.Element {
  const t = useTheme();
  const [translateY] = React.useState(() => new Animated.Value(320));
  const [isMounted, setIsMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: 320,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [translateY, visible]);

  if (!isMounted) {
    return <></>;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: t.colors.overlay }]}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: t.colors.surface,
              borderTopLeftRadius: t.radius.lg,
              borderTopRightRadius: t.radius.lg,
              padding: t.spacing.lg,
              gap: t.spacing.md,
              transform: [{ translateY }]
            }
          ]}
        >
          {title ? <Text variant="subtitle">{title}</Text> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  dismiss: {
    flex: 1
  },
  sheet: {
    minHeight: 180
  }
});

export type { ModalSheetProps };
