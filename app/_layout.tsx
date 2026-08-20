import { Platform } from 'react-native';
if (Platform.OS === 'web') {
  require('@/assets/style/global.css');
}
import SplashScreen from "@/components/SplashScreen";
import ThemeMetaUpdater from "@/components/themeupdate";
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/utils/auth';
import { ThemeContext } from '@/utils/theme';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { CartProvider } from '@/utils/CartContext';
import { LikeProvider } from '@/utils/LikeContext';
import CustomConfirm from '@/components/ui/CustomConfirm';
import FCMRegistrar from '@/components/FCMRegistrar';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // const colorScheme = useColorScheme();
  const colorScheme = 'dark';
  const darkSy = colorScheme != 'dark';
  const [isDark, setIsDark] = useState(darkSy);
  const toggleTheme = () => setIsDark(prev => !prev);
  const [loading, setLoading] = useState(true);
  const toastConfig = {
    custom_confirm: (props: any) => (
      <CustomConfirm {...props} />
    ),
  };

  useEffect(() => {
    setIsDark(colorScheme != 'dark')
  }, [colorScheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const wakeUpServers = async () => {
      const urls = [
        'https://cros-image.vercel.app/',
        'https://qrcode-image-xcode.vercel.app/',
      ];

      try {
        await Promise.all(
          urls.map(url =>
            fetch(url)
              .then(res => console.log(`Waking up: ${url} - Status: ${res.status}`))
              .catch(err => console.log(`Failed to wake ${url}:`, err))
          )
        );
      } catch (error) {
        console.error("Gagal membangunkan salah satu server:", error);
      } finally {
        setLoading(false);
      }
    };
    wakeUpServers();
  }, []);

  useEffect(() => {
    const defaultHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.log('🔥 GLOBAL ERROR:', error);
      console.log('Is Fatal:', isFatal);

      // tetap panggil default biar red screen muncul
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }, []);

  if (loading) {
    return <SplashScreen />;
  }
  const theme = isDark;
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? Colors['dark'].background : Colors['light'].background }}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {Platform.OS === 'web' && <ThemeMetaUpdater setTheme={isDark ? 'dark' : 'light'} />}
            <ThemeContext.Provider value={{ isDark, toggleTheme }}>
              <ThemeProvider value={theme ? DarkTheme : DefaultTheme}>
                <ActionSheetProvider>
                  <CartProvider>
                    <LikeProvider>
                      <FCMRegistrar />
                      <Stack>
                        <Stack.Screen name="(tabs)" options={{ title: 'Beranda', headerShown: false }} />
                        <Stack.Screen name="prod/detail" options={{ presentation: 'modal', title: 'Detail Produk', headerShown: true }} />
                        <Stack.Screen name="prod/form" options={{ presentation: 'modal', title: 'Form Produk', headerShown: true }} />
                        <Stack.Screen name="kategori/index" options={{ presentation: 'modal', title: 'Kategori', headerShown: true }} />
                        <Stack.Screen name="toko/detail" options={{ presentation: 'modal', title: 'Detail Toko', headerShown: true }} />
                        <Stack.Screen name="checkout/checkout" options={{ presentation: 'modal', title: 'Checkout', headerShown: true }} />
                        <Stack.Screen name="pesanan/pesanan" options={{ presentation: 'modal', title: 'Pesanan Saya', headerShown: true }} />
                        <Stack.Screen name="toko/pembatalan/[orderId]" options={{ presentation: 'modal', title: 'Rincian Pembatalan', headerShown: true }} />
                        {/* <Stack.Screen name="cart/cart" options={{ presentation: 'card', title: 'My Cart', headerShown: true }} /> */}
                      </Stack>
                    </LikeProvider>
                  </CartProvider>
                </ActionSheetProvider>
                <Toast config={toastConfig} />
                <StatusBar style={isDark ? 'light' : 'dark'} />
              </ThemeProvider>
            </ThemeContext.Provider>
          </GestureHandlerRootView>
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
