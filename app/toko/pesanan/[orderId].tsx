import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ImageLoad } from '@/components/ui/Imageload';
import { formatWaktu } from '@/constants/countDown';
import { rupiah } from '@/constants/rupiah';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/utils/auth';
import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const ColorDark = Colors.light.tint;
const ColorLight = Colors.dark.tint;

export default function SellerOrderDetail() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const iconColor = Colors[scheme].icon;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === null) {
      router.replace('produk');
      return;
    }
    if (orderId) {
      void fetchOrder();
    }
  }, [user, orderId]);

  async function fetchOrder() {
    const { data, error } = await supabase
      .from('mawam_orders')
      .select(`
        *,
        mawam_payments:payment_id(*),
        mawam_profile:buyer_id(id, nama, no_hp, avatar_url),
        mawam_order_items(*, mawam_produk(id, nama_produk, gambar_produk, harga, satuan)),
        mawam_pengiriman(*)
      `)
      .eq('id', orderId)
      .eq('seller_id', user?.id)
      .maybeSingle();

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setOrder(data ?? null);
    setLoading(false);
  }

  if (loading || !order) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={iconColor} />
        <ThemedText>Memuat rincian pesanan...</ThemedText>
      </View>
    );
  }

  const shipping = order.mawam_pengiriman?.[0] ?? null;
  const totalQty = order.mawam_order_items?.reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0) ?? 0;

  return (
    <React.Fragment>
      <Stack.Screen options={{ title: 'Rincian Pesanan' }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <ThemedView style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ImageLoad source={{ uri: order.mawam_profile?.avatar_url || 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp' }} style={{ width: 28, height: 28, borderRadius: 14 }} />
              <ThemedText style={{ fontWeight: '700' }}>{order.mawam_profile?.nama}</ThemedText>
            </View>
            <ThemedText style={{ color: Colors[scheme].icon, fontWeight: '600' }}>{order.status}</ThemedText>
          </View>
          <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: '#cccccc1a', paddingTop: 10 }}>
            <ThemedText style={{ fontWeight: '600' }}>No. Pesanan</ThemedText>
            <ThemedText style={{ opacity: 0.8, marginTop: 4 }}>{order.invoice}</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Produk</ThemedText>
          {order.mawam_order_items?.map((item: any, idx: number) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: idx === 0 ? 0 : 1, borderColor: '#cccccc1a' }}>
              <ImageLoad source={{ uri: item.mawam_produk?.gambar_produk || 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp' }} style={{ width: 60, height: 60, borderRadius: 6 }} />
              <View style={{ flex: 1 }}>
                <ThemedText numberOfLines={1}>{item.mawam_produk?.nama_produk}</ThemedText>
                <ThemedText style={{ opacity: 0.7, marginTop: 2 }}>{item.qty} {item.mawam_produk?.satuan}</ThemedText>
                <ThemedText style={{ marginTop: 6, fontWeight: '600' }}>{rupiah(item.subtotal)}</ThemedText>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#cccccc1a' }}>
            <ThemedText>Total {totalQty} produk</ThemedText>
            <ThemedText style={{ fontWeight: '700' }}>{rupiah(order.total)}</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Pengiriman</ThemedText>
          {shipping ? (
            <View style={{ gap: 6 }}>
              <ThemedText style={{ opacity: 0.8 }}>{shipping.courier_name} • {shipping.service}</ThemedText>
              <ThemedText style={{ opacity: 0.8 }}>{shipping.penerima} • {shipping.telepon_penerima}</ThemedText>
              <ThemedText style={{ opacity: 0.8 }}>{shipping.alamat_penerima}</ThemedText>
              {shipping.estimated_days && <ThemedText style={{ opacity: 0.7 }}>Estimasi: {shipping.estimated_days}</ThemedText>}
            </View>
          ) : (
            <ThemedText style={{ opacity: 0.7 }}>Belum ada data pengiriman.</ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Pembayaran</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <ThemedText style={{ opacity: 0.7 }}>Metode</ThemedText>
            <ThemedText>{order.mawam_payments?.payment_method || '-'}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
            <ThemedText style={{ opacity: 0.7 }}>Bank</ThemedText>
            <ThemedText>{order.mawam_payments?.bank || '-'}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
            <ThemedText style={{ opacity: 0.7 }}>Waktu pemesanan</ThemedText>
            <ThemedText>{formatWaktu(order.created_at)}</ThemedText>
          </View>
          {order.mawam_payments?.paid_at && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <ThemedText style={{ opacity: 0.7 }}>Waktu pembayaran</ThemedText>
              <ThemedText>{formatWaktu(order.mawam_payments.paid_at)}</ThemedText>
            </View>
          )}
        </ThemedView>

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <ThemedText style={styles.buttonText}>Kembali</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12 },
  card: { borderRadius: 10, padding: 12 },
  button: { backgroundColor: ColorDark, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: ColorLight, fontWeight: '700' },
});
