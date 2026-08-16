import { ImageLoad } from '@/components/ui/Imageload';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/utils/theme';

const photoList = (review: any): string[] => review?.image_urls?.length ? review.image_urls : (review?.image_url ? [review.image_url] : []);

export default function SemuaPenilaian() {
  const { productId, productName } = useLocalSearchParams<{ productId: string; productName?: string }>();
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const iconColor = Colors[scheme].icon;
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [withPhoto, setWithPhoto] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('mawam_product_reviews').select('id, buyer_id, rating, review, image_url, image_urls, created_at').eq('product_id', productId).order('created_at', { ascending: false });
      if (active) {
        if (error) console.log(error);
        const buyerIds = [...new Set((data ?? []).map((review: any) => review.buyer_id).filter(Boolean))];
        const { data: profiles } = buyerIds.length ? await supabase.from('mawam_profile').select('id, nama').in('id', buyerIds) : { data: [] };
        const names = new Map((profiles ?? []).map((profile: any) => [profile.id, profile.nama]));
        setReviews((data ?? []).map((review: any) => ({ ...review, buyerName: names.get(review.buyer_id) || 'Pembeli' })));
        setLoading(false);
      }
    };
    if (productId) void load();
    return () => { active = false; };
  }, [productId]);

  const filteredReviews = reviews.filter((review) => (ratingFilter === null || Number(review.rating) === ratingFilter) && (!withPhoto || photoList(review).length > 0));

  return <>
    <Stack.Screen options={{ title: productName ? `Penilaian ${productName}` : 'Penilaian Produk' }} />
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.filterCard}>
        <ThemedText style={styles.filterTitle}>Filter penilaian</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity onPress={() => setRatingFilter(null)} style={[styles.filterChip, ratingFilter === null && { backgroundColor: Colors.light.tint }]}><ThemedText style={ratingFilter === null ? styles.activeText : undefined}>Semua</ThemedText></TouchableOpacity>
          {[5, 4, 3, 2, 1].map((rating) => <TouchableOpacity key={rating} onPress={() => setRatingFilter(ratingFilter === rating ? null : rating)} style={[styles.filterChip, ratingFilter === rating && { backgroundColor: Colors.light.tint }]}><Ionicons name="star" size={15} color="#F59E0B" /><ThemedText style={ratingFilter === rating ? styles.activeText : undefined}>{rating}</ThemedText></TouchableOpacity>)}
          <TouchableOpacity onPress={() => setWithPhoto((value) => !value)} style={[styles.filterChip, withPhoto && { backgroundColor: Colors.light.tint }]}><Ionicons name="image-outline" size={16} color={iconColor} /><ThemedText style={withPhoto ? styles.activeText : undefined}>+ Foto</ThemedText></TouchableOpacity>
        </ScrollView>
      </ThemedView>
      {loading ? <View style={styles.loading}><ActivityIndicator color={iconColor} /><ThemedText>Memuat ulasan...</ThemedText></View> : filteredReviews.length === 0 ? <ThemedView style={styles.empty}><Ionicons name="chatbubble-ellipses-outline" size={28} color={iconColor} /><ThemedText>Belum ada ulasan sesuai filter.</ThemedText></ThemedView> : filteredReviews.map((review) => {
        const images = photoList(review);
        return <ThemedView key={review.id} style={styles.reviewCard}>
          <View style={styles.ratingRow}><ThemedText style={styles.reviewerName}>{review.buyerName}</ThemedText>{[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={18} color="#F59E0B" />)}<ThemedText style={styles.date}>{new Date(review.created_at).toLocaleDateString('id-ID')}</ThemedText></View>
          {!!review.review && <ThemedText style={styles.reviewText}>{review.review}</ThemedText>}
          {images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>{images.slice(0, 3).map((image: string) => <ImageLoad key={image} source={{ uri: image }} style={styles.photo} />)}</ScrollView>}
        </ThemedView>;
      })}
      <TouchableOpacity onPress={() => router.back()} style={styles.back}><ThemedText style={styles.backText}>Kembali</ThemedText></TouchableOpacity>
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 10 }, filterCard: { borderRadius: 10, padding: 12, gap: 8 }, filterTitle: { fontWeight: '700' }, filterRow: { gap: 4, alignItems: 'center' }, filterChip: { borderWidth: 1, borderColor: '#88888866', borderRadius: 18, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }, activeText: { color: Colors.dark.text, fontWeight: '600' }, loading: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 }, empty: { padding: 28, borderRadius: 10, alignItems: 'center', gap: 8 }, reviewCard: { borderRadius: 10, padding: 13, gap: 8 }, ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 }, reviewerName: { fontWeight: '600', marginRight: 6 }, date: { marginLeft: 8, opacity: 0.6, fontSize: 12 }, reviewText: { lineHeight: 20 }, photos: { gap: 8 }, photo: { width: 105, height: 105, borderRadius: 8 }, back: { borderWidth: 1, borderColor: Colors.light.tint, borderRadius: 9, alignItems: 'center', paddingVertical: 12, marginTop: 4 }, backText: { color: Colors.light.tint, fontWeight: '700' },
});
