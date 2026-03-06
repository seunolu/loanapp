import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDateTime } from '../../../lib/format';
import { Text, colors, spacing, typography } from '../../../ui';
import type { SupportMessage } from '../support.types';

type MessageBubbleProps = {
  message: SupportMessage;
};

export function MessageBubble({ message }: MessageBubbleProps): React.JSX.Element {
  const isBorrower = message.sender === 'borrower';

  return (
    <View style={[styles.wrapper, isBorrower ? styles.alignEnd : styles.alignStart]}>
      <View style={[styles.bubble, isBorrower ? styles.borrowerBubble : styles.supportBubble]}>
        <Text style={styles.body}>{message.body}</Text>
        <Text style={styles.meta}>{formatDateTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%'
  },
  alignStart: {
    alignItems: 'flex-start'
  },
  alignEnd: {
    alignItems: 'flex-end'
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1
  },
  supportBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  borrowerBubble: {
    backgroundColor: colors.secondary,
    borderColor: colors.infoBorder
  },
  body: {
    ...typography.body,
    color: colors.text
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted
  }
});
