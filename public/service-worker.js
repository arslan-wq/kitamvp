// Firebase Cloud Messaging Service Worker
// Handles background notifications and user interactions

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app.compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Initialize Firebase (config must be provided)
const firebaseConfig = {
  apiKey: self.registration.scope.includes('parent')
    ? 'YOUR_FIREBASE_CONFIG_HERE'
    : 'YOUR_FIREBASE_CONFIG_HERE',
  projectId: 'YOUR_PROJECT_ID',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage(payload => {
  const {
    notification,
    data,
  } = payload;

  const notificationTitle = notification.title || 'KiTA Luna';
  const notificationOptions = {
    body: notification.body,
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge || '/badge-72x72.png',
    tag: data.tag || 'notification',
    data: data,
    actions: notification.actions || [
      {
        action: 'open',
        title: 'App öffnen',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const { action, notification } = event;
  const link = notification.data?.link || '/parent/dashboard';

  notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === link && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});

// Handle notification dismiss
self.addEventListener('notificationclose', event => {
  // Optional: track notification dismissals
  console.log('Notification closed:', event.notification.tag);
});
