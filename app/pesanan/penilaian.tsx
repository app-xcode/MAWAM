import Alerts from '@/constants/Alerts';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { notifyNewReviewToSeller } from '@/services/notification/notificationTriggers';
import { useAuth } from '@/utils/auth';
import { useTheme } from '@/utils/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ReviewForm = { rating: number; review: string; imageUris: string[] };

const ColorDark = Colors.light.tint;
const ColorLight = Colors.dark.tint;

export default function PenilaianPesanan() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const [order, setOrder] = useState<any>(null);
  const [forms, setForms] = useState<Record<string, ReviewForm>>({});
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingImageItemId, setPickingImageItemId] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!user || !orderId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('mawam_orders')
      .select('id, status, mawam_order_items(id, produk_id, mawam_produk(id, nama_produk, gambar_produk, satuan))')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .single();

    if (error || !data) {
      Alerts('Pesanan selesai tidak ditemukan.', 'error');
      router.back();
      return;
    }

    const { data: reviews, error: reviewError } = await supabase
      .from('mawam_product_reviews')
      .select('order_item_id, rating, review, image_url, image_urls')
      .eq('order_id', orderId)
      .eq('buyer_id', user.id);

    if (reviewError) {
      console.log(reviewError);
      Alerts('Tabel penilaian belum tersedia. Jalankan SQL penilaian terlebih dahulu.', 'error');
      router.back();
      return;
    }

    const initialForms: Record<string, ReviewForm> = {};
    data.mawam_order_items.forEach((item: any) => {
      const saved = reviews?.find((review: any) => review.order_item_id === item.id);
      const imageUris = saved?.image_urls?.length ? saved.image_urls : (saved?.image_url ? [saved.image_url] : []);
      initialForms[item.id] = {
        rating: saved?.rating ?? 0,
        review: saved?.review ?? '',
        imageUris,
      };
    });
    setOrder(data);
    setForms(initialForms);
    setLoading(false);
  }, [orderId, user]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadOrder(); }, 0);
    return () => clearTimeout(timer);
  }, [loadOrder]);

  const updateForm = (itemId: string, patch: Partial<ReviewForm>) => {
    setForms((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  };

  const removePhoto = (itemId: string, imageUri: string) => {
    if (saving) return;
    if (imageUri.startsWith('http')) {
      setRemovedPhotoUrls((current) => current.includes(imageUri) ? current : [...current, imageUri]);
    }
    updateForm(itemId, { imageUris: forms[itemId].imageUris.filter((uri) => uri !== imageUri) });
  };

  const chooseImage = async (itemId: string) => {
    if (saving || pickingImageItemId) return;
    const currentImages = forms[itemId]?.imageUris ?? [];
    if (currentImages.length >= 3) {
      Alerts('Maksimal tiga foto untuk setiap produk.', 'error');
      return;
    }
    setPickingImageItemId(itemId);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alerts('Izinkan akses galeri untuk menambahkan foto.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 3 - currentImages.length,
        quality: 0.8,
      });
      if (result.canceled) return;

      const optimizedImages = await Promise.all(result.assets.slice(0, 3 - currentImages.length).map((asset) =>
        ImageManipulator.manipulateAsync(
          asset.uri,
          asset.width > 1280 ? [{ resize: { width: 1280 } }] : [],
          { compress: 0.75, format: ImageManipulator.SaveFormat.WEBP },
        ),
      ));
      updateForm(itemId, { imageUris: [...currentImages, ...optimizedImages.map((image) => image.uri)] });
    } finally {
      setPickingImageItemId(null);
    }
  };

  const uploadImage = async (itemId: string, imageUri: string, index: number) => {
    if (imageUri.startsWith('http')) return imageUri;
    const response = await fetch(imageUri);
    const file = await response.arrayBuffer();
    if (file.byteLength > 1 * 1024 * 1024) throw new Error('Ukuran foto maksimal 1 MB.');
    const path = `reviews/${user!.id}/${orderId}-${itemId}-${Date.now()}-${index}.webp`;
    const { error } = await supabase.storage.from('mawam').upload(path, file, { contentType: 'image/webp' });
    if (error) throw error;
    return supabase.storage.from('mawam').getPublicUrl(path).data.publicUrl;
  };

  const deleteRemovedPhotos = async () => {
    const marker = '/storage/v1/object/public/mawam/';
    const paths = removedPhotoUrls
      .map((url) => {
        const index = url.indexOf(marker);
        return index >= 0 ? decodeURIComponent(url.slice(index + marker.length).split('?')[0]) : null;
      })
      .filter((path): path is string => Boolean(path?.startsWith(`reviews/${user!.id}/`)));

    if (!paths.length) return false;
    const { error } = await supabase.storage.from('mawam').remove(paths);
    if (error) {
      console.log('Gagal menghapus foto lama:', error);
      return true;
    }
    return false;
  };

  const saveReviews = async () => {
    if (!order || !user) return;
    const missing = order.mawam_order_items.find((item: any) => !forms[item.id]?.rating);
    if (missing) {
      Alerts(`Berikan bintang untuk ${missing.mawam_produk?.nama_produk ?? 'produk ini'}.`, 'error');
      return;
    }

    setSaving(true);
    try {
      for (const item of order.mawam_order_items) {
        const form = forms[item.id];
        const imageUrls = await Promise.all(form.imageUris.map((imageUri, index) => uploadImage(item.id, imageUri, index)));
        const { error } = await supabase.from('mawam_product_reviews').upsert({
          order_id: order.id,
          order_item_id: item.id,
          product_id: item.produk_id,
          buyer_id: user.id,
          rating: form.rating,
          review: form.review.trim() || null,
          image_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
        }, { onConflict: 'buyer_id,order_item_id' });
        if (error) throw error;
      }
      const hasDeleteError = await deleteRemovedPhotos();

      const { data: orderOwnerData } = await supabase
        .from('mawam_orders')
        .select('seller_id')
        .eq('id', order.id)
        .single();

      if (orderOwnerData?.seller_id) {
        try {
          await notifyNewReviewToSeller(orderOwnerData.seller_id, order.id);
        } catch (notificationError) {
          console.log('Review notification error', notificationError);
        }
      }

      Alerts(hasDeleteError ? 'Penilaian tersimpan, tetapi sebagian foto lama belum terhapus.' : 'Penilaian berhasil dikirim.', hasDeleteError ? 'info' : 'success');
      router.back();
    } catch (error: any) {
      console.log(error);
      Alerts(error?.message ?? 'Penilaian gagal dikirim.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors[scheme].icon} /><ThemedText>Memuat penilaian...</ThemedText></View>;

  return <>
    <Stack.Screen options={{ title: 'Beri Penilaian' }} />
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.intro}>
        <Ionicons name="star-outline" size={26} color={ColorDark} />
        <View style={styles.flex}><ThemedText style={styles.title}>Bagaimana produk yang Anda terima?</ThemedText><ThemedText style={styles.description}>Beri bintang, ulasan, dan hingga tiga foto opsional untuk setiap produk.</ThemedText></View>
      </ThemedView>
      {order.mawam_order_items.map((item: any) => {
        const form = forms[item.id];
        return <ThemedView key={item.id} style={styles.card}>
          <View style={styles.productRow}>
            <Image source={{ uri: item.mawam_produk?.gambar_produk }} style={styles.productImage} />
            <View style={styles.flex}><ThemedText style={styles.productName}>{item.mawam_produk?.nama_produk}</ThemedText><ThemedText style={styles.description}>{item.mawam_produk?.satuan}</ThemedText></View>
          </View>
          <ThemedText style={styles.label}>Penilaian Anda</ThemedText>
          <View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <TouchableOpacity key={star} hitSlop={6} onPress={() => updateForm(item.id, { rating: star })}><Ionicons name={star <= form.rating ? 'star' : 'star-outline'} size={34} color={star <= form.rating ? '#F59E0B' : Colors[scheme].icon} /></TouchableOpacity>)}</View>
          <TextInput value={form.review} onChangeText={(review) => updateForm(item.id, { review })} placeholder="Ceritakan pengalaman Anda (opsional)" placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'} multiline maxLength={500} textAlignVertical="top" style={[styles.input, { color: Colors[scheme].text }]} />
          <ThemedText style={styles.count}>{form.review.length}/500</ThemedText>
          <View style={styles.photos}>
            {form.imageUris.map((imageUri, index) => <View key={`${imageUri}-${index}`} style={styles.photoWrap}><Image source={{ uri: imageUri }} style={styles.photo} /><TouchableOpacity disabled={saving} onPress={() => removePhoto(item.id, imageUri)} style={[styles.removePhoto, saving && styles.disabled]}><Ionicons name="close" size={17} color="#fff" /></TouchableOpacity></View>)}
          </View>
          {form.imageUris.length < 3 && <TouchableOpacity disabled={saving || pickingImageItemId !== null} onPress={() => void chooseImage(item.id)} style={[styles.photoButton, (saving || pickingImageItemId !== null) && styles.disabled]}>{pickingImageItemId === item.id ? <ActivityIndicator size="small" color={ColorDark} /> : <Ionicons name="image-outline" size={20} color={ColorDark} />}<ThemedText style={styles.photoButtonText}>{pickingImageItemId === item.id ? 'Menyiapkan foto...' : `Tambah foto (${form.imageUris.length}/3)`}</ThemedText></TouchableOpacity>}
        </ThemedView>;
      })}
    </ScrollView>
    <ThemedView style={styles.footer}><TouchableOpacity disabled={saving} onPress={() => router.back()} style={styles.backButton}><ThemedText style={styles.backText}>Nanti Saja</ThemedText></TouchableOpacity><TouchableOpacity disabled={saving} onPress={() => void saveReviews()} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color={ColorLight} /> : <ThemedText style={styles.saveText}>Kirim Penilaian</ThemedText>}</TouchableOpacity></ThemedView>
  </>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, container: { padding: 12, gap: 10 }, flex: { flex: 1 },
  intro: { borderRadius: 10, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, title: { fontSize: 16, fontWeight: '700' }, description: { opacity: 0.68, lineHeight: 19, marginTop: 3 },
  card: { borderRadius: 10, padding: 14, gap: 9 }, productRow: { flexDirection: 'row', gap: 10, alignItems: 'center' }, productImage: { width: 55, height: 55, borderRadius: 7, backgroundColor: '#88888822' }, productName: { fontWeight: '600' }, label: { fontWeight: '600', marginTop: 4 },
  stars: { flexDirection: 'row', gap: 7 }, input: { minHeight: 100, borderWidth: 1, borderColor: '#88888855', borderRadius: 8, padding: 10, fontSize: 14 }, count: { alignSelf: 'flex-end', opacity: 0.55, fontSize: 12, marginTop: -6 },
  photoButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: ColorDark, borderRadius: 8, padding: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, photoButtonText: { color: ColorDark, fontWeight: '600' }, photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, photoWrap: { width: 120, height: 120, position: 'relative' }, photo: { width: 120, height: 120, borderRadius: 8 }, removePhoto: { position: 'absolute', right: -7, top: -7, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626' },
  footer: { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 20 }, backButton: { flex: 1, borderWidth: 1, borderColor: ColorDark, borderRadius: 9, paddingVertical: 13, alignItems: 'center' }, backText: { color: ColorDark, fontWeight: '700' }, saveButton: { flex: 1.45, backgroundColor: ColorDark, borderRadius: 9, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }, saveText: { color: ColorLight, fontWeight: '700' }, disabled: { opacity: 0.55 },
});
