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
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { opacity } from 'react-native-reanimated/lib/typescript/Colors'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;
const width = Dimensions.get('window').width;

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
    const imageDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [imageUploads, setImageUploads] = useState<string[]>([imageDefault]);
    const [imageDelete, setImageDelete] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [initialForm, setInitialForm] = useState<any>(null);
    const [active, setActive] = useState(0);
    const carouselRef = useRef<ICarouselInstance>(null);
    const [isAutoPlay, setIsAutoPlay] = useState(true);

    const selectS = StyleSheet.create({ button: { backgroundColor: bgColor, borderColor: border, padding: 10, marginBottom: 12, height: 40 }, buttonText: { color: textColor }, overlay: { backgroundColor: bgColor + '71', width: 500, maxWidth: '100%', alignSelf: 'center' }, item: { borderColor: border, backgroundColor: textColor }, itemText: { color: bgColor, textAlign: 'center', fontWeight: 'bold' } })

    useEffect(() => {
        if (user === null) {
            router.replace('produk');
        }
    }, [user]);

    useEffect(() => {
        setTimeout(() => {
            goToIndex(imageUploads.length - 1);
            setIsAutoPlay(true);
        }, 500);
    }, [imageUploads]);

    const goToIndex = (targetIndex: number) => {
        carouselRef.current?.scrollTo({
            index: targetIndex,
            animated: true // Set false jika ingin instan tanpa efek geser
        });
    };

    interface FormState {
        toko_id: number | null;
        nama_produk: string;
        harga: string;
        stok: number;
        satuan: string;
        discount: number;
        berat_per_unit: number;
        deskripsi: string;
        gambar_produk: string;
        album: string[];
    }


    const [form, setForm] = useState<FormState>({
        toko_id: null,
        nama_produk: '',
        harga: '',
        stok: 0,
        satuan: 'kg',
        discount: 0,
        berat_per_unit: 0,
        deskripsi: '',
        gambar_produk: '',
        album: [],
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

    const uploadImages = async (newImages: any[]) => {
        const ups = [];
        if (isEdit) {
            let fg = [form.gambar_produk, ...form.album];
            if (newImages) {
                for (const item of newImages) {
                    const u = await uploadImage(item, item == fg[0] ? 'produk' : 'album');
                    if (u) {
                        item.old && deleteImage(item.old);
                        fg = fg.map(fil => {
                            if (fil == item.old) {
                                return u
                            } else {
                                return fil
                            }
                        });
                        if(!fg.includes(u)){
                            fg.push(u)
                        }
                    }
                }
            }
            fg = fg.filter(fil => !imageDelete.includes(fil));
            fg.length && fg.forEach(item => {
                ups.push(item)
            })
        } else {
            for (const item of newImages) {
                const u = await uploadImage(item);
                if (u) {
                    ups.push(u)
                }
            }
        }
        return ups;
    }

    const uploadImage = async (image: any, name: string = "produk") => {
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
        const fileName = `${name}_${Date.now()}.${fileExt}`;
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
            return imageDefault;
        }
    };

    const handlePickAndUpload = async (index = -1) => {
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
                if (index != -1) {
                    converted.old = imageUploads[index];
                    let old = converted.old;
                    setnewImage((prev: any) => {
                        return prev ? prev.filter((item: any) => {
                            if (item.uri == converted.old) {
                                old = item.old
                            }
                            return item.uri != converted.old
                        }) : null
                    })
                    converted.old = old;
                    setImageUploads(imageUploads.map((item, i) => {
                        return index == i ? converted.uri : item
                    }
                    ));
                } else {
                    setImageUploads((prev) => {
                        return [...prev, converted.uri]
                    }
                    );
                }
                setnewImage((prev: any) => {
                    if (prev) {
                        return [...prev, converted]
                    }
                    else {
                        return [converted]
                    }
                }
                );
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
        const up = await uploadImages(newImage);
        if (imageDelete) {
            for (const item of imageDelete) {
                console.log('Delete', item)
                deleteImage(item);
            }
        }
        const gambar = up && typeof up == 'object' ? up.filter((_, index) => {
            return index == 0
        })[0] : null;
        const albums = up && typeof up == 'object' ? up.filter((_, index) => {
            return index != 0
        }) : null;

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
                            gambar_produk: gambar,
                            album: albums
                        }
                    ]).eq('id', id).select().single()
                :
                await supabase
                    .from('mawam_produk')
                    .insert([
                        {
                            ...form,
                            toko_id: toko ? toko.id : form.toko_id,
                            gambar_produk: gambar,
                            album: albums
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
            newImage || imageDelete ||
            form.album !== initialForm.album
        );
    };

    useEffect(() => {
        if (!isEdit || !data) return;
        setImageUploads([data?.gambar_produk, ...data?.album]);
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
            album: data?.album,
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
                    <View style={{ flexDirection: 'row', height: 40, marginBottom: 0, justifyContent: 'space-between' }}>
                        <ThemedText style={styles.label}>Gambar Produk</ThemedText>
                        {loadingUI ? (<ThemedView style={{ padding: 4, borderRadius: 8, backgroundColor: iconBg, borderWidth: 1, borderColor: iconColor, marginRight: 8, justifyContent: 'space-between', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={iconColor} />
                            <ThemedText>Memuat</ThemedText>
                        </ThemedView>) : (<TouchableOpacity onPress={() => {
                            handlePickAndUpload(imageUploads[0] == imageDefault ? 0 :-1)
                        }}
                        >
                            <ThemedView style={{ padding: 4, borderRadius: 8, backgroundColor: iconBg, borderWidth: 1, borderColor: iconColor, marginRight: 8, justifyContent: 'space-between', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                <Ionicons name="add" size={16} color={iconColor} />
                                <ThemedText>Gambar</ThemedText>
                            </ThemedView>
                        </TouchableOpacity>)}
                    </View>
                    <View style={{ position: 'relative', marginBottom: 12 }}>
                        <Carousel
                            ref={carouselRef}
                            onSnapToItem={(index) => setActive(index)}
                            width={width < 500 ? width - 20 : 500 - 20}
                            height={250}
                            autoPlay={imageUploads.length > 1 && isAutoPlay}
                            data={imageUploads}
                            autoPlayInterval={6000}
                            style={{ borderRadius: 10, overflow: 'hidden' }}
                            enabled={imageUploads.length > 1}
                            renderItem={({ item, index }) => (
                                <View>
                                    <BackgroundImage style={{ width: '100%', height: 250, marginBottom: 0, overflow: 'hidden', backgroundColor: '#c3c2c233', position: 'relative' }}
                                        source={{
                                            uri:
                                                (item?.startsWith('https://') ?
                                                    'https://cros-image.vercel.app/?quest=' + encodeURIComponent(item) + '&size=50' : item) ||
                                                imageDefault
                                        }}
                                        bgStyle={{ filter: `blur(10px) brightness(0.9)`, objectFit: 'cover', blurRadius: 10 }}
                                    >
                                        <ImageLoad
                                            contentFit="contain"
                                            source={{
                                                uri:
                                                    item && item !== '' ? item : imageDefault
                                                // data.gambar_produk ||
                                                // imageDefault
                                            }}
                                            style={[styles.image, { pointerEvents: 'none' }]}

                                            onLoad={(e: any) => {

                                                let w = 0;
                                                let h = 0;

                                                if (e?.source) {
                                                    // Expo Image (lebih aman)
                                                    w = e.source.width ?? 0;
                                                    h = e.source.height ?? 0;
                                                }

                                            }}
                                        />
                                        <TouchableOpacity
                                            style={{
                                                position: 'absolute',
                                                right: 10,
                                                top: 10,
                                                padding: 8,
                                            }}
                                            onPress={() => {
                                                handlePickAndUpload(index);
                                                setIsAutoPlay(false);

                                            }}
                                        >
                                            <Ionicons
                                                name="cloud-upload-outline"
                                                size={24}
                                                color="#fff"
                                            />
                                        </TouchableOpacity>
                                        {index !== 0 && <TouchableOpacity
                                            style={{
                                                position: 'absolute',
                                                right: 10,
                                                top: 40,
                                                padding: 8,
                                            }}
                                            onPress={() => {
                                                if (Platform.OS == 'web' && confirm('Hapus Gambar ini?')) {
                                                    setImageDelete(imageUploads.filter(fil =>
                                                        fil == item
                                                    ))
                                                    setTimeout(() => {
                                                        setImageUploads(
                                                            imageUploads.filter(fil =>
                                                                fil != item
                                                            )
                                                        );
                                                        if (newImage) {
                                                            setnewImage(
                                                                newImage.filter((fil: any) =>
                                                                    fil.uri != item
                                                                )
                                                            )
                                                        }
                                                    }, 100);
                                                }
                                            }}
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={24}
                                                color="#fff"
                                            />
                                        </TouchableOpacity>}
                                        {imageUploads.length > 1 && <ThemedView style={{ position: 'absolute', paddingHorizontal: 8, borderRadius: 8, bottom: 10, right: 10 }}>
                                            <ThemedText style={{ fontSize: 11 }}>{index + 1}/{imageUploads.length}</ThemedText>
                                        </ThemedView>}
                                    </BackgroundImage>
                                </View>
                            )}
                        />
                        {imageUploads.length > 1 && <View style={{ bottom: 0, padding: 8, position: 'absolute', alignItems: 'center', width: '100%' }}>
                            <View style={{ flexDirection: 'row', gap: 1 }}>
                                {imageUploads.map((_, i) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            goToIndex(i)
                                        }}
                                        key={i}
                                    >
                                        <ThemedView style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            opacity: active === i ? 1 : 0.3,
                                        }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>}
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
                        onChangeText={(text: number) =>
                            setForm({
                                ...form,
                                berat_per_unit: text,
                            })
                        }
                        style={styles.input}
                    />

                    <ThemedInput
                        label={<ThemedText style={styles.label}>Stok ({form.satuan})</ThemedText>}
                        placeholder="Jumlah Stok"
                        value={form.stok}
                        keyboardType="numeric"
                        onChangeText={(text: number) => setForm({ ...form, stok: text })}
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
