import ImageFull from '@/app/prod/imageFull'
import InfoProduk from '@/app/prod/info'
import { ThemedText } from '@/components/themed-text'
import Alerts from '@/constants/Alerts'
import { supabase } from '@/lib/supabase'
import { produkCache } from '@/utils/cache'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'


export default function DetailProduk() {
  const { id, aksi } = useLocalSearchParams<any>()
  const [data, setData] = useState<any>(null)
  const [ShowImage, setShowImage] = useState<string|null>(null)
  const [ratio, setRatio] = useState(1);
  const [statusMemuat, setStatusMemuat] = useState<string>('Memuat detail...');

  useEffect(() => {
    const data = produkCache[id];
    if (data && !aksi) {
      setData(data)
      setTimeout(() => {
        fetchDetail()
      }, 1000);
    } else {
      fetchDetail()
    }
  }, []);

  const fetchDetail = async () => {
    const { data, error } = await supabase
      .from('mawam_produk')
      .select(`*, mawam_toko:toko_id(*, mawam_profile:user_id(no_hp))`)
      .eq('id', id)
      .single();
    if (error) {
      console.log(error)
      Alerts(error.message ?? 'Gagal memuat detail produk', 'error')
      setStatusMemuat('Gagal memuat detail produk');
      return
    }
    if (data) {
      const { count, error } = await supabase
        .from('mawam_produk')
        .select('*', { count: 'exact', head: true })
        .eq('toko_id', data?.toko_id);
      const dataTotal = {
        ...data,
        mawam_toko: {
          ...data?.mawam_toko,
          total_produk: count
        }
      };

      const { count: orderan, error: er2 } = await supabase
        .from('mawam_orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', data?.mawam_toko?.user_id);
      const dataOrder = {
        ...dataTotal,
        mawam_toko: {
          ...dataTotal?.mawam_toko,
          orderan: orderan
        }
      };
      produkCache[id] = dataOrder;
      setData(dataOrder)
    }
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 20 }}>{statusMemuat}</ThemedText>
      </View>
    )
  }


  return (
    <ScrollView style={styles.container}>
      {
        ShowImage ?
          <ImageFull data={data} ratio={ratio} ShowImage={ShowImage} setShowImage={setShowImage} />
          : <InfoProduk data={data} setRatio={setRatio} setShowImage={setShowImage} />}
    </ScrollView >
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})