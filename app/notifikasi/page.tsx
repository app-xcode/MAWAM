import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ActivityIndicator, TouchableOpacity, FlatList, StyleSheet, View } from 'react-native';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { markAsRead, markAllAsRead, fetchNotifications, getUnreadNotificationCount, deleteNotification, deleteReadNotifications } from '@/services/notification/notificationService';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/utils/theme';

export default function NotifikasiPage() {
  const { isDark } = useTheme();
const colorScheme = isDark ? 'dark' : 'light';
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleteReadOpen, setDeleteReadOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
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
    if (openingNotificationId) return;
    // mark read in DB and navigate using data
    const { id, data } = item;
    setOpeningNotificationId(id);
    try {
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
    } finally {
      setOpeningNotificationId(null);
    }
  };

  const handleMarkAll = async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await refreshUnreadCount(user.id);
    } finally {
      setIsMarkingAll(false);
    }
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
    <React.Fragment>
      <Stack.Screen
        options={{
          title: 'Notifikasi',
        }}
      />
      <ConfirmModal visible={Boolean(pendingDelete)} title="Hapus notifikasi?" message="Notifikasi ini akan dihapus dan tidak dapat dikembalikan." confirmText="Hapus" variant="destructive" loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={confirmDeleteNotification} />
      <ConfirmModal visible={deleteReadOpen} title="Hapus notifikasi dibaca?" message="Semua notifikasi yang sudah dibaca akan dihapus." confirmText="Hapus" variant="destructive" loading={deleting} onCancel={() => setDeleteReadOpen(false)} onConfirm={confirmDeleteRead} />
      {loading &&
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10
        }}>
          <ActivityIndicator />
          <ThemedText>Memuat notifikasi...</ThemedText>
        </View>
      }
      {!loading && notifications.length == 0 &&
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10
        }}>
          <Ionicons
            name="notifications"
            size={80}
            color="#9CA3AF"
          />

          <ThemedText style={{ marginTop: 12, fontSize: 18, fontWeight: "600" }}>
            Belum ada Notifkasi
          </ThemedText>

          <ThemedText style={{ color: "#6B7280", textAlign: "center", marginTop: 4 }}>
            Notifikasi akan muncul di sini.
          </ThemedText>
        </View>
      }
      {!loading && notifications.length > 0 && <ScrollView style={{ padding: 12 }}>
        {/* <ThemedText type="title">Notifikasi</ThemedText> */}
        {unreadCount > 0 && <ThemedText>Belum dibaca: {unreadCount}</ThemedText>}
        {notifications.length > 0 && <View style={styles.actionRow}>
          <TouchableOpacity disabled={isMarkingAll} onPress={handleMarkAll} style={[styles.button, isMarkingAll && styles.disabled]}>
            {isMarkingAll ? <ActivityIndicator size="small" /> : <ThemedText>Tandai semua sudah dibaca</ThemedText>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteRead} style={[styles.button, styles.secondaryButton]}>
            <ThemedText>Hapus yang sudah dibaca</ThemedText>
          </TouchableOpacity>
        </View>}

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.item, !item.is_read && styles.unread]}>
              <TouchableOpacity disabled={openingNotificationId !== null} style={styles.itemBody} onPress={() => handlePress(item)}>
                <View style={styles.titleRow}>
                  {!item.is_read && (
                   <ThemedView style={[styles.badge, { backgroundColor: Colors[colorScheme].accent }]}>
                      <ThemedText style={styles.badgeText}>Baru</ThemedText>
                    </ThemedView>
                  )}
                  <ThemedText style={[styles.itemTitle, !item.is_read && styles.itemTitleUnread]}>{item.title}</ThemedText>
                </View>
                <ThemedText style={styles.itemMsg}>{item.message}</ThemedText>
                <ThemedText style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</ThemedText>
                {openingNotificationId === item.id && <ThemedText style={styles.itemDate}>Membuka...</ThemedText>}
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
      </ScrollView>}
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  button: { marginVertical: 8, padding: 8, backgroundColor: '#8a8a8a18', borderRadius: 8 },
  secondaryButton: { backgroundColor: '#ff330028' },
  disabled: { opacity: 0.6 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8, flexDirection: 'row', alignItems: 'flex-start' },
  unread: { backgroundColor: '#75d3ff23' },
  itemBody: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemTitle: { fontWeight: '600', flexShrink: 1 },
  itemTitleUnread: { fontWeight: '800' },
  itemMsg: { opacity: 0.9 },
  itemDate: { opacity: 0.6, fontSize: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  deleteButton: { padding: 6, marginTop: 2 },
});
