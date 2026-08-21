import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TouchableOpacity, FlatList, StyleSheet, View } from 'react-native';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { markAsRead, markAllAsRead, fetchNotifications, getUnreadNotificationCount, deleteNotification, deleteReadNotifications } from '@/services/notification/notificationService';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleteReadOpen, setDeleteReadOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let channel: any = null;
    let mounted = true;

    async function init() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const userId = user.id;

      const initial = await fetchNotifications(userId, 50, 0);

      if (!mounted) return;

      setNotifications(initial || []);
      setUnreadCount(
        (initial || []).filter((n: any) => !n.is_read).length
      );
      setLoading(false);

      // Pastikan channel lama dengan nama ini dibersihkan
      const channelName = `notifikasi:${userId}`;

      const oldChannel = supabase
        .getChannels()
        .find(
          (c) => c.topic === `realtime:${channelName}`
        );

      if (oldChannel) {
        await oldChannel.unsubscribe();
        await supabase.removeChannel(oldChannel);
      }

      if (!mounted) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifikasi',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (!mounted) return;

            setNotifications((prev) => [
              payload.new,
              ...prev.filter((n) => n.id !== payload.new.id),
            ]);

            refreshUnreadCount(userId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifikasi',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (!mounted) return;

            setNotifications((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? payload.new
                  : item
              )
            );

            refreshUnreadCount(userId);
          }
        );
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifikasi',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (!mounted) return;

          setNotifications((prev) =>
            prev.filter((item) => item.id !== payload.old.id)
          );

          refreshUnreadCount(userId);
        }
      );

      channel.subscribe();
    }

    init();

    return () => {
      mounted = false;

      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  const refreshUnreadCount = async (userId: string) => {
    const count = await getUnreadNotificationCount(userId);
    setUnreadCount(count);
  };

  const handlePress = async (item: any) => {
    // mark read in DB and navigate using data
    const { id, data } = item;
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await markAsRead(id, user.id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      await refreshUnreadCount(user.id);
    }
    if (data && data.path) {
      // navigate using expo-router
      router.push(data.path);
    }
  };

  const handleMarkAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await refreshUnreadCount(user.id);
  };

  const handleDeleteNotification = (item: any) => setPendingDelete(item);

  const confirmDeleteNotification = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (await deleteNotification(pendingDelete.id, user.id)) {
        setNotifications((prev) => prev.filter((n) => n.id !== pendingDelete.id));
        setPendingDelete(null);
        await refreshUnreadCount(user.id);
      }
    } finally { setDeleting(false); }
  };

  const handleDeleteRead = () => setDeleteReadOpen(true);
  const confirmDeleteRead = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (await deleteReadNotifications(user.id)) {
        setNotifications((prev) => prev.filter((n) => !n.is_read));
        setDeleteReadOpen(false);
        await refreshUnreadCount(user.id);
      }
    } finally { setDeleting(false); }
  };

  return (
    <ThemedView style={{ padding: 12 }}>
      <ConfirmModal visible={Boolean(pendingDelete)} title="Hapus notifikasi?" message="Notifikasi ini akan dihapus dan tidak dapat dikembalikan." confirmText="Hapus" variant="destructive" loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={confirmDeleteNotification} />
      <ConfirmModal visible={deleteReadOpen} title="Hapus notifikasi dibaca?" message="Semua notifikasi yang sudah dibaca akan dihapus." confirmText="Hapus" variant="destructive" loading={deleting} onCancel={() => setDeleteReadOpen(false)} onConfirm={confirmDeleteRead} />
      <ThemedText type="title">Notifikasi</ThemedText>
      <ThemedText>Belum dibaca: {unreadCount}</ThemedText>
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={handleMarkAll} style={styles.button}>
          <ThemedText>Tandai semua sudah dibaca</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteRead} style={[styles.button, styles.secondaryButton]}>
          <ThemedText>Hapus yang sudah dibaca</ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.item, !item.is_read && styles.unread]}>
            <TouchableOpacity style={styles.itemBody} onPress={() => handlePress(item)}>
              <View style={styles.titleRow}>
                {!item.is_read && (
                  <ThemedView style={styles.badge}>
                    <ThemedText style={styles.badgeText}>Baru</ThemedText>
                  </ThemedView>
                )}
                <ThemedText style={[styles.itemTitle, !item.is_read && styles.itemTitleUnread]}>{item.title}</ThemedText>
              </View>
              <ThemedText style={styles.itemMsg}>{item.message}</ThemedText>
              <ThemedText style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteNotification(item)}>
              <Ionicons name="trash-outline" size={18} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        )}
        refreshing={loading}
        onRefresh={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const data = await fetchNotifications(user.id);
          setNotifications(data || []);
          setUnreadCount((data || []).filter((n: any) => !n.is_read).length);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  button: { marginVertical: 8, padding: 8, backgroundColor: '#eee', borderRadius: 8 },
  secondaryButton: { backgroundColor: '#f4f4f4' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8, flexDirection: 'row', alignItems: 'flex-start' },
  unread: { backgroundColor: '#f6f9ff' },
  itemBody: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemTitle: { fontWeight: '600', flexShrink: 1 },
  itemTitleUnread: { fontWeight: '800' },
  itemMsg: { opacity: 0.9 },
  itemDate: { opacity: 0.6, fontSize: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#ff4a1c', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  deleteButton: { padding: 6, marginTop: 2 },
});
