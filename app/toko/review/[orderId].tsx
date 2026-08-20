import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ImageLoad } from '@/components/ui/Imageload';
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

export default function SellerReviewDetail() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const iconColor = Colors[scheme].icon;
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === null) {
      router.replace('produk');
      return;
    }
    if (orderId) {
      void loadReviews();
    }
  }, [user, orderId]);

  async function loadReviews() {
    const { data, error } = await supabase
      .from('mawam_product_reviews')
      .select(`
        *,
        mawam_profile:buyer_id(id, nama, avatar_url),
        mawam_produk:product_id(id, nama_produk, gambar_produk)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }
    setReviews(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={iconColor} />
        <ThemedText>Memuat penilaian produk...</ThemedText>
      </View>
    );
  }

  return (
    <React.Fragment>
      <Stack.Screen options={{ title: 'Penilaian Produk' }} />
      <ScrollView contentContainerStyle={styles.container}>
        {reviews.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Ionicons name="star-outline" size={28} color={iconColor} />
            <ThemedText>Belum ada penilaian untuk pesanan ini.</ThemedText>
          </ThemedView>
        ) : (
          reviews.map((review) => {
            const images = review.image_urls?.length ? review.image_urls : (review.image_url ? [review.image_url] : []);
            return (
              <ThemedView key={review.id} style={styles.card}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <ImageLoad source={{ uri: review.mawam_produk?.gambar_produk || 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp' }} style={{ width: 54, height: 54, borderRadius: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: '700' }}>{review.mawam_produk?.nama_produk}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      {[1,2,3,4,5].map((star) => (
                        <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={16} color="#F59E0B" />
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: '#cccccc1a', paddingTop: 10 }}>
                  <ThemedText style={{ fontWeight: '600', marginBottom: 4 }}>Pembeli</ThemedText>
                  <ThemedText style={{ opacity: 0.8 }}>{review.mawam_profile?.nama || 'Pembeli'}</ThemedText>
                </View>

                {review.review ? (
                  <ThemedText style={{ marginTop: 12, lineHeight: 20, opacity: 0.8 }}>{review.review}</ThemedText>
                ) : (
                  <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Pembeli tidak menulis ulasan.</ThemedText>
                )}

                {images.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {images.map((image: string, index: number) => (
                      <ImageLoad key={`${image}-${index}`} source={{ uri: image }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                    ))}
                  </View>
                )}
              </ThemedView>
            );
          })
        )}

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
  emptyCard: { borderRadius: 10, padding: 18, alignItems: 'center', gap: 8 },
  button: { backgroundColor: ColorDark, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: ColorLight, fontWeight: '700' },
});
