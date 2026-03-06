import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDate } from '../../../lib/format';
import { Badge, Card, Pressable, Text, colors, spacing, typography } from '../../../ui';
import type { SupportTicketItem } from '../support.types';

type TicketRowProps = {
  item: SupportTicketItem;
  onPress?: () => void;
};

export function TicketRow({ item, onPress }: TicketRowProps): React.JSX.Element {
  const content = (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.texts}>
          <Text style={styles.title}>{item.subject}</Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.preview}
          </Text>
        </View>
        <Badge tone={item.statusTone} label={item.statusLabel} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.categoryLabel}</Text>
        <Text style={styles.meta}>{formatDate(item.updatedAt)}</Text>
      </View>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  texts: {
    flex: 1,
    gap: spacing.xxs
  },
  title: {
    ...typography.subtitle,
    color: colors.text
  },
  preview: {
    ...typography.body,
    color: colors.textMuted
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted
  }
});
