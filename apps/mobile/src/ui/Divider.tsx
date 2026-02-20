import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from './theme';

export function Divider(): React.JSX.Element {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border
  }
});

