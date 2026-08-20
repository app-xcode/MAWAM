import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { BackgroundImage } from '@/components/ui/background-image'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ModalScreen() {
    const { user } = useAuth();
    const [isEdit, setIsEdit] = useState(false);
    const [data, setData] = useState<any>(null)
    const [newImage, setnewImage] = useState<any>(null)
    const [loadingUI, setLoadingUI] = useState<boolean>(false);
    const [submitForm, setSubmitForm] = useState<boolean>(false);
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const iconBg = Colors[colorScheme].inputBg;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [imageUpload, setImageUpload] = useState<any>(gambarDefault);
    const [processing, setProcessing] = useState(false);
    const [initialForm, setInitialForm] = useState<any>(null);

    useEffect(() => {
        if (user === null) {
            router.replace('produk');
        }
    }, [user]);

    const [form, setForm] = useState({
        nama_toko: '',
        deskripsi: '',
        alamat_toko: '',
        gambar_toko: '',
    });

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
        const fileName = `toko_${Date.now()}.${fileExt}`;
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

    const handleSubmit = async () => {
        if (!form.nama_toko.trim()) {
            Alerts('Nama toko wajib diisi', 'error');
            return;
        }

        setSubmitForm(true);

        try {
            let gambar = form.gambar_toko;

            if (newImage) {
                gambar = await uploadImage(newImage) ?? '';

                if (!gambar || gambar === '') {
                    setSubmitForm(false);
                    return;
                }
            }

            if (data?.id) {
                const { error } = await supabase
                    .from('mawam_toko')
                    .update({
                        nama_toko: form.nama_toko,
                        deskripsi: form.deskripsi,
                        alamat_toko: form.alamat_toko,
                        gambar_toko: gambar,
                    })
                    .eq('id', data.id);

                if (error) throw error;

                Alerts('Toko berhasil diperbarui', 'success');
            } else {
                const { error } = await supabase
                    .from('mawam_toko')
                    .insert({
                        user_id: user.id,
                        nama_toko: form.nama_toko,
                        deskripsi: form.deskripsi,
                        alamat_toko: form.alamat_toko,
                        gambar_toko: gambar,
                    });

                if (error) throw error;

                Alerts('Toko berhasil dibuat', 'success');
            }

            fetchToko();
        } catch (err: any) {
            Alerts(err.message, 'error');
        } finally {
            setSubmitForm(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchToko();
        }
    }, [user]);

    const fetchToko = async () => {
        const { data, error } = await supabase
            .from('mawam_toko')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.log(error);
            return;
        }

        if (data) {
            setData(data);
            setIsEdit(true);

            setForm({
                nama_toko: data.nama_toko || '',
                deskripsi: data.deskripsi || '',
                alamat_toko: data.alamat_toko || '',
                gambar_toko: data.gambar_toko || '',
            });

            setImageUpload(data.gambar_toko || gambarDefault);
        }
    };
    const isFormChanged = () => {
        if (!initialForm) return true;

        return (
            form.nama_toko !== initialForm.nama_toko ||
            form.deskripsi !== initialForm.deskripsi ||
            form.alamat_toko !== initialForm.alamat_toko ||
            form.gambar_toko !== initialForm.gambar_toko ||
            newImage
        );
    };

    useEffect(() => {
        if (!isEdit || !data) return;
        setImageUpload(data?.gambar_toko ?? gambarDefault);
        const init = {
            nama_toko: data?.nama_toko || '',
            deskripsi: data?.deskripsi || '',
            alamat_toko: data?.alamat_toko || '',
            gambar_toko: data?.gambar_toko || '',
        };
        setForm(init);
        setInitialForm(init);
    }, [data, isEdit]);


    if (!data && isEdit) {
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
            <Stack.Screen options={{ title: data?.id ? 'Kelola Toko' : 'Buat Toko', }} />
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
                    <ThemedText style={styles.label}>Gambar Toko</ThemedText>
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
                            value={form.gambar_toko}
                            onChangeText={(text: string) => {
                                setForm({ ...form, gambar_toko: text });
                                setImageUpload(text);
                            }}
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        />

                        {form.gambar_toko !== '' && (
                            <Image
                                source={{ uri: form.gambar_toko }}
                                style={{ height: 200, borderRadius: 10 }}
                            />
                        )}
                    </View>

                    <ThemedInput
                        label={<ThemedText>Nama Toko</ThemedText>}
                        value={form.nama_toko}
                        onChangeText={(text: string) =>
                            setForm({ ...form, nama_toko: text })
                        }
                    />

                    <ThemedInput
                        label={<ThemedText>Alamat Toko</ThemedText>}
                        value={form.alamat_toko}
                        onChangeText={(text: string) =>
                            setForm({ ...form, alamat_toko: text })
                        }
                    />

                    <ThemedInput
                        label={<ThemedText>Deskripsi Toko</ThemedText>}
                        value={form.deskripsi}
                        multiline
                        onChangeText={(text: string) =>
                            setForm({ ...form, deskripsi: text })
                        }
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
                                handleSubmit()
                            }}>
                            <ThemedText style={styles.buttonText}>{isEdit ? 'Perbarui Toko' : 'Buat Toko'}</ThemedText>
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
