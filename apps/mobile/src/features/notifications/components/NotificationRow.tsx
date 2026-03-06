import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatRelativeTime } from '../../../lib/format';
import { Badge, Card, Pressable, Text, colors, spacing, typography } from '../../../ui';
import type { NotificationItem } from '../notifications.types';

type NotificationRowProps = {
  item: NotificationItem;
  onPress?: () => void;
};

export function NotificationRow({ item, onPress }: NotificationRowProps): React.JSX.Element {
  const content = (
    <Card style={[styles.card, item.status !== 'READ' ? styles.unreadCard : null]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {item.status !== 'READ' ? <View style={styles.unreadDot} /> : null}
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <Badge tone={item.statusTone} label={item.status === 'READ' ? 'Read' : 'Unread'} />
      </View>
      <Text style={styles.body} numberOfLines={2}>
        {item.body}
      </Text>
      <Text style={styles.meta}>{formatRelativeTime(item.createdAt)}</Text>
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
  unreadCard: {
    borderColor: colors.infoBorder,
    backgroundColor: colors.surface
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: colors.primary
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1
  },
  body: {
    ...typography.body,
    color: colors.textMuted
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted
  }
});
