import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Toast } from './Toast';
import { dismissToast, subscribeToast, type ToastRecord } from './toast-store';

export function ToastHost(): React.JSX.Element {
  const [current, setCurrent] = React.useState<ToastRecord | null>(null);

  React.useEffect(() => {
    return subscribeToast((state) => {
      setCurrent(state.current);
    });
  }, []);

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {current ? (
        <Toast
          key={current.id}
          visible
          title={current.title}
          message={current.message}
          type={current.type}
          durationMs={current.durationMs}
          onHide={() => dismissToast(current.id)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 40
  }
});

