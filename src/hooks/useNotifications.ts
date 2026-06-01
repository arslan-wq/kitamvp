import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: any = null;

/**
 * Hook to initialize Firebase Cloud Messaging and request notification permissions
 * Used by Parent Portal to enable push notifications
 */
export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      'messaging' in firebase.app();

    setIsSupported(supported);
  }, []);

  // Request notification permission and register token
  const requestPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if already have permission
      if (Notification.permission === 'granted') {
        await registerToken();
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        await registerToken();
      } else {
        setError('Benachrichtigungen wurden abgelehnt');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      console.error('Error requesting notification permission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Register device token with backend
  const registerToken = async () => {
    try {
      if (!app) {
        app = initializeApp(firebaseConfig);
      }

      const messaging = getMessaging(app);

      // Get device token
      const deviceToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (deviceToken) {
        // Register token with backend
        const response = await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: deviceToken,
            userAgent: navigator.userAgent,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to register device token');
        }

        setToken(deviceToken);

        // Listen for foreground notifications
        onMessage(messaging, payload => {
          console.log('Foreground notification:', payload);

          // Show notification even in foreground
          if (Notification.permission === 'granted') {
            new Notification(
              payload.notification?.title || 'KiTA Luna',
              {
                body: payload.notification?.body,
                icon: payload.notification?.icon || '/icon-192x192.png',
                badge: '/badge-72x72.png',
                tag: payload.data?.tag || 'notification',
              }
            );
          }
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      console.error('Error registering device token:', err);
    }
  };

  // Revoke notification permission
  const revokePermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (token) {
        // Unregister token from backend
        const response = await fetch('/api/notifications/register', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          throw new Error('Failed to unregister device token');
        }

        setToken(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      console.error('Error revoking notification permission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    token,
    isLoading,
    error,
    isPermissionGranted:
      typeof Notification !== 'undefined' && Notification.permission === 'granted',
    requestPermission,
    revokePermission,
  };
}
