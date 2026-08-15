import { deleteImage } from '@/app/prod/dataProduk'
import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/utils/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export default function Akun() {
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const ColorBg = Colors[colorScheme].text;
    const ColorText = Colors[colorScheme].background;
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [session, setSession] = useState<any>(null)
    const [nama, setNama] = useState('')

    const [user, setUser] = useState<any>(null)
    const [avatar, setAvatar] = useState<string | null>(null)
    const [loading, setloading] = useState(false)
    const iconColor = Colors[isDark ? 'light' : 'dark'].text;
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const styles = StyleSheet.create({
        button: {
            width: '49%',
            backgroundColor: ColorBg,
            paddingVertical: 13,
            borderRadius: 13,
        },
        buttonText: {
            textAlign: 'center',
            color: ColorText
        },
        logo: {
            width: 150,
            height: 100,
            backgroundColor: ColorText,
        },
        logoView: {
            justifyContent: 'center',
            alignItems: 'center',
            height: 100,
            marginTop: 30
        },
        label: {
            marginVertical: 8,
        }
    })

    async function loadProfile() {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        setUser(user)

        const { data } = await supabase
            .from('mawam_profile')
            .select('*')
            .eq('id', user?.id)
            .single()

        if (data) {
            setNama(data.nama)
            setAvatar(data.avatar_url)
        }
    }

    useEffect(() => {
        loadProfile()
    }, [])

    const convertToWebp = async (image: any) => {
        const result = await ImageManipulator.manipulateAsync(
            image.uri, [{ resize: { width: 700 } }],
            {
                compress: 0.5,
                format: ImageManipulator.SaveFormat.WEBP,
            }
        );
        return result; // uri baru (webp)
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
        }

        const fileName = `${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('mawam')
            .upload(fileName, arrayBuffer, { upsert: true, contentType: image.mimeType, })

        if (error) {
            console.log(error);
            Alerts('Upload gagal', 'error');
        }

        const { data: urlData } = supabase.storage
            .from('mawam')
            .getPublicUrl(fileName);
        if (urlData.publicUrl) {
            if (avatar) {
                await deleteImage(avatar);
            }
            await supabase.from('mawam_profile').update({
                avatar_url: urlData.publicUrl,
            }).eq('id', user.id)
        }
        setAvatar(urlData.publicUrl);

    };

    async function pickImage() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.5,
        })

        if (!result.canceled) {
            const image = result.assets[0];
            uploadImage(await convertToWebp(image))
        }
        return null;
    }

    async function updateProfile() {
        const { error } = await supabase.from('mawam_profile').update({
            nama,
        }).eq('id', user.id);
        !error && Alerts('Berhasil Ganti', 'success')
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadProfile()
            setSession(session)
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            loadProfile()
            setSession(session)
        })

        return () => listener.subscription.unsubscribe()
    }, [])

    // LOGIN
    async function signIn() {
        setloading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) Alerts(error.message, 'error')
            else router.navigate('/produk')
        } finally {
            setloading(false);
        }
    }

    // SIGNUP
    async function signUp() {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) Alerts(error.message)
        else Alerts('Cek email untuk verifikasi', 'info')
    }

    // LOGOUT
    async function signOut() {
        setEmail('');
        setPassword('');
        setSession(null);
        setNama('');
        await supabase.auth.signOut();
    }

    if (!session) {
        return (
            <ThemedView style={{ padding: 20, flex: 1, opacity: loading ? 0.5 : 1 }}>
                <KeyboardAwareScrollView
                    enableOnAndroid
                    extraScrollHeight={20}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ flex: 1, justifyContent: 'center', }}
                >
                    <ThemedView style={styles.logoView}>
                        <ImageLoad source={isDark ? require('@/assets/images/splash-icon-light.png') : require('@/assets/images/splash-icon-dark.png')} style={styles.logo} />
                        <ThemedText type='title' style={{ textAlign: 'center', }} >Selamat datang</ThemedText>
                        <ThemedText style={{ textAlign: 'center', marginBottom: 50 }}>Login khusus Admin</ThemedText>
                    </ThemedView>
                    <ThemedInput
                        label={<ThemedText style={styles.label}>Email / Telepon</ThemedText>}
                        onChangeText={setEmail}
                        autoComplete="username"
                        textContentType="username"
                        keyboardType="email-address"
                    />
                    <ThemedInput
                        label={<ThemedText style={styles.label}>Password</ThemedText>}
                        secureTextEntry={!isPasswordVisible}
                        onChangeText={setPassword}
                        autoComplete="password"
                        textContentType="password"
                        returnKeyType="done"
                        onSubmitEditing={signIn}
                        rightIcon={
                            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                style={{ position: 'absolute', zIndex: 2, borderRadius: '50%', padding: 5, opacity: 0.6, top: '50%', right: 18, transform: [{ translateY: '-50%' }] }}
                            >
                               <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={20} color={ColorBg} />
                            </TouchableOpacity>
                        }
                    />

                    <ThemedView style={{ flexDirection: 'row', gap: 4, marginTop: 13 }}>
                        <TouchableOpacity onPress={signIn} style={[styles.button]} >
                            {loading ? (
                                <ActivityIndicator color={iconColor} size="small" />
                            ) : (
                                <ThemedText style={[styles.buttonText, { fontWeight: 'bold' }]}>
                                    Log In
                                </ThemedText>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={signUp} style={[styles.button, { opacity: 0.8 }]}>
                            <ThemedText style={styles.buttonText}>
                                Sign Up
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </KeyboardAwareScrollView>
            </ThemedView>
        )
    }

    return (
        <ThemedView style={{ padding: 20, flex: 1, justifyContent: 'center', }}>
            <KeyboardAwareScrollView
                enableOnAndroid
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >

                {(
                    <ThemedView style={{ width: 100, height: 100, alignSelf: 'center', borderRadius: '50%', overflow: 'hidden', marginBottom: 13, }}>
                        <ImageLoad
                            source={{ uri: avatar ?? 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp' }}
                            style={{ width: 100, height: 100, borderRadius: 50 }}
                        />
                    </ThemedView>
                )}
                <TouchableOpacity onPress={pickImage} style={[styles.button, { width: 'auto', paddingVertical: 4, paddingHorizontal: 13, marginBottom: 13, marginTop: 0, height: 'auto', justifyContent: 'center', flexDirection: 'row', gap: 4, alignItems: 'center', opacity: 0.7 }]} >
                    <Ionicons name='image-outline' color={ColorText} size={16} />
                    <ThemedText style={[styles.buttonText, { fontWeight: 'bold' }]}>
                        Ganti Gambar
                    </ThemedText>
                </TouchableOpacity>
                <ThemedText type='title' style={{ marginBottom: 13 }}>Login berhasil 🎉</ThemedText>
                <ThemedText style={{ marginBottom: 13 }}>Selamat datang {user?.email ?? ''}</ThemedText>
                <TouchableOpacity onPress={() => { router.push('/toko') }} style={[styles.button, { width: 'auto', paddingVertical: 4, paddingHorizontal: 13, marginBottom: 13, marginTop: 0, height: 'auto', justifyContent: 'center', flexDirection: 'row', gap: 4, alignItems: 'center', opacity: 0.7 }]} >
                    <Ionicons name='storefront-outline' color={ColorText} size={16} />
                    <ThemedText style={[styles.buttonText, { fontWeight: 'bold' }]}>
                        Kelola Toko
                    </ThemedText>
                </TouchableOpacity>
                <ThemedView style={{ flexDirection: 'row', width: '100%', gap: 4 }}>
                    <ThemedInput value={nama} onChangeText={setNama} style={{ width: '69%' }} placeholder="Nama Kamu"
                    />
                    <TouchableOpacity onPress={updateProfile} style={[styles.button, { width: '29%', paddingHorizontal: 13, margin: 0, height: 40, paddingVertical: 0, justifyContent: 'center', flexDirection: 'row', gap: 4, alignItems: 'center' }]} >
                       <Ionicons name='save-outline' color={ColorText} size={16} />
                        <ThemedText numberOfLines={1} type='caption' style={[styles.buttonText, { fontWeight: 'bold', }]}>
                            Ganti Nama
                        </ThemedText>
                    </TouchableOpacity>
                </ThemedView>
                <ThemedView style={{ flexDirection: 'row', gap: 4, width: '100%', marginTop: 13 }}>
                    <TouchableOpacity onPress={() => { router.back() }} style={[styles.button, { opacity: 0.8 }]}>
                        <ThemedText style={styles.buttonText}>
                            Tutup
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={signOut} style={styles.button}>
                        <ThemedText style={styles.buttonText}>Log Out</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </KeyboardAwareScrollView>
        </ThemedView>
    )
}

