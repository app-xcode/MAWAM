import ParallaxScrollView from '@/components/parallax-scroll-view'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import BawangIcon from '@/components/ui/BawangIcon'
import { ImageLoad } from '@/components/ui/Imageload'
import { Colors, Fonts } from '@/constants/theme'
import { useTheme } from '@/utils/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;
const images = [
  require('@/assets/images/h1.webp'),
  require('@/assets/images/h2.webp'),
  require('@/assets/images/h3.webp'),
];

export default function HomeScreen() {
  const { isDark, toggleTheme } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const iconColor = Colors[colorScheme ?? 'light'];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fitur = [
    "Menghubungkan petani dan distributor dalam satu ekosistem digital terintegrasi",
    "Menyediakan informasi harga dan kualitas produk secara real-time",
    "Mendukung pemesanan, pembayaran digital, dan pelacakan pengiriman",
    "Menyediakan dashboard penjualan, sehingga petani dapat melakukan analisis usaha",
  ];
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: ColorDark, dark: '#131313ff' }}
      headerImage={
        <ImageLoad
          source={images[index]}
          style={styles.headerImage}
        />
      }
    >
      {/* Title */}
      <ThemedView style={styles.titleContainer}>
        <ImageLoad
          source={
            isDark ? require('@/assets/images/splash-icon-light.png') : require('@/assets/images/splash-icon-dark.png')
          }
          style={{
            width: 150, height: 30, backgroundColor: 'transparent',
            alignSelf: 'center',
          }}
        />
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded, textAlign: 'center' }}>Market Bawang Merah</ThemedText>
        <ThemedText style={styles.subtitle}>
          Kamu dapat terhubung langsung ke petani bawang Merah.
        </ThemedText>
      </ThemedView>

      <Link href="/produk" asChild>
        <TouchableOpacity style={styles.buttonPrimary}>
         <BawangIcon width={16} height={16} color={ColorLight} bgColor={ColorDark} />
          <ThemedText style={styles.buttonText} numberOfLines={1}>
            Jelajahi Produk
          </ThemedText>
        </TouchableOpacity>
      </Link>

      <Link href="/akun" asChild>
        <TouchableOpacity style={styles.buttonSecondary}>
          {<Ionicons size={16} name="person" color={ColorDark} />}
          <ThemedText style={styles.buttonTextDark} numberOfLines={1}>
            Akun Saya
          </ThemedText>
        </TouchableOpacity>
      </Link>
      {/* Info */}

      {fitur.map((item, index) => (
        <ThemedView key={index} style={{ flexDirection: 'row', marginVertical: 0 }}>
          <ThemedText style={{ marginRight: 6 }}>•</ThemedText>
          <ThemedText style={{ flex: 1, textAlign: 'justify' }}>
            {item}
          </ThemedText>
        </ThemedView>
      ))}
      <TouchableOpacity style={!isDark ? styles.buttonSecondary : styles.buttonPrimary} onPress={toggleTheme}>
        {<Ionicons size={16} name={!isDark ? 'moon' : 'sunny'} color={iconColor.text} />}
        <ThemedText style={!isDark ? styles.buttonTextDark : styles.buttonText}>
          {!isDark ? 'Dark' : 'Light'}
        </ThemedText>
      </TouchableOpacity>
    </ParallaxScrollView>
  )
}


const styles = StyleSheet.create({
  headerImage: {
    width: '100%',
    height: 250,
    alignSelf: 'center',
    opacity: 0.8,
    backgroundColor: 'trasnparent',
  },

  titleContainer: {
    marginBottom: 4,
  },

  subtitle: {
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  },

  buttonPrimary: {
    backgroundColor: ColorDark,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 4,
  },

  buttonSecondary: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 4,

  },

  buttonText: {
    color: ColorLight,
    fontWeight: '600',
  },

  buttonTextDark: {
    color: ColorDark,
    fontWeight: '600',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },

  infoBox: {
    marginTop: 4,
    padding: 13,
  },
})