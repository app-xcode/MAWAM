import React, { useEffect, useState } from 'react'
import {
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  View
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import ThemedInput from '@/components/themed-input'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
// import { useTheme } from '@react-navigation/native'
import { Colors } from '@/constants/theme'
import { router, useTheme } from 'expo-router'
import Alerts from '@/constants/Alerts'

export default function KategoriPage() {
  const { user } = useAuth() // kalau belum punya, bisa dihapus
  const [kategori, setKategori] = useState<any[]>([])
  const [nama, setNama] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const isDark = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const ColorBgPri = Colors[colorScheme].inputBg;
  const ColorBg = Colors[colorScheme].background;
  const ColorText = Colors[colorScheme].text;

  useEffect(() => {
    fetchKategori()
  }, [])

  // 🔹 Ambil data
  async function fetchKategori() {
    const { data, error } = await supabase
      .from('kategori')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    setKategori(data || [])
  }

  function handleBatal(editId: any) {
    if (editId) {
      setEditId(null);
      setNama('');
      return;
    }
    router.dismiss();
  }

  // 🔹 Tambah / Update
  async function handleSave() {
    if (!nama.trim()) {
      Alerts('Nama kategori wajib diisi', 'error', 'top');
      return
    }
    if (editId) {
      // UPDATE
      const { error } = await supabase
        .from('kategori')
        .update({ nama_kategori: nama })
        .eq('id', editId)

      if (error) {
        const text = error.message?.includes('duplicate') ? 'Kategori sudah ada' : 'Gagal update'
        Alerts(text, 'info', 'top')
      } else {
        setEditId(null)
        setNama('')
        fetchKategori()
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from('kategori')
        .insert({ nama_kategori: nama })

      if (error) {
        const text = error.message?.includes('duplicate') ? 'Kategori sudah ada' : 'Gagal tambah'
        Alerts(text, 'info', 'top')
      } else {
        setNama('')
        fetchKategori()
      }
    }
  }

  // 🔹 Edit
  function handleEdit(item: any) {
    setNama(item.nama_kategori)
    setEditId(item.id)
  }

  const runHapus = async (id: any) => {
    const { error } = await supabase
      .from('kategori')
      .delete()
      .eq('id', id)

    if (error) {
      Alerts('Gagal hapus', 'error');
    } else {
      fetchKategori()
    }
  }

  // 🔹 Delete
  function handleDelete(id: string) {
    Platform.OS != 'web' && Alert.alert('Hapus?', 'Yakin ingin menghapus?', [
      { text: 'Batal' },
      {
        text: 'Hapus',
        onPress: () => {
          runHapus(id)
        },
      }
    ]);

    Platform.OS == 'web' && confirm('Yakin ingin menghapus?') && runHapus(id)
  }

  const styles = StyleSheet.create({
    badge: {
      paddingVertical: 2,
      paddingHorizontal: 13,
      backgroundColor: ColorText,
      borderRadius: 13
    },
    badgeText: {
      color: ColorBg
    }
  })

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <ThemedText style={{ fontSize: 20, fontWeight: 'bold' }}>
        {user ? 'Kelola Kategori' : 'Kategori'}
      </ThemedText>

      {/* 🔹 Form */}
      {user && (
        <React.Fragment>
          <ThemedInput
            placeholder="Nama kategori"
            value={nama}
            onChangeText={setNama}
            style={{
              borderWidth: 1,
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => { handleBatal(editId) }}
              style={{
                backgroundColor: ColorBgPri,
                padding: 12,
                marginTop: 10,
                borderRadius: 8,
                width: '49%',
                borderWidth: 1,
                borderColor: ColorText
              }}
            >
              <ThemedText style={{ color: ColorText, textAlign: 'center', fontWeight:'600' }} numberOfLines={1}>
                {editId ? 'Batal' : 'Kembali'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                backgroundColor: ColorText,
                padding: 12,
                marginTop: 10,
                borderRadius: 8,
                width: '49%',
                borderWidth:1 
              }}
            >
              <ThemedText style={{ color: ColorBg, textAlign: 'center',fontWeight:'600'}} numberOfLines={1}>
                {editId ? 'Update' : 'Tambah'}
              </ThemedText>
            </TouchableOpacity>

          </View>
        </React.Fragment>
      )}

      {/* 🔹 List */}
      <FlatList
        data={kategori}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <ThemedView
            style={{
              padding: 13,
              borderWidth: 1,
              marginBottom: 4,
              borderRadius: 8,
              borderColor: ColorText
            }}
          >
            <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText numberOfLines={1}>{item.nama_kategori}</ThemedText>

              {/* tombol hanya muncul kalau login */}
              {user && (
                <ThemedView style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={styles.badge}
                  >
                    <ThemedText style={styles.badgeText}>Edit</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.badge}
                  >
                    <ThemedText style={styles.badgeText}>Hapus</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              )}
            </ThemedView>
          </ThemedView>
        )}
      />
    </View>
  )
}