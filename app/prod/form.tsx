import { deleteImage } from '@/app/prod/dataProduk'
import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { BackgroundImage } from '@/components/ui/background-image'
import { CustomSelect } from '@/components/ui/CustomSelect'
import ConfirmModal from '@/components/ui/ConfirmModal'
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
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;
const width = Dimensions.get('window').width;
const STORAGE_BUCKET = 'mawam';
const AI_FUNCTION = 'validate-onion-image';

export default function ModalScreen() {
    const { user } = useAuth();
    const { id } = useLocalSearchParams<any>()
    const isEdit = id != undefined && id != null && id != '';
    const [data, setData] = useState<any>(null)
    const [newImage, setnewImage] = useState<any[]>([])
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
    const [pendingImageDelete, setPendingImageDelete] = useState<string | null>(null);
    const [primaryImageValid, setPrimaryImageValid] = useState<boolean>(isEdit);

    const selectS = StyleSheet.create({ button: { backgroundColor: bgColor, borderColor: border, padding: 10, marginBottom: 12, height: 40 }, buttonText: { color: textColor }, overlay: { backgroundColor: bgColor + '71', width: 500, maxWidth: '100%', alignSelf: 'center' }, item: { borderColor: border, backgroundColor: textColor }, itemText: { color: bgColor, textAlign: 'center', fontWeight: 'bold' } })

    useEffect(() => {
        if (user === null) router.replace('produk');
    }, [user]);

    useEffect(() => {
        setTimeout(() => {
            goToIndex(Math.max(0, imageUploads.length - 1));
            setIsAutoPlay(true);
        }, 500);
    }, [imageUploads]);

    const goToIndex = (targetIndex: number) => {
        carouselRef.current?.scrollTo({ index: targetIndex, animated: true });
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
        if (user) getToko();
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

        setForm(prev => ({ ...prev, toko_id: data.id }));
    };

    const convertToWebp = async (image: any, quality: number = 1.0): Promise<any> => {
        const MAX_WIDTH = 700;
        const MAX_BYTE_SIZE = 1 * 1024 * 1024;
        const actions: ImageManipulator.Action[] =
            (image.width > MAX_WIDTH && quality === 1.0) ? [{ resize: { width: MAX_WIDTH } }] : [];

        const result = await ImageManipulator.manipulateAsync(
            image.uri,
            actions,
            { compress: quality, format: ImageManipulator.SaveFormat.WEBP }
        );

        const response = await fetch(result.uri);
        const buffer = await response.arrayBuffer();
        const fileSize = buffer.byteLength;

        if (fileSize > MAX_BYTE_SIZE && quality > 0.2) {
            const newQuality = Math.round((quality - 0.2) * 10) / 10;
            return await convertToWebp({ ...image, uri: result.uri }, newQuality);
        }

        return result;
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.3,
        });
        return result.canceled ? null : result.assets[0];
    };

    const uploadTempImage = async (image: any) => {
        if (!user?.id) throw new Error('Sesi pengguna tidak ditemukan.');

        const response = await fetch(image.uri);
        const arrayBuffer = await response.arrayBuffer();
        const fileSize = arrayBuffer.byteLength;
        const MAX_SIZE = 1 * 1024 * 1024;

        if (fileSize > MAX_SIZE) {
            Alerts('Ukuran gambar melebihi 1MB', 'error');
            return null;
        }

        const fileName = `temp/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, arrayBuffer, {
                contentType: 'image/webp',
                upsert: false,
            });

        if (error) {
            console.log('Temp upload error:', error);
            throw new Error('Upload gambar sementara gagal.');
        }

        return fileName;
    };

    const validateOnionImage = async (storagePath: string) => {
        const { data, error } = await supabase.functions.invoke(AI_FUNCTION, {
            body: { storagePath },
        });

        if (error) {
            console.log('AI validation error:', error);
            throw new Error('Gambar tidak dapat diperiksa oleh AI. Silakan coba lagi.');
        }

        if (!data?.success) {
            throw new Error(data?.message || 'Validasi gambar gagal.');
        }

        return data.data;
    };

    const removeTempImage = async (storagePath?: string | null) => {
        if (!storagePath) return;
        try {
            const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
            if (error) console.log('Temp delete error:', error);
        } catch (error) {
            console.log('Temp delete exception:', error);
        }
    };

    const moveTempImage = async (storagePath: string, name: string = 'produk') => {
        const fileName = `${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const targetPath = `produk/${user.id}/${fileName}`;
        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .move(storagePath, targetPath);

        if (error) {
            console.log('Move image error:', error);
            throw new Error('Gambar tidak dapat dipindahkan ke penyimpanan produk.');
        }

        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(targetPath);

        return { path: targetPath, url: urlData.publicUrl };
    };

    const uploadImages = async (newImages: any[] = []) => {
        const ups: string[] = [];
        if (isEdit) {
            let fg = [form.gambar_produk, ...form.album].filter(Boolean);
            for (const item of newImages) {
                if (!item?.tempPath) continue;
                const moved = await moveTempImage(item.tempPath, item.old === form.gambar_produk ? 'produk' : 'album');
                item.finalPath = moved.path;
                item.finalUrl = moved.url;
                item.tempPath = null;
                if (item.old) {
                    fg = fg.map((fil: string) => fil === item.old ? moved.url : fil);
                } else if (!fg.includes(moved.url)) {
                    fg.push(moved.url);
                }
            }
            fg = fg.filter((fil: string) => !imageDelete.includes(fil));
            fg.forEach((item: string) => ups.push(item));
        } else {
            for (const item of newImages) {
                if (!item?.tempPath || item?.aiValid !== true) continue;
                const moved = await moveTempImage(item.tempPath, 'produk');
                item.finalPath = moved.path;
                item.finalUrl = moved.url;
                item.tempPath = null;
                ups.push(moved.url);
            }
        }
        return ups;
    };

    const handlePickAndUpload = async (index = -1) => {
        if (processing) return;
        setProcessing(true);
        setLoadingUI(true);

        let tempPath: string | null = null;

        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alerts('Permission to access the media library is required.', 'error');
                return;
            }

            const image = await pickImage();
            if (!image) return;

            const converted = await convertToWebp(image);
            if (!converted) return;

            tempPath = await uploadTempImage(converted);
            if (!tempPath) return;

            const validation = await validateOnionImage(tempPath);

            if (validation?.valid !== true) {
                await removeTempImage(tempPath);
                tempPath = null;
                Alerts('Gambar Tidak Valid', 'Gambar yang diupload bukan gambar bawang merah. Silakan pilih gambar bawang merah yang sesuai.', 'error');
                return;
            }

            const nextImage = {
                ...converted,
                tempPath,
                aiValid: true,
                aiConfidence: validation.confidence ?? null,
                aiReason: validation.reason ?? '',
                old: index !== -1 ? imageUploads[index] : undefined,
            };

            if (index !== -1) {
                const oldVisible = imageUploads[index];
                const oldPending = newImage.find((item: any) => item?.uri === oldVisible);
                if (oldPending?.tempPath) await removeTempImage(oldPending.tempPath);

                setnewImage(prev => {
                    const filtered = prev.filter(item => item?.uri !== oldVisible);
                    return [...filtered, nextImage];
                });

                setImageUploads(prev => prev.map((item, i) => i === index ? converted.uri : item));
                if (index === 0) setPrimaryImageValid(true);
            } else {
                setnewImage(prev => [...prev, nextImage]);
                setImageUploads(prev => [...prev, converted.uri]);
            }

            tempPath = null;
            Alerts('Gambar Valid', 'Gambar bawang merah berhasil diperiksa dan diterima.', 'success');
        } catch (error) {
            console.log('handlePickAndUpload error:', error);
            if (tempPath) await removeTempImage(tempPath);
            Alerts('Validasi Gambar Gagal', error instanceof Error ? error.message : 'Gambar gagal diperiksa. Silakan coba lagi.', 'error');
        } finally {
            setLoadingUI(false);
            setProcessing(false);
        }
    };

    const handleSubmit = async (datas: any) => {
        if (!isFormChanged()) {
            Alerts('Tidak ada perubahan', 'info');
            if (router.canGoBack()) router.back();
            return;
        }
        if (!form.nama_produk) {
            Alerts('Nama produk wajib diisi', 'error');
            return;
        }
        if (!isEdit && !primaryImageValid) {
            Alerts('Gambar Produk Wajib', 'Silakan pilih gambar bawang merah yang valid terlebih dahulu.', 'error');
            return;
        }

        setSubmitForm(true);
        let movedPaths: string[] = [];

        try {
            const up = await uploadImages(newImage);
            movedPaths = newImage.filter(item => item?.finalPath).map(item => item.finalPath);

            if (imageDelete) {
                for (const item of imageDelete) {
                    await deleteImage(item);
                }
            }

            const gambar = up?.[0] || (isEdit ? form.gambar_produk : null);
            const albums = up?.slice(1) || (isEdit ? form.album : []);

            if (!gambar && !isEdit) {
                throw new Error('Gambar produk belum tersedia.');
            }

            const { data: toko, error: tokoError } = await supabase
                .from('mawam_toko')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (tokoError || !toko) throw new Error('Toko tidak ditemukan.');

            const payload = {
                ...form,
                toko_id: toko.id,
                gambar_produk: gambar,
                album: albums,
            };

            const { data, error } = isEdit
                ? await supabase.from('mawam_produk').update(payload).eq('id', id).select().single()
                : await supabase.from('mawam_produk').insert([payload]).select().single();

            if (error) throw error;

            setnewImage([]);
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
        } catch (error) {
            console.log(error);
            for (const item of newImage) {
                if (item?.tempPath) await removeTempImage(item.tempPath);
            }
            for (const path of movedPaths) {
                try { await supabase.storage.from(STORAGE_BUCKET).remove([path]); } catch { }
            }
            Alerts('Gagal menyimpan data', error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data.');
        } finally {
            setSubmitForm(false);
        }
    };

    useEffect(() => {
        if (!id) return setData([]);
        const cached = produkCache[id];
        if (cached) setData(cached);
        else fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const query = supabase.from('mawam_produk').select('*').limit(1);
            isEdit && query.eq('id', id);
            const { data, error } = await query;
            if (error) {
                console.log(error);
                setData([]);
            } else if (data && data.length) {
                setData(data[0]);
                produkCache[id] = data[0];
            }
        } catch (error) {
            console.log(error);
            setData([]);
        }
    };

    const isFormChanged = () => {
        if (!initialForm) return true;
        return Boolean(
            form.nama_produk !== initialForm.nama_produk ||
            form.toko_id !== initialForm.toko_id ||
            form.harga !== initialForm.harga ||
            form.stok !== initialForm.stok ||
            form.satuan !== initialForm.satuan ||
            form.discount !== initialForm.discount ||
            form.berat_per_unit !== initialForm.berat_per_unit ||
            form.deskripsi !== initialForm.deskripsi ||
            form.gambar_produk !== initialForm.gambar_produk ||
            newImage.length > 0 ||
            imageDelete.length > 0 ||
            form.album !== initialForm.album
        );
    };

    useEffect(() => {
        if (!isEdit || !data) return;
        const existingImages = [data?.gambar_produk, ...(data?.album || [])].filter(Boolean);
        setImageUploads(existingImages.length ? existingImages : [imageDefault]);
        setPrimaryImageValid(Boolean(data?.gambar_produk));

        const init = {
            toko_id: data?.toko_id || null,
            nama_produk: data?.nama_produk || '',
            harga: data?.harga || '',
            stok: data?.stok || '',
            satuan: data?.satuan || 'kg',
            discount: data?.discount || 0,
            berat_per_unit: data?.berat_per_unit || '',
            deskripsi: data?.deskripsi || '',
            gambar_produk: data?.gambar_produk || '',
            album: data?.album || [],
        };
        setForm(init);
        setInitialForm(init);
    }, [data, isEdit]);

    if (!data) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Memuat Form...</ThemedText>
            </View>
        )
    }

    return (
        <React.Fragment>
            <ConfirmModal
                visible={pendingImageDelete !== null}
                title="Hapus gambar?"
                message="Gambar ini akan dihapus dari produk."
                confirmText="Hapus"
                variant="destructive"
                onCancel={() => setPendingImageDelete(null)}
                onConfirm={async () => {
                    if (!pendingImageDelete) return;
                    const item = pendingImageDelete;
                    const pending = newImage.find((fil: any) => fil?.uri === item);
                    if (pending?.tempPath) await removeTempImage(pending.tempPath);
                    setImageDelete(prev => [...prev.filter(fil => fil !== item), item]);
                    setImageUploads(prev => prev.filter(fil => fil !== item));
                    setnewImage(prev => prev.filter(fil => fil?.uri !== item));
                    if (item === imageUploads[0]) setPrimaryImageValid(isEdit && Boolean(form.gambar_produk));
                    setPendingImageDelete(null);
                }}
            />
            <Stack.Screen options={{ title: isEdit ? 'Edit Produk' : 'Tambah Produk' }} />
            {submitForm ? <View style={{ justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 9, backgroundColor: '#000000a2' }}>
                <ActivityIndicator size="large" color={ColorLight} />
                <ThemedText style={{ color: ColorLight, marginTop: 5 }}>{isEdit ? 'Perbaharui' : 'Menyimpan'}...</ThemedText>
            </View> : undefined}
            <KeyboardAwareScrollView enableOnAndroid extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                <View style={styles.container}>
                    <View style={{ flexDirection: 'row', height: 40, marginBottom: 0, justifyContent: 'space-between' }}>
                        <ThemedText style={styles.label}>Gambar Produk</ThemedText>
                        {loadingUI ? (
                            <ThemedView style={{ padding: 4, borderRadius: 8, backgroundColor: iconBg, borderWidth: 1, borderColor: iconColor, marginRight: 8, justifyContent: 'space-between', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={iconColor} />
                                <ThemedText>Memeriksa</ThemedText>
                            </ThemedView>
                        ) : (
                            <TouchableOpacity onPress={() => handlePickAndUpload(imageUploads[0] === imageDefault ? 0 : -1)}>
                                <ThemedView style={{ padding: 4, borderRadius: 8, backgroundColor: iconBg, borderWidth: 1, borderColor: iconColor, marginRight: 8, justifyContent: 'space-between', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                    <Ionicons name="add" size={16} color={iconColor} />
                                    <ThemedText>Gambar</ThemedText>
                                </ThemedView>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={{ position: 'relative', marginBottom: 12 }}>
                        <Carousel
                            ref={carouselRef}
                            onSnapToItem={(index) => setActive(index)}
                            width={width < 500 ? width - 20 : 480}
                            height={250}
                            autoPlay={imageUploads.length > 1 && isAutoPlay}
                            data={imageUploads.length ? imageUploads : [imageDefault]}
                            autoPlayInterval={6000}
                            style={{ borderRadius: 10, overflow: 'hidden' }}
                            enabled={imageUploads.length > 1}
                            renderItem={({ item, index }) => (
                                <View>
                                    <BackgroundImage style={{ width: '100%', height: 250, marginBottom: 0, overflow: 'hidden', backgroundColor: '#c3c2c233', position: 'relative' }}
                                        source={{ uri: item?.startsWith('https://') ? 'https://cros-image.vercel.app/?quest=' + encodeURIComponent(item) + '&size=50' : item || imageDefault }}
                                        bgStyle={{ filter: `blur(10px) brightness(0.9)`, objectFit: 'cover', blurRadius: 10 }}
                                    >
                                        <ImageLoad contentFit="contain" source={{ uri: item && item !== '' ? item : imageDefault }} style={[styles.image, { pointerEvents: 'none' }]} />
                                        <TouchableOpacity style={{ position: 'absolute', right: 10, top: 10, padding: 8 }} onPress={() => { handlePickAndUpload(index); setIsAutoPlay(false); }}>
                                            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                                        </TouchableOpacity>
                                        {index !== 0 && <TouchableOpacity style={{ position: 'absolute', right: 10, top: 40, padding: 8 }} onPress={() => setPendingImageDelete(item)}>
                                            <Ionicons name="trash-outline" size={24} color="#fff" />
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
                                    <TouchableOpacity onPress={() => goToIndex(i)} key={i}>
                                        <ThemedView style={{ width: 8, height: 8, borderRadius: 4, opacity: active === i ? 1 : 0.3 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>}
                    </View>

                    {!isEdit && <ThemedText style={{ fontSize: 12, marginBottom: 10, opacity: 0.75 }}>
                        {primaryImageValid ? '✓ Gambar bawang merah valid' : 'Gambar produk wajib berupa bawang merah dan akan diperiksa otomatis.'}
                    </ThemedText>}

                    <ThemedInput label={<ThemedText style={styles.label}>Nama Produk</ThemedText>} placeholder="Nama Produk" value={form.nama_produk} onChangeText={(text: string) => setForm({ ...form, nama_produk: text })} style={styles.input} />
                    <ThemedInput label={<ThemedText style={styles.label}>Harga</ThemedText>} placeholder="Harga Produk" keyboardType="numeric" value={formatRupiah(form.harga)} onChangeText={(text: string) => setForm({ ...form, harga: text.replace(/\D/g, '') })} style={styles.input} />
                    <ThemedInput label={<ThemedText style={styles.label}>Diskon (%)</ThemedText>} placeholder="0 - 100%" value={form.discount} keyboardType="numeric" onChangeText={(persen: number) => { const text = parseInt((persen ?? 0).toString()); setForm({ ...form, discount: text < 0 || isNaN(text) ? 0 : text > 100 ? 100 : text }) }} style={styles.input} />
                    {form.discount > 0 && parseInt(form.harga) > 0 && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flex: 1, gap: 8 }}><ThemedText style={[styles.label, { opacity: 0.7 }]}>Harga setelah diskon:</ThemedText><ThemedText style={styles.label}>{rupiah(parseInt(form.harga) - (parseInt(form.harga) * (form.discount / 100)))}</ThemedText></View>}
                    <ThemedText style={styles.label}>Satuan</ThemedText>
                    <CustomSelect defaultValue={form.satuan} placeholder="Pilih Satuan" data={[{ label: 'Kg', value: 'kg' }]} onSelect={(item: any) => setForm({ ...form, satuan: item.value })} inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }} />
                    <ThemedInput label={<ThemedText style={styles.label}>Berat / Unit ({form.satuan})</ThemedText>} placeholder="Jumlah Berat" keyboardType="numeric" value={form.berat_per_unit} onChangeText={(text: number) => setForm({ ...form, berat_per_unit: text })} style={styles.input} />
                    <ThemedInput label={<ThemedText style={styles.label}>Stok ({form.satuan})</ThemedText>} placeholder="Jumlah Stok" value={form.stok} keyboardType="numeric" onChangeText={(text: number) => setForm({ ...form, stok: text })} style={styles.input} />
                    <ThemedInput label={<ThemedText style={styles.label}>Deskripsi</ThemedText>} placeholder="Tulis Deskripsi..." value={form.deskripsi} onChangeText={(text: string) => setForm({ ...form, deskripsi: text })} style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline />

                    <ThemedView style={{ flexDirection: 'row', gap: '1%', justifyContent: 'center', alignItems: 'center', paddingBottom: 10, borderRadius: 10, marginTop: 2 }}>
                        <TouchableOpacity style={[{ width: '48%' }, styles.button]} onPress={() => router.back()}>
                            <ThemedText style={styles.buttonText}>Batal</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={!isFormChanged() || submitForm || (!isEdit && !primaryImageValid)}
                            style={[{ width: '48%' }, styles.button, { opacity: isFormChanged() && !submitForm && (isEdit || primaryImageValid) ? 1 : 0.7 }]}
                            onPress={() => handleSubmit(data)}
                        >
                            <ThemedText style={styles.buttonText}>{isEdit ? 'Update' : 'Simpan'}</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                    <ThemedView style={{ marginBottom: 80 }} />
                </View>
            </KeyboardAwareScrollView>
        </React.Fragment>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: 250, backgroundColor: 'transparent', objectFit: 'contain' },
    button: { marginTop: 10, backgroundColor: ColorDark, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: ColorLight, fontWeight: '600' },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
    label: { marginVertical: 4, fontWeight: '600' }
})
