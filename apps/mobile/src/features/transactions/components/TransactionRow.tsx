import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDate, formatMoneyNGN } from '../../../lib/format';
import { Card, Pressable, Text, colors, spacing, typography } from '../../../ui';
import type { TransactionItem } from '../transactions.types';
import { TransactionStatusPill } from './TransactionStatusPill';

type TransactionRowProps = {
  item: TransactionItem;
  onPress?: () => void;
};

export function TransactionRow({ item, onPress }: TransactionRowProps): React.JSX.Element {
  const content = (
    <Card style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.texts}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.caption}>{item.narration}</Text>
        </View>
        <View style={styles.trailing}>
          <Text style={styles.amount}>{formatMoneyNGN(item.amountKobo, 'kobo')}</Text>
          <TransactionStatusPill statusLabel={item.statusLabel} tone={item.statusTone} />
        </View>
      </View>
      <View style={styles.rowBottom}>
        <Text style={styles.meta}>{item.kindLabel}</Text>
        <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>
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
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  texts: {
    flex: 1,
    gap: spacing.xxs
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  title: {
    ...typography.subtitle,
    color: colors.text
  },
  amount: {
    ...typography.subtitle,
    color: colors.text
  },
  caption: {
    ...typography.body,
    color: colors.textMuted
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted
  }
});
