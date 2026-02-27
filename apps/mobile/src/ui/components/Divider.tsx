import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

export function Divider(): React.JSX.Element {
  const t = useTheme();
  return <View style={[styles.base, { backgroundColor: t.colors.border }]} />;
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: 1
  }
});
