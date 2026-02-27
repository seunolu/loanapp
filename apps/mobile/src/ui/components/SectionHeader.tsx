import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../primitives';
import { useTheme } from '../theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps): React.JSX.Element {
  const t = useTheme();

  return (
    <View style={[styles.row, { gap: t.spacing.md }]}> 
      <View style={[styles.texts, { gap: t.spacing.xxs }]}> 
        <Text variant="subtitle">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  texts: {
    flex: 1
  }
});

export type { SectionHeaderProps };
