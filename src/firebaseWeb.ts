import { initializeApp, getApps } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

let messagingInstance: any = null;
let vapidKeyValue: string | null = null;

export async function initFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  vapidKeyValue = (window as any).__FIREBASE_VAPID_KEY__ || null;

  const firebaseConfig = (window as any).__FIREBASE_CONFIG__ || null;
  if (!firebaseConfig) {
    console.warn(
      'Firebase web config not found. Set window.__FIREBASE_CONFIG__ with the Firebase Web app config from Firebase Console.',
    );
    return null;
  }

  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];
  const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);
  if (missingKeys.length) {
    console.warn('Firebase web config is incomplete. Missing keys:', missingKeys);
    return null;
  }

  console.log('Firebase Web config loaded:', {
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    messagingSenderId: firebaseConfig.messagingSenderId,
  });

  try {
    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }
    messagingInstance = getMessaging();
    return messagingInstance;
  } catch (err) {
    console.error('initFirebaseMessaging error', err);
    return null;
  }
}

export function getVapidKey() {
  return vapidKeyValue || (window as any).__FIREBASE_VAPID_KEY__ || null;
}

export default initFirebaseMessaging;
