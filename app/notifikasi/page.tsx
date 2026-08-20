import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { markAsRead, markAllAsRead, fetchNotifications } from '@/services/notification/notificationService';
import { useRouter } from 'expo-router';

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let channel: any;
    let mounted = true;

    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const userId = user.id;

      const initial = await fetchNotifications(userId, 50, 0);
      if (!mounted) return;
      setNotifications(initial || []);
      setUnreadCount((initial || []).filter((n: any) => !n.is_read).length);
      setLoading(false);

      // realtime subscription
      channel = supabase.channel(`notifikasi:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `user_id=eq.${userId}` }, (payload: any) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((c) => c + 1);
        })
        .subscribe();
    }

    init();

    return () => {
      mounted = false;
      if (channel && channel.unsubscribe) channel.unsubscribe();
    };
  }, []);

  const handlePress = async (item: any) => {
    // mark read in DB and navigate using data
    const { id, data } = item;
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await markAsRead(id, user.id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
    setUnreadCount(0);
  };

  return (
    <ThemedView style={{ padding: 12 }}>
      <ThemedText type="title">Notifikasi</ThemedText>
      <ThemedText>Belum dibaca: {unreadCount}</ThemedText>
      <TouchableOpacity onPress={handleMarkAll} style={styles.button}>
        <ThemedText>Mark all as read</ThemedText>
      </TouchableOpacity>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.item, !item.is_read && styles.unread]} onPress={() => handlePress(item)}>
            <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.itemMsg}>{item.message}</ThemedText>
            <ThemedText style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</ThemedText>
          </TouchableOpacity>
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
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unread: { backgroundColor: '#f6f9ff' },
  itemTitle: { fontWeight: '600' },
  itemMsg: { opacity: 0.9 },
  itemDate: { opacity: 0.6, fontSize: 12 },
});
