import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Platform, StyleSheet, TouchableOpacity, Dimensions, View} from "react-native"
import { Colors } from '@/constants/theme'
import { useTheme } from "@/utils/theme"
import { useRef, useState } from "react"
import { QrCodeImage } from '@/components/ui/qrcode-image'
// import * as MediaLibrary from 'expo-media-library';
let MediaLibrary: any;

if (Platform.OS !== "web") {
  MediaLibrary = require("expo-media-library");
}
import * as FileSystem from 'expo-file-system/legacy';
import { encode as btoa } from "base-64";
import Alerts from "@/constants/Alerts"
import { router } from "expo-router"
import * as Sharing from 'expo-sharing';
import { Image } from "expo-image"

const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ShowQrcode({ id, setShowQR }: any) {
    const { isDark } = useTheme();
    const iconColor = !isDark ? ColorDark : ColorLight;
    const iconBg = isDark ? ColorDark : ColorLight;
    const { width } = Dimensions.get("window");
    const logoLight = `https://mawam.expo.app/assets/assets/images/splash-icon-light.d23da6748d80bd0de1b2b60cd74c3a3e.png`;
    const logoDark = `https://mawam.expo.app/assets/assets/images/splash-icon-dark.1a5d9f6c40af761335f6db900e60d118.png`;
    const [bisaShare, setBisaShare] = useState(false);

    Sharing.isAvailableAsync().then((available) => {
        setBisaShare(available);
    })

    const qrRef = useRef<Image | null>(null);

    const encode = (id: string) => {
        id = btoa(id)
        id = id.replace(/=/g, 'X')
        return id;
    }

    const generateUrlQr = (id: number) => {
        const domain = Platform.OS === 'web'
            ? (typeof window !== 'undefined' ? window.location.origin : 'https://mawam.expo.app')
            : 'https://mawam.expo.app';
        return domain + '/x/' + encode(id.toLocaleString());
    }

    const unduhQr = async (url = '') => {
        if (Platform.OS === 'web') {
            try {
                const res = await fetch(url)
                const blob = await res.blob()
                const blobUrl = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = blobUrl
                link.download = `qr-${Date.now()}.png`
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(blobUrl)
            } catch (err) {
                console.log(err)
            }
        } else {
            try {
                const { status } = await MediaLibrary.requestPermissionsAsync()

                if (status !== 'granted') {
                    Alerts('Izin ditolak', 'error')
                    return
                }
                const cacheDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;

                const fileUri = cacheDir + `qr-${Date.now()}.png`

                const download = await FileSystem.downloadAsync(url, fileUri)

                // await MediaLibrary.saveToLibraryAsync(download.uri)


                const asset = await MediaLibrary.createAssetAsync(download.uri);
                await MediaLibrary.createAlbumAsync('Download', asset, false);

                Alerts('QR tersimpan', 'success');
                router.dismiss();
            } catch (e) {
                console.log('ERROR:', e)
            }
        }
    }

    const shareImage = async (imageUrl: string) => {
      try {
        if (!bisaShare) {
          alert("Fitur sharing tidak tersedia di perangkat ini.");
          return;
        }
    
        if (Platform.OS === 'web') {
          // WEB: Bagikan sebagai URL (teks)
          await Sharing.shareAsync(imageUrl); 
        } else {
          // MOBILE (Android/iOS): Harus download dulu agar jadi file fisik
          const fileName = imageUrl.split('/').pop();
          const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    
          // 1. Download gambar ke cache lokal
          const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);
    
          // 2. Share file dari URI lokal
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'image/png', // Sesuaikan dengan tipe gambar
            dialogTitle: 'Bagikan Gambar Ini',
            UTI: 'qr-code.png', // Khusus iOS
          });
        }
      } catch (error) {
        console.error("Gagal share gambar:", error);
      }
    };

    return (
        <ThemedView style={{ alignItems: 'center', justifyContent: 'center', flex: 1, borderRadius: 10, paddingVertical:15}}>
            <View
                style={{
                    backgroundColor: iconBg,
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 10,
                }}
                {...(Platform.OS !== 'web' && {
                    collapsable: false,
                })}
            >
                <QrCodeImage
                    value={generateUrlQr(id)}
                    size={Math.min(width / 1.2, 500 / 1.2)}
                    color={iconColor}
                    backgroundColor={iconBg}
                    ref={qrRef}
                    logo={
                        isDark
                            ? logoLight
                            : logoDark
                    }
                />
            </View>

            <ThemedView style={{ flexDirection: 'row', gap: '1%', justifyContent: 'center', alignItems: 'center', paddingBottom: 5, width: '100%' }}>
                <TouchableOpacity style={[{ width: bisaShare? '30%' : '49%' }, styles.button]} onPress={() => setShowQR(false)}>
                    <ThemedText style={styles.buttonText} numberOfLines={1}>Kembali</ThemedText>
                </TouchableOpacity>
               {
                bisaShare && (<TouchableOpacity
                    style={[{ width: '30%' }, styles.button]}
                    onPress={() => {
                        const source = (qrRef.current as any)?.props?.source?.uri;
                        if (source && typeof source == 'string') {
                            shareImage(source);
                        }
                    }}
                >
                    <ThemedText style={styles.buttonText} numberOfLines={1}>Bagikan</ThemedText>
                </TouchableOpacity>)
               }
                <TouchableOpacity
                    style={[{ width: bisaShare? '30%' : '49%' }, styles.button]}
                    onPress={() => {
                        const source = (qrRef.current as any)?.props?.source?.uri;
                        if (source && typeof source == 'string') {
                            unduhQr(source);
                        }
                    }}
                >
                    <ThemedText style={styles.buttonText} numberOfLines={1}>Unduh</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
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