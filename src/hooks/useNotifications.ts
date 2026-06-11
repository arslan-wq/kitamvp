import { useState } from 'react';

/**
 * Push-Benachrichtigungen.
 *
 * MVP: Web-Push (VAPID) bzw. E-Mail-Fallback — siehe CLAUDE.md §9.
 * FCM/Firebase Cloud Messaging ist auf EPIC 17 (native Apps) zurückgestellt.
 *
 * Hinweis (Perf): Der frühere Firebase-Web-SDK-Import (~58 MB) wurde aus dem
 * Client-Bundle entfernt. Die FCM-Variante zog das gesamte SDK in das
 * Eltern-Portal-Bundle und war zudem fehlerhaft (`firebase.app()` ohne Import).
 * Bis EPIC 17 meldet der Hook `isSupported: false`, sodass die UI sich
 * sauber ausblendet, statt das Bundle zu belasten.
 */
export function useNotifications() {
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const notImplemented = async () => {
    // TODO EPIC 17: Web-Push (VAPID) statt FCM verdrahten.
  };

  return {
    isSupported: false,
    token: null as string | null,
    isLoading,
    error,
    isPermissionGranted:
      typeof Notification !== 'undefined' && Notification.permission === 'granted',
    requestPermission: notImplemented,
    revokePermission: notImplemented,
  };
}
