import * as React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Icon, Pressable, Text } from '../primitives';
import { useTheme } from '../theme';

type ListRowProps = ViewProps & {
  title: string;
  subtitle?: string;
  rightText?: string;
  icon?: React.ComponentProps<typeof Icon>['name'];
  onPress?: () => void;
};

export function ListRow({ title, subtitle, rightText, icon = 'chevron-forward', onPress, style, ...rest }: ListRowProps) {
  const t = useTheme();
  const content = (
    <View
      {...rest}
      style={[
        styles.row,
        {
          borderBottomColor: t.colors.border,
          paddingVertical: t.spacing.md,
          gap: t.spacing.sm
        },
        style
      ]}
    >
      <View style={styles.texts}>
        <Text>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightText ? (
        <Text variant="caption" color="textMuted">
          {rightText}
        </Text>
      ) : null}
      <Icon name={icon} color="textMuted" />
    </View>
  );

  if (!onPress) {
    return content;
  }
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  texts: {
    flex: 1
  }
});

export type { ListRowProps };
