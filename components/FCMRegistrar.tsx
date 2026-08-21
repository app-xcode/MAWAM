import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '@/utils/auth';
import { addToken, removeToken } from '@/services/notification/notificationToken';

async function ensureWebNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  const permission = Notification.permission;
  if (permission === 'granted') return true;
  if (permission === 'denied') {
    console.warn('FCM web: notification permission denied by browser');
    return false;
  }

  const result = await Notification.requestPermission();
  console.log('FCM web: notification permission result:', result);
  return result === 'granted';
}

// Web Firebase is initialized dynamically inside this file only on web
async function registerWebToken(userId: string) {
  try {
    const permissionGranted = await ensureWebNotificationPermission();
    if (!permissionGranted) {
      console.warn('FCM web: permission not granted; cannot get token');
      return null;
    }

    // dynamic import to avoid bundling firebase for native
    const mod = await import('@/src/firebaseWeb');
    const { initFirebaseMessaging, getVapidKey } = mod;
    const messaging = await initFirebaseMessaging();
    const vapidKey = getVapidKey();
    if (!messaging) {
      console.log('FCM web: messaging not initialized');
      return null;
    }
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey: vapidKey || undefined });
    if (token) {
      // console.log('FCM token obtained (web):', token);
      await addToken(userId, token, 'web');
      // console.log('FCM token saved (web):', token);
      return token;
    }
  } catch (err) {
    console.error('registerWebToken error', err);
  }
  return null;
}

async function registerAndroidToken(userId: string) {
  try {
    if (!Device.isDevice) {
      console.log('FCM android: must run on a physical device to get token');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('FCM android: notification permission not granted');
      return null;
    }

    const tokenObj: any = await Notifications.getDevicePushTokenAsync();
    const token = tokenObj?.data ?? tokenObj;
    if (token) {
      // console.log('FCM token obtained (android):', token);
      await addToken(userId, token, 'android');
      // console.log('FCM token saved (android):', token);
      return token;
    }
  } catch (err) {
    console.error('registerAndroidToken error', err);
  }
  return null;
}

export async function registerNotificationToken(userId: string) {
  return Platform.OS === 'web'
    ? registerWebToken(userId)
    : registerAndroidToken(userId);
}

async function listenWebForegroundNotifications() {
  const mod = await import('@/src/firebaseWeb');
  const messaging = await mod.initFirebaseMessaging();
  if (!messaging) return null;

  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, (payload) => {
    if (Notification.permission !== 'granted') return;
    new Notification(payload.notification?.title || 'MAWAM', {
      body: payload.notification?.body || '',
      data: payload.data,
    });
  });
}

export default function FCMRegistrar() {
  const { user } = useAuth();
  const currentTokenRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    listenWebForegroundNotifications().then((listener) => {
      if (cancelled) {
        listener?.();
        return;
      }
      unsubscribe = listener;
    }).catch((err) => console.error('FCM foreground listener error', err));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = user?.id ?? null;

    (async () => {
      if (!mounted) return;
      if (!user) {
        // user logged out -> deactivate token for previous user on device
        if (currentTokenRef.current && previousUserId) {
          try {
            await removeToken(previousUserId, currentTokenRef.current);
            console.log('FCM token removed on logout:', currentTokenRef.current);
          } catch (err) {
            console.error('removeToken on logout failed', err);
          }
        }
        currentTokenRef.current = null;
        return;
      }

      try {
        const token = await registerNotificationToken(user.id);
        if (token) currentTokenRef.current = token;
      } catch (err) {
        console.error('FCM registration error', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  return null;
}
