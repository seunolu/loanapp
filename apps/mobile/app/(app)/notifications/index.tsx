import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { NotificationRow } from '../../../src/features/notifications/components/NotificationRow';
import { markAllNotificationsRead } from '../../../src/features/notifications/notifications.api';
import { notificationKeys, useNotifications } from '../../../src/features/notifications/notifications.queries';
import { Button, EmptyState, ErrorState, Screen, TopNav, Badge, showToast, spacing } from '../../../src/ui';

export default function NotificationsIndexScreen() {
  const queryClient = useQueryClient();
  const notificationsQuery = useNotifications();
  const unreadCount = (notificationsQuery.data?.items ?? []).filter((item) => item.status !== 'READ').length;

  const markAllMutation = useMutation({
    mutationFn: async () => markAllNotificationsRead(notificationsQuery.data?.items ?? []),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      showToast({ type: 'success', title: 'Notifications updated', message: 'All notifications were marked as read.' });
    }
  });

  return (
    <Screen preset="fixed">
      <TopNav
        title="Notifications"
        subtitle="Stay on top of your account activity."
        onBack={() => router.back()}
        right={<Badge tone={unreadCount > 0 ? 'info' : 'muted'} label={`${unreadCount}`} />}
      />
      {notificationsQuery.isError ? (
        <View style={styles.stateBlock}>
          <ErrorState
            title="Unable to load notifications"
            message="Please try again in a moment."
            onRetry={() => void notificationsQuery.refetch()}
          />
        </View>
      ) : null}
      {!notificationsQuery.isError ? (
        <View style={styles.actionRow}>
          <Button
            label="Mark all read"
            variant="secondary"
            size="sm"
            loading={markAllMutation.isPending}
            disabled={unreadCount === 0}
            onPress={() => markAllMutation.mutate()}
          />
        </View>
      ) : null}
      {!notificationsQuery.isLoading && !notificationsQuery.isError && (notificationsQuery.data?.items.length ?? 0) === 0 ? (
        <View style={styles.stateBlock}>
          <EmptyState title="No notifications yet" body="Alerts and updates will appear here once they are available." />
        </View>
      ) : null}
      {!notificationsQuery.isError && (notificationsQuery.data?.items.length ?? 0) > 0 ? (
        <FlatList
          data={notificationsQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => router.push(`/notifications/${item.id}` as never)} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={notificationsQuery.isRefetching} onRefresh={() => void notificationsQuery.refetch()} />
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    marginBottom: spacing.sm,
    alignItems: 'flex-start'
  },
  stateBlock: {
    flex: 1,
    justifyContent: 'center'
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl
  }
});
