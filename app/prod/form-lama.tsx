import { deleteImage } from '@/app/prod/dataProduk'
import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { BackgroundImage } from '@/components/ui/background-image'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { formatRupiah, rupiah } from '@/constants/rupiah'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { produkCache } from '@/utils/cache'
import { useTheme } from '@/utils/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ModalScreen() {
    const { user } = useAuth();
    const { id } = useLocalSearchParams<any>()
    const isEdit = id != undefined && id != null && id != '';
    const [data, setData] = useState<any>(null)
    const [newImage, setnewImage] = useState<any>(null)
    const [loadingUI, setLoadingUI] = useState<boolean>(false);
    const [submitForm, setSubmitForm] = useState<boolean>(false);
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const iconBg = Colors[colorScheme].inputBg;
    const border = Colors[colorScheme].border;
    const bgColor = Colors[colorScheme].inputBg;
    const textColor = Colors[colorScheme].text;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [imageUpload, setImageUpload] = useState<any>(gambarDefault);
    const [processing, setProcessing] = useState(false);
    const [initialForm, setInitialForm] = useState<any>(null);

    const selectS = StyleSheet.create({ button: { backgroundColor: bgColor, borderColor: border, padding: 10, marginBottom: 12, height: 40 }, buttonText: { color: textColor }, overlay: { backgroundColor: bgColor + '71', width: 500, maxWidth: '100%', alignSelf: 'center' }, item: { borderColor: border, backgroundColor: textColor }, itemText: { color: bgColor, textAlign: 'center', fontWeight: 'bold' } })

    useEffect(() => {
        if (!user) {
            router.replace('produk');
        }
    }, [user]);

    const [form, setForm] = useState({
        toko_id: null,
        nama_produk: '',
        harga: '',
        stok: '',
        satuan: 'kg',
        discount: 0,
        berat_per_unit: '',
        deskripsi: '',
        gambar_produk: '',
    });

    useEffect(() => {
        if (user) {
            getToko();
        }
    }, [user]);

    const getToko = async () => {
        const { data, error } = await supabase
            .from('mawam_toko')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (error) {
            Alerts('Silakan buat toko terlebih dahulu', 'error');
            router.replace('/toko/form');
            return;
        }

        setForm(prev => ({
            ...prev,
            toko_id: data.id,
        }));
    };

    const convertToWebp = async (image: any, quality: number = 1.0): Promise<any> => {
        const MAX_WIDTH = 700;
        const MAX_BYTE_SIZE = 1 * 1024 * 1024; // 1 MB

        // 1. Tentukan aksi (hanya resize di iterasi pertama jika lebar > 700)
        const actions: ImageManipulator.Action[] =
            (image.width > MAX_WIDTH && quality === 1.0)
                ? [{ resize: { width: MAX_WIDTH } }]
                : [];

        // 2. Jalankan manipulasi gambar
        const result = await ImageManipulator.manipulateAsync(
            image.uri,
            actions,
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.WEBP,
            }
        );

        // 3. Cek ukuran file menggunakan ArrayBuffer (Aman untuk Web, Android, iOS)
        const response = await fetch(result.uri);
        const buffer = await response.arrayBuffer();
        const fileSize = buffer.byteLength; // byteLength memberikan ukuran file asli

        // 4. Logika Rekursif: Jika masih > 1MB, turunkan quality
        if (fileSize > MAX_BYTE_SIZE && quality > 0.2) {
            const newQuality = Math.round((quality - 0.2) * 10) / 10;

            // Teruskan proses dengan URI baru hasil kompresi sebelumnya
            return await convertToWebp({ ...image, uri: result.uri }, newQuality);
        }

        // 5. Kembalikan hasil akhir jika ukuran sudah sesuai atau quality sudah minimum
        return result;
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.3
        });

        if (!result.canceled) {
            return result.assets[0];
        }

        return null;
    };

    const uploadImage = async (image: any) => {
        const response = await fetch(image.uri);
        const arrayBuffer = await response.arrayBuffer();
        image.mimeType = 'image/webp';
        image.fileSize = arrayBuffer.byteLength;
        const fileExt = 'webp';
        const MAX_SIZE = 1 * 1024 * 1024; // 1MB
        if (image.fileSize && image.fileSize > MAX_SIZE) {
            Alerts('Ukuran gambar ' + Math.floor(image.fileSize / 1024 / 1024) + 'MB melebihi 1MB', 'error');
            return null;
        }
        const fileName = `produk_${Date.now()}.${fileExt}`;
        try {
            const { error } = await supabase.storage
                .from('mawam')
                .upload(fileName, arrayBuffer, {
                    contentType: image.mimeType,
                });

            if (error) {
                console.log(error);
                Alerts('Upload gagal', 'error');
                return null;
            }

            const { data: urlData } = supabase.storage
                .from('mawam')
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (error) {
            console.log(error);
            Alerts('Upload gagal', 'error');
            return gambarDefault;
        }
    };

    const handlePickAndUpload = async () => {
        if (processing) return;
        setProcessing(true);
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alerts('Permission to access the media library is required.', 'error');
                return;
            }
            const image = await pickImage();
            if (!image) return;

            setLoadingUI(true);

            const converted = await convertToWebp(image);

            if (converted) {
                setImageUpload(converted.uri);
                setnewImage(converted);
            }
        } finally {
            setLoadingUI(false);
            setProcessing(false);
        }
    };

    const handleSubmit = async (datas: any) => {
        if (!isFormChanged()) {
            Alerts('Tidak ada perubahan', 'info');
            if (router.canGoBack()) router.back()
            return;
        }
        if (!form.nama_produk) {
            Alerts('Nama produk wajib diisi', 'error');
            return;
        }
        setSubmitForm(true);
        const url = newImage && await uploadImage(newImage) || form.gambar_produk || datas?.gambar_produk || gambarDefault;
        const deleteLama = isEdit && url != datas?.gambar_produk && await deleteImage(datas?.gambar_produk) || true;
        if (deleteLama && url) {
            try {
                const { data: toko } = await supabase
                    .from('mawam_toko')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                const { data, error } = isEdit ?
                    await supabase
                        .from('mawam_produk')
                        .update([
                            {
                                ...form,
                                toko_id: toko ? toko.id : form.toko_id,
                                gambar_produk: url,
                            }
                        ]).eq('id', id).select().single()
                    :
                    await supabase
                        .from('mawam_produk')
                        .insert([
                            {
                                ...form,
                                toko_id: toko ? toko.id : form.toko_id,
                                gambar_produk: url,
                            }
                        ]).select().single();

                if (error) {
                    Alerts('Gagal Simpan Data: ' + error.message, 'error');
                } else {
                    Alerts('Berhasil ' + (isEdit ? 'diedit' : 'ditambahkan'), 'success');

                    if (data) {
                        if (isEdit) {
                            router.dismissAll();
                            router.navigate('/produk?aksi=edit&id=' + data.id);
                        } else {
                            router.dismissAll();
                            router.navigate('/produk?aksi=tambah&id=' + data.id);
                        }
                    }
                }
            }
            catch (error) {
                console.log(error);
                Alerts('Gagal menyimpan data', 'error');
            } finally {
                setSubmitForm(false);
            }
        }
    };

    useEffect(() => {
        if (!id) return setData([])
        const cached = produkCache[id];
        if (cached) {
            setData(cached)
        } else {
            fetchDetail()
        }
    }, [id]);

    const fetchDetail = async () => {
        try {
            const query = supabase
                .from('mawam_produk')
                .select('*')
                .limit(1);
            isEdit && query.eq('id', id)
            const { data, error } = await query;
            if (error) {
                console.log(error)
                setData([])
            } else if (data && data.length) {
                setData(data[0])
                produkCache[id] = data[0];
            }
        } catch (error) {
            console.log(error)
            setData([])
        }
    }

    const isFormChanged = () => {
        if (!initialForm) return true;
        return (
            form.nama_produk !== initialForm.nama_produk ||
            form.toko_id !== initialForm.toko_id ||
            form.harga !== initialForm.harga ||
            form.stok !== initialForm.stok ||
            form.satuan !== initialForm.satuan ||
            form.discount !== initialForm.discount ||
            form.berat_per_unit !== initialForm.berat_per_unit ||
            form.deskripsi !== initialForm.deskripsi ||
            form.gambar_produk !== initialForm.gambar_produk ||
            newImage
        );
    };

    useEffect(() => {
        if (!isEdit || !data) return;
        setImageUpload(data?.gambar_produk ?? gambarDefault);
        const init = {
            toko_id: data?.toko_id || null,
            nama_produk: data?.nama_produk || '',
            harga: data?.harga || '',
            stok: data?.stok || '',
            satuan: data?.satuan || 'kg',
            discount: data?.discount || 0,
            berat_per_unit: data?.berat_per_unit || '',
            deskripsi: data?.deskripsi || '',
            gambar_produk: data?.gambar_produk,
        };
        setForm(init);
        setInitialForm(init);
    }, [data, isEdit]);


    if (!data) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Memuat Form...</ThemedText>
            </View>
        )
    }

    const options = [
        { label: 'Opsi 1', value: '1' },
        { label: 'Opsi 2', value: '2' },
    ];

    return (
        <React.Fragment>
            <Stack.Screen options={{ title: isEdit ? 'Edit Produk' : 'Tambah Produk' }} />
            {submitForm ? <View style={{
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 9,
                backgroundColor: '#000000a2',
            }}>
                <ActivityIndicator size="large" color={ColorLight} />
                <ThemedText style={{ color: ColorLight, marginTop: 5 }}>{isEdit ? 'Perbaharui' : 'Menyimpan'}...</ThemedText>
            </View> : undefined}
            <KeyboardAwareScrollView
                enableOnAndroid
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <BackgroundImage
                        source={{
                            uri: imageUpload && imageUpload !== '' ? imageUpload : gambarDefault
                        }}
                        bgStyle={{ filter: `blur(10px) brightness(0.9)`, objectFit: 'cover', blurRadius: 10 }}

                        style={{ width: '100%', height: 250, marginBottom: 20, borderRadius: 10, overflow: 'hidden', }}>
                        <ImageLoad
                            source={{
                                uri: imageUpload && imageUpload !== '' ? imageUpload : gambarDefault
                            }}
                            contentFit="contain"
                            transition={300}
                            style={styles.image}
                        />
                    </BackgroundImage>
                    <ThemedText style={styles.label}>Gambar Produk</ThemedText>
                    <View style={{ flexDirection: 'row', height: 40, marginBottom: 12 }}>

                        {loadingUI ? (<ThemedView style={{ padding: 8, borderRadius: 10, backgroundColor: iconBg, borderWidth: 1, borderColor: iconColor, marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={iconColor} />
                        </ThemedView>) : (<TouchableOpacity onPress={handlePickAndUpload}>
                            <ThemedView style={{ padding: 10, borderRadius: 10, backgroundColor: iconBg, borderWidth: 1, borderColor: iconColor, marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="cloud-upload" size={16} color={iconColor} />
                            </ThemedView>
                        </TouchableOpacity>)}
                        <ThemedInput
                            placeholder="Upload / Masukan URL Gambar"
                            value={form.gambar_produk}
                            onChangeText={(text: string) => {
                                setForm({ ...form, gambar_produk: text });
                                setImageUpload(text);
                            }}
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        />

                        {form.gambar_produk !== '' && (
                            <Image
                                source={{ uri: form.gambar_produk }}
                                style={{ height: 200, borderRadius: 10 }}
                            />
                        )}
                    </View>

                    <ThemedInput
                        label={<ThemedText style={styles.label}>Nama Produk</ThemedText>}
                        placeholder="Nama Produk"
                        value={form.nama_produk}
                        onChangeText={(text: string) => setForm({ ...form, nama_produk: text })}
                        style={styles.input}
                    />

                    <ThemedInput
                        label={<ThemedText style={styles.label}>Harga</ThemedText>}
                        placeholder="Harga Produk"
                        keyboardType="numeric"
                        value={formatRupiah(form.harga)}
                        onChangeText={(text: string) =>
                            setForm({
                                ...form,
                                harga: text.replace(/\D/g, ""), // simpan: 2000
                            })
                        }
                        style={styles.input}
                    />

                    <ThemedInput
                        label={<ThemedText style={styles.label}>Diskon (%)</ThemedText>}
                        placeholder="0 - 100%"
                        value={form.discount}
                        keyboardType="numeric"
                        onChangeText={(persen: number) => {
                            let text = parseInt((persen ?? 0).toString())
                            setForm({ ...form, discount: text < 0 || isNaN(text) ? 0 : text > 100 ? 100 : text })
                        }}
                        style={styles.input}
                    />
                    {form.discount > 0 && parseInt(form.harga) > 0 && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flex: 1, gap: 8 }}>
                        <ThemedText style={[styles.label, { opacity: 0.7, }]}>Harga setelah diskon:</ThemedText>
                        <ThemedText style={[styles.label]}>{rupiah(parseInt(form.harga) - (parseInt(form.harga) * (form.discount / 100)))}</ThemedText>
                    </View>}

                    <ThemedText style={styles.label}>Satuan</ThemedText>
                    <CustomSelect
                        defaultValue={form.satuan}
                        placeholder='Pilih Satuan'
                        data={[{ label: 'Kg', value: 'kg' }
                            // , { label: 'Gram', value: 'g' }
                        ]}
                        onSelect={(item: any) => { setForm({ ...form, satuan: item.value }); }}
                        inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }}
                    />

                    <ThemedInput
                        label={
                            <ThemedText style={styles.label}>
                                Berat / Unit ({form.satuan})
                            </ThemedText>
                        }
                        placeholder="Jumlah Berat"
                        keyboardType="numeric"
                        value={form.berat_per_unit}
                        onChangeText={(text: string) =>
                            setForm({
                                ...form,
                                berat_per_unit: text.replace(/\D/g, ""),
                            })
                        }
                        style={styles.input}
                    />

                    <ThemedInput
                        label={<ThemedText style={styles.label}>Stok ({form.satuan})</ThemedText>}
                        placeholder="Jumlah Stok"
                        value={form.stok}
                        keyboardType="numeric"
                        onChangeText={(text: string) => setForm({ ...form, stok: text.replace(/\D/g, "") })}
                        style={styles.input}
                    />

                    <ThemedInput
                        label={<ThemedText style={styles.label}>Deskripsi</ThemedText>}
                        placeholder="Tulis Deskripsi..."
                        value={form.deskripsi}
                        onChangeText={(text: string) => setForm({ ...form, deskripsi: text })}
                        style={[styles.input, { height: 100, textAlignVertical: 'top', }]}
                        multiline
                    />


                    <ThemedView style={{ flexDirection: 'row', gap: '1%', justifyContent: 'center', alignItems: 'center', paddingBottom: 10, borderRadius: 10, marginTop: 2 }}>
                        <TouchableOpacity style={[{ width: '48%' }, styles.button]} onPress={() => {
                            router.back();
                        }}>
                            <ThemedText style={styles.buttonText}>Batal</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={!isFormChanged()}
                            style={[{ width: '48%' }, styles.button, { opacity: isFormChanged() ? 1 : 0.7 }]} onPress={() => {
                                handleSubmit(data)
                            }}>
                            <ThemedText style={styles.buttonText}>{isEdit ? 'Update' : 'Simpan'}</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                    <ThemedView style={{ marginBottom: 80 }}></ThemedView>
                </View>
            </KeyboardAwareScrollView>
        </React.Fragment>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 8,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    image: {
        width: '100%',
        height: 250,
        backgroundColor: 'transparent',
        objectFit: 'contain',
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
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12
    },
    label: {
        marginVertical: 4,
        fontWeight: '600'
    }
})