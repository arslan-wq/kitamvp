'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * Notification settings component for Parent Portal
 * Allows parents to enable/disable push notifications
 */
export default function NotificationSettings() {
  const {
    isSupported,
    token,
    isLoading,
    error,
    isPermissionGranted,
    requestPermission,
    revokePermission,
  } = useNotifications();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isSupported) {
    return null; // Don't render if not supported or not mounted
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🔔 Push-Benachrichtigungen
          </h3>
          <p className="text-sm text-gray-600">
            {isPermissionGranted
              ? 'Benachrichtigungen sind aktiviert. Sie erhalten Echtzeit-Meldungen.'
              : 'Erhalten Sie Echtzeit-Benachrichtigungen auf Ihrem Gerät.'}
          </p>
        </div>

        {isPermissionGranted && token ? (
          <button
            onClick={revokePermission}
            disabled={isLoading}
            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 text-sm font-medium rounded-lg transition"
          >
            {isLoading ? 'wird deaktiviert...' : 'Deaktivieren'}
          </button>
        ) : (
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white hover:bg-primary-dark disabled:opacity-50 text-sm font-medium rounded-lg transition"
          >
            {isLoading ? 'wird aktiviert...' : 'Aktivieren'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {isPermissionGranted && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Benachrichtigungen sind aktiviert
        </div>
      )}
    </div>
  );
}
