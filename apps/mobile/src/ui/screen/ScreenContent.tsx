import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ScreenContentProps } from './types';

function ScreenContentComponent({
  children,
  preset,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  onLayoutHeightChange,
  onContentHeightChange
}: ScreenContentProps): React.JSX.Element {
  const [containerHeight, setContainerHeight] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);

  React.useEffect(() => {
    onLayoutHeightChange?.(containerHeight);
  }, [containerHeight, onLayoutHeightChange]);

  React.useEffect(() => {
    onContentHeightChange?.(contentHeight);
  }, [contentHeight, onContentHeightChange]);

  if (preset === 'fixed') {
    return (
      <View
        style={[styles.fixed, contentContainerStyle]}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          setContainerHeight(height);
          setContentHeight(height);
        }}
      >
        {children}
      </View>
    );
  }

  const autoScrollEnabled = preset === 'scroll' ? true : contentHeight > containerHeight;

  return (
    <View
      style={styles.scrollWrapper}
      onLayout={(event) => {
        setContainerHeight(event.nativeEvent.layout.height);
      }}
    >
      <ScrollView
        scrollEnabled={autoScrollEnabled}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContainer, contentContainerStyle]}
        onContentSizeChange={(_, height) => {
          setContentHeight(height);
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fixed: {
    flex: 1
  },
  scrollWrapper: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1
  }
});

export const ScreenContent = React.memo(ScreenContentComponent);
