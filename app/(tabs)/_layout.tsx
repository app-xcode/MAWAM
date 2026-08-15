import { Tabs } from 'expo-router';

// import { HapticTab } from '@/components/haptic-tab';
import BawangIcon from '@/components/ui/BawangIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/utils/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';
import { useCart } from '@/utils/CartContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/utils/auth';
import { useLikes } from '@/utils/LikeContext';

export default function TabLayout() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const { cart, loadCart } = useCart();
  const { loadLikes } = useLikes();
  const [totalCart, setTotalCart] = useState(0);

  useEffect(() => {
    user && loadCart(user);
    user && loadLikes(user);
  }, [user]);
  useEffect(() => {
    setTotalCart(cart.length);
  }, [cart]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tabIconSelected,
        headerShown: false,
        // tabBarButton: HapticTab,
        tabBarStyle: { height: Platform.OS != 'web' ? 60 : 80, paddingTop: 4, paddingBottom: Platform.OS == 'web' ? 13 : 0 }

      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="home" color={color} />,
        }}
      />

      <Tabs.Screen
        name="produk"
        options={{
          title: 'Produk',
          tabBarIcon: ({ color }) => (<BawangIcon width={26} height={26} color={color} bgColor={Colors.dark.background} />),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Keranjang',
          tabBarBadge: totalCart > 0 ? (totalCart > 99 ? '99+' : totalCart) : undefined,
          tabBarBadgeStyle: { fontSize: 10 },
          tabBarIcon: ({ color }) => <Ionicons size={26} name="cart" color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="scan"
        options={{
          title: 'Lacak',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="qr-code" color={color} />,
        }}
      /> */}
      <Tabs.Screen
        name="akun"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
