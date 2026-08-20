// Firebase messaging service worker for web background notifications.
// This file must use the Firebase Web app config, not Android google-services.json.
self.addEventListener('install', () => self.skipWaiting());

const firebaseConfig = {
  apiKey: "AIzaSyAvAbgPFB0eKYjg7rplwRj6GqLvTaAbaCo",
  authDomain: "mywebapp-3a387.firebaseapp.com",
  projectId: "mywebapp-3a387",
  storageBucket: "mywebapp-3a387.firebasestorage.app",
  messagingSenderId: "688767678106",
  appId: "1:688767678106:web:d498d80ea5156e77ed1123",
  measurementId: "G-YLVVNXYPHR"
};

(async () => {
  try {
    importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

    console.log('Firebase Web config loaded:', {
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      messagingSenderId: firebaseConfig.messagingSenderId,
    });

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
      console.log('[firebase-messaging-sw] Received background message ', payload);
      const notificationTitle = payload.notification?.title || 'Notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        data: payload.data || {},
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (err) {
    console.error('firebase-messaging-sw init error', err);
  }
})();
