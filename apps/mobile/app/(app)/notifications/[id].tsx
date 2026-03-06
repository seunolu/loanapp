import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { markNotificationRead } from '../../../src/features/notifications/notifications.api';
import { notificationKeys, useNotificationDetail } from '../../../src/features/notifications/notifications.queries';
import { formatDateTime } from '../../../src/lib/format';
import { Badge, Card, EmptyState, ErrorState, Screen, Skeleton, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const queryClient = useQueryClient();
  const notificationId = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  }, [params.id]);
  const notificationQuery = useNotificationDetail(notificationId);

  const readMutation = useMutation({
    mutationFn: () => markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    }
  });

  useEffect(() => {
    if (!notificationQuery.data || notificationQuery.data.status === 'READ' || readMutation.isPending) {
      return;
    }
    readMutation.mutate();
  }, [notificationQuery.data, readMutation]);

  if (!notificationId) {
    return (
      <Screen>
        <TopNav title="Notification" onBack={() => router.back()} />
        <EmptyState title="Notification not found" body="We could not resolve this alert." />
      </Screen>
    );
  }

  if (notificationQuery.isLoading) {
    return (
      <Screen>
        <TopNav title="Notification" onBack={() => router.back()} />
        <Card style={styles.card}>
          <Skeleton width="50%" height={22} />
          <Skeleton width="100%" height={16} />
          <Skeleton width="100%" height={16} />
        </Card>
      </Screen>
    );
  }

  if (notificationQuery.isError) {
    return (
      <Screen>
        <TopNav title="Notification" onBack={() => router.back()} />
        <ErrorState title="Unable to load notification" message="Please try again in a moment." onRetry={() => void notificationQuery.refetch()} />
      </Screen>
    );
  }

  const notification = notificationQuery.data;
  if (!notification) {
    return (
      <Screen>
        <TopNav title="Notification" onBack={() => router.back()} />
        <EmptyState title="Notification not found" body="No details were returned for this alert." />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopNav title="Notification" subtitle={formatDateTime(notification.createdAt)} onBack={() => router.back()} />
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{notification.title}</Text>
          <Badge tone={notification.statusTone} label={notification.status === 'READ' ? 'Read' : 'Unread'} />
        </View>
        <Text style={styles.body}>{notification.body}</Text>
      </Card>
      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Received</Text>
          <Text style={styles.infoValue}>{formatDateTime(notification.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{notification.status}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Channel</Text>
          <Text style={styles.infoValue}>{notification.channel}</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  title: {
    ...typography.h2,
    color: colors.text,
    flex: 1
  },
  body: {
    ...typography.body,
    color: colors.textMuted
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  infoLabel: {
    ...typography.body,
    color: colors.textMuted
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right'
  }
});
