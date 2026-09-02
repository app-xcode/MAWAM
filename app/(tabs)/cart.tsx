import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { ImageLoad } from '@/components/ui/Imageload'
import { addCart, minCart, removeCart } from '@/constants/kelolaCart'
import { rupiah } from '@/constants/rupiah'
import { Colors, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useCart } from '@/utils/CartContext'
import { Ionicons } from '@expo/vector-icons'
// import { useFocusEffect } from '@react-navigation/native'
import { router, useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, SectionList, StyleSheet, View } from 'react-native'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function DetailCart() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null)
  const [dataCart, setDataCart] = useState<any>(null)
  const [dataSelect, setDataSelect] = useState<string[]>([]);
  const [statusMemuat, setStatusMemuat] = useState<string>('Memuat keranjang...');
  const [subtotal, setSubtotal] = useState<number>(0)
  const [total, setTotal] = useState<number>(0)
  const [totalHemat, setTotalHemat] = useState<number>(0)
  const [pendingRemove, setPendingRemove] = useState<any | null>(null)
  const [removing, setRemoving] = useState(false)
  const [updatingCartItemId, setUpdatingCartItemId] = useState<string | null>(null)
  const [infoModal, setInfoModal] = useState<{ title: string; message: string; variant?: 'default' | 'destructive' | 'success' | 'warning' } | null>(null)

  const confirmRemove = async () => {
    if (!pendingRemove) return
    setRemoving(true)
    try {
      const remove = await removeCart(pendingRemove.cart_id)
      if (remove) {
        setData((prev: any[]) => prev.filter((i: any) => i.id !== pendingRemove.id))
        setPendingRemove(null)
      }
    } finally { setRemoving(false) }
  }
  const { cart, loadCart } = useCart();


  useEffect(() => {
    user && loadCart(user)
  }, [dataCart]);
  useEffect(() => {
    fetchCart();
  }, []);
  useFocusEffect(
    useCallback(() => {
      setDataSelect([])
      fetchCart();
    }, [])
  );
  useEffect(() => {
    const grouped = data?.reduce((acc: any, item: any) => {
      const tokoId = item.toko_id;

      if (!acc[tokoId]) {
        acc[tokoId] = {
          title: {
            id: item.toko_id,
            nama_toko: item.mawam_toko.nama_toko
          },
          data: [],
        };
      }

      acc[tokoId].data.push(item);

      return acc;
    }, {});
    const result = grouped ? Object.values(grouped) : null;
    setDataCart(result)
  }, [data]);
  useEffect(() => {
    let subA = 0;
    let sub = 0;
    data?.forEach((item: any) => {
      if (dataSelect.includes(item.cart_id)) {
        subA += (item.harga * item.jumlah)
        sub += ((item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga) * item.jumlah)
      }
    });
    setSubtotal(subA)
    setTotal(sub);
    setTotalHemat(subA - sub);

  }, [data, dataSelect]);

  async function fetchCart() {
    try {
      const { data, error } = await supabase
        .from('mawam_cart')
        .select(`
      id,
      qty,
      mawam_produk (
        *,
        mawam_toko:toko_id (
          nama_toko
        )
      )
    `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log(error);
        setStatusMemuat('Gagal memuat keranjang');
        return;
      }

      if (data) {
        const flatData =
          data.map((item) => ({
            cart_id: item.id,
            jumlah: item.qty,
            ...item.mawam_produk,
          })) || [];

        setData(flatData);
      }
    } catch (error) {
      console.log(error);
      setStatusMemuat('Gagal memuat keranjang');
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
    <React.Fragment>
      <ConfirmModal visible={Boolean(pendingRemove)} title="Hapus produk?" message="Produk ini akan dihapus dari keranjang." confirmText="Hapus" variant="destructive" loading={removing} onCancel={() => setPendingRemove(null)} onConfirm={confirmRemove} />
      <ConfirmModal visible={Boolean(infoModal)} title={infoModal?.title ?? ''} message={infoModal?.message ?? ''} confirmText="Mengerti" cancelText="Tutup" variant={infoModal?.variant ?? 'default'} onCancel={() => setInfoModal(null)} onConfirm={() => setInfoModal(null)} />
      <ThemedView style={{
        justifyContent: 'center',
        paddingVertical: 10
      }}>
        <ThemedText
          type="title"
          style={{ fontFamily: Fonts.rounded, textAlign: 'center' }}
          numberOfLines={1}
        >
          Keranjang Saya
        </ThemedText>
      </ThemedView>
      <View style={styles.container}>
        {dataCart && dataCart.length > 0 && <React.Fragment>
          <SectionList
            sections={dataCart}
            keyExtractor={(item) => item.cart_id}
            renderSectionHeader={({ section }) => {
              const allSelected = section.data.every((item: any) =>
                dataSelect.includes(item.cart_id)
              );

              return (
                <ThemedView
                  style={{
                    padding: 8,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderBottomWidth: 1,
                    borderColor: '#88888828',
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (allSelected) {
                          // Hapus semua item toko ini dari dataSelect
                          setDataSelect((prev) =>
                            prev.filter(
                              (id) =>
                                !section.data.some((item: any) => item.cart_id === id)
                            )
                          );
                        } else {
                          // Tambahkan semua item toko ini
                          setDataSelect((prev) => [
                            ...new Set([
                              ...prev,
                              ...section.data.map((item: any) => item.cart_id),
                            ]),
                          ]);
                        }
                      }}
                    >
                      <ThemedText>
                        <Ionicons
                          name={allSelected ? "checkbox" : "square-outline"}
                          size={20}
                        />
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => {
                      router.navigate({
                        pathname: 'toko/detail/',
                        params: {
                          toko: section.title.id
                        }
                      })
                    }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    >
                      <ThemedText
                        style={{
                          fontWeight: "bold",
                        }}
                      >
                        {section.title.nama_toko}
                      </ThemedText>
                      <ThemedText>
                        <Ionicons
                          name={"chevron-forward"}
                          size={13}
                        />
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              );
            }}
            renderSectionFooter={({ section }) => (
              <ThemedView
                style={{
                  padding: 8,
                  borderTopWidth: 1,
                  borderColor: '#88888828',
                  marginBottom: 8,
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8
                }}
              >
                <ThemedText
                >
                  {/* Tambahakan kode Voucer */}
                </ThemedText>
              </ThemedView>
            )}
            renderItem={({ item }) => {
              const harga_akhir = item?.discount > 0 && dataSelect?.includes(item.cart_id) ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
              const isUpdatingQty = updatingCartItemId === item.cart_id;

              return (
                <ThemedView
                  style={{
                    padding: 13,
                  }}
                >
                  <ThemedView style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-between', }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setDataSelect((prev) =>
                            prev.includes(item.cart_id)
                              ? prev.filter((id) => id !== item.cart_id)
                              : [...prev, item.cart_id]
                          );
                        }}
                      >
                        <ThemedText>
                          <Ionicons name={dataSelect?.includes(item.cart_id) ? 'checkbox' : 'square-outline'} size={20} />
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        router.push(
                          {
                            pathname: "/prod/detail",
                            params: { id: item.id }
                          }
                        )
                      }} style={{ flexDirection: 'row', gap: 8, flex: 1, }}>
                        <ImageLoad source={{ uri: item.gambar_produk }} style={{ width: 65, height: 65, borderRadius: 4, borderWidth: 1, borderColor: '#cccccc7d' }} />
                        <View style={{ flex: 1 }}>
                          <ThemedText numberOfLines={1} style={{ fontSize: 16 }}>{item.nama_produk}</ThemedText>
                          <ThemedText numberOfLines={1} style={{ fontSize: 12, opacity: 0.6 }}>{item.jumlah + item.satuan}</ThemedText>
                          <ThemedText numberOfLines={1} style={{ fontWeight: '600', marginTop: 5, fontSize: 16 }}>{rupiah((harga_akhir * item.jumlah), 'Rp')}</ThemedText>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 65, }}>
                      <TouchableOpacity onPress={async () => {
                        setPendingRemove(item)
                      }}>
                        <ThemedText style={{ opacity: 0.5, padding: 2 }}>
                          {item.jumlah > 1 && <Ionicons name='close' size={16} />}
                        </ThemedText>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 1, borderRadius: 8, overflow: 'hidden', }}>
                        <TouchableOpacity disabled={isUpdatingQty} style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#80808025', opacity: isUpdatingQty ? 0.5 : 1 }}
                          onPress={async () => {
                            if (isUpdatingQty) return
                            if (item.jumlah < 2) {
                              setPendingRemove(item)
                              return
                            }
                            setUpdatingCartItemId(item.cart_id)
                            try {
                              const min = await minCart(item.cart_id, item.jumlah);
                              min && setData((prev: any) =>
                                prev.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, jumlah: i.jumlah - 1 }
                                    : i
                                )
                              );
                            } catch (error) {
                              console.log(error)
                              setInfoModal({
                                title: 'Gagal mengubah jumlah',
                                message: 'Jumlah produk belum berhasil diperbarui. Coba lagi sebentar.',
                                variant: 'warning',
                              })
                            } finally {
                              setUpdatingCartItemId(null)
                            }
                          }}
                        >
                          <ThemedText style={{ fontSize: 18, fontWeight: '600', }}><Ionicons name={'remove'} size={18} /></ThemedText>
                        </TouchableOpacity>
                        <View style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#80808025', }}>
                          {isUpdatingQty ? <ActivityIndicator size="small" /> : <ThemedText style={{ fontSize: 18, fontWeight: '600', }}>{item.jumlah}</ThemedText>}
                        </View>
                        <TouchableOpacity disabled={isUpdatingQty} style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#80808025', opacity: isUpdatingQty ? 0.5 : 1 }}
                          onPress={async () => {
                            if (isUpdatingQty) return
                            if (item.jumlah >= 10) {
                              setInfoModal({
                                title: 'Jumlah maksimal',
                                message: 'Maaf, maksimal 10 produk untuk item ini.',
                                variant: 'warning',
                              })
                              return
                            }
                            setUpdatingCartItemId(item.cart_id)
                            try {
                              const add = await addCart(item.cart_id, item.jumlah);
                              add && setData((prev: any) =>
                                prev.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, jumlah: i.jumlah + 1 }
                                    : i
                                )
                              );
                            } catch (error) {
                              console.log(error)
                              setInfoModal({
                                title: 'Gagal mengubah jumlah',
                                message: 'Jumlah produk belum berhasil diperbarui. Coba lagi sebentar.',
                                variant: 'warning',
                              })
                            } finally {
                              setUpdatingCartItemId(null)
                            }
                          }}
                        >
                          <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>
                            <Ionicons name='add' size={18} />
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ThemedView>
                </ThemedView>
              )
            }}
          />
          {subtotal > 0 && <ThemedView style={{ padding: 15, gap: 10, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ opacity: 0.8 }}>Subtotal:</ThemedText>
              <ThemedText style={{ fontWeight: '600' }}>{rupiah(subtotal)}</ThemedText>
            </View>
            {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ opacity: 0.8 }}>Delivery Fee:</ThemedText>
              <ThemedText style={{ fontWeight: '600' }}>{rupiah(fee)}</ThemedText>
            </View> */}
           {totalHemat > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', }}>
              <ThemedText style={{ opacity: 0.8 }}>Discount:</ThemedText>
              <ThemedText style={{ fontWeight: '600', color:'#e73701' }}>-{rupiah(subtotal - total)}</ThemedText>
            </View>}
          </ThemedView>}
          <ThemedView style={{ padding: 15, marginTop: 2, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <ThemedText style={{ opacity: 0.8 }}>Total:</ThemedText>
              <View>
                <ThemedText style={{ fontWeight: '600', color: '#05a852', fontSize: 20 }}>{rupiah(total)}</ThemedText>
                {totalHemat > 0  && <ThemedText style={{ fontSize: 12 }}>Hemat {rupiah(totalHemat)}</ThemedText>}
              </View>
            </View>
          </ThemedView>
          <ThemedView style={{ padding: 15, marginTop: 2, borderRadius: 8 }}>
            <TouchableOpacity style={[{ width: '100%', opacity: dataSelect.length > 0 ? 1 : 0.5 }, styles.button]} onPress={() => {
              if (dataSelect.length > 0) {
                router.push({
                  pathname: "/checkout/checkout",
                  params: {
                    cart: JSON.stringify(dataSelect),
                  },
                });
              }
            }}>
              <ThemedText style={styles.buttonText} numberOfLines={1}>Check Out ({dataSelect.length})</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </React.Fragment>}
        {!data || (data && data.length < 1) && <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText style={{ textAlign: 'center' }}>
            <Ionicons name='cart-outline' size={100} style={{ opacity: 0.6 }} />
          </ThemedText>
          <ThemedText style={{ textAlign: 'center' }}>
            Keranjang belanja masih kosong
          </ThemedText>
          <TouchableOpacity style={{ padding: 10, marginTop: 15, borderRadius: 8, backgroundColor: ColorDark, paddingHorizontal: 20 }} onPress={() => {
            router.navigate('/produk')
          }}>
            <ThemedText style={{ color: ColorLight }}>
              Mulai Belanja
            </ThemedText>
          </TouchableOpacity>
        </View>}
      </View>
    </React.Fragment>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginTop: 10,
    backgroundColor: ColorDark,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: ColorLight,
    fontWeight: '600',
  },
})
