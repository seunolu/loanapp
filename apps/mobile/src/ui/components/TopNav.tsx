import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Pressable, Text } from '../primitives';
import { useTheme } from '../theme';

type TopNavProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function TopNav({ title, subtitle, onBack, right }: TopNavProps): React.JSX.Element {
  const t = useTheme();

  return (
    <View style={[styles.row, { paddingVertical: t.spacing.sm, gap: t.spacing.sm }]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[
            styles.back,
            { borderColor: t.colors.border, borderRadius: t.radius.pill, width: 36, height: 36 }
          ]}
        >
          <Icon name="chevron-back" />
        </Pressable>
      ) : null}
      <View style={styles.texts}>
        <Text variant="subtitle">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
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
    alignItems: 'center'
  },
  back: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  texts: {
    flex: 1
  }
});

export type { TopNavProps };
