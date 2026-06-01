import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const messaging = admin.messaging();

export interface PushNotificationPayload {
  parentEmail: string;
  childName: string;
  activityType: string;
  activityTime: string;
  details?: string;
}

/**
 * Send push notification to a parent
 * Requires: parent has registered device token via /api/notifications/register
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
) {
  try {
    // Get device tokens for this parent from database
    const { prisma } = await import('@/lib/db');

    const parentTokens = await prisma.parentDeviceToken.findMany({
      where: { parent: { email: payload.parentEmail } },
      select: { token: true },
    });

    if (!parentTokens || parentTokens.length === 0) {
      console.log(`No device tokens for parent: ${payload.parentEmail}`);
      return { success: false, error: 'No device tokens registered' };
    }

    const activityEmojis: Record<string, string> = {
      EATING: '🍽️',
      DRINKING: '🥤',
      CHANGING_DIAPER: '🧷',
      SLEEPING: '😴',
      ACTIVITY: '🎨',
      DISCUSSION: '💬',
      NOTE: '📝',
      HEALTH_ISSUE: '🏥',
      TRIP: '🚌',
      ABSENT: '❌',
      HOLIDAY: '🎉',
      DRAWING: '🖍️',
    };

    const activityLabels: Record<string, string> = {
      EATING: 'Essen',
      DRINKING: 'Trinken',
      CHANGING_DIAPER: 'Wickeln',
      SLEEPING: 'Schlafen',
      ACTIVITY: 'Beschäftigung',
      DISCUSSION: 'Besprechung',
      NOTE: 'Bemerkung',
      HEALTH_ISSUE: 'Gesundheit',
      TRIP: 'Ausflug',
      ABSENT: 'Abwesend',
      HOLIDAY: 'Ferien',
      DRAWING: 'Zeichnung',
    };

    const emoji = activityEmojis[payload.activityType] || '📋';
    const label = activityLabels[payload.activityType] || payload.activityType;

    const message = {
      notification: {
        title: `${emoji} ${payload.childName}`,
        body: `${label} um ${payload.activityTime}`,
      },
      data: {
        childName: payload.childName,
        activityType: payload.activityType,
        activityTime: payload.activityTime,
        details: payload.details || '',
        link: '/parent/dashboard',
      },
      webpush: {
        notification: {
          title: `${emoji} ${payload.childName}`,
          body: `${label} um ${payload.activityTime}`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'activity-notification',
          requireInteraction: false,
          actions: [
            {
              action: 'open',
              title: 'App öffnen',
            },
          ],
        },
        fcmOptions: {
          link: '/parent/dashboard',
        },
      },
    };

    // Send to all device tokens
    const results = await Promise.allSettled(
      parentTokens.map(({ token }) =>
        messaging.send({
          ...message,
          token,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Log failed tokens for cleanup
    if (failed > 0) {
      console.warn(
        `Push notification: ${successful} sent, ${failed} failed for ${payload.parentEmail}`
      );
    }

    return {
      success: true,
      sent: successful,
      failed,
      messageId: 'multi-device',
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send health alert push notification
 */
export async function sendHealthAlertPush(
  parentEmail: string,
  childName: string,
  issue: string,
  details?: string
) {
  try {
    const { prisma } = await import('@/lib/db');

    const parentTokens = await prisma.parentDeviceToken.findMany({
      where: { parent: { email: parentEmail } },
      select: { token: true },
    });

    if (!parentTokens || parentTokens.length === 0) {
      return { success: false, error: 'No device tokens registered' };
    }

    const message = {
      notification: {
        title: `🏥 ${childName}`,
        body: issue,
      },
      data: {
        childName,
        issue,
        type: 'HEALTH_ALERT',
        details: details || '',
        link: '/parent/dashboard',
      },
      webpush: {
        notification: {
          title: `🏥 GESUNDHEITSMELDUNG: ${childName}`,
          body: issue,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'health-alert',
          requireInteraction: true, // Important: keep open until user interacts
          actions: [
            {
              action: 'open',
              title: 'App öffnen',
            },
          ],
        },
        fcmOptions: {
          link: '/parent/dashboard',
        },
      },
    };

    const results = await Promise.allSettled(
      parentTokens.map(({ token }) =>
        messaging.send({
          ...message,
          token,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;

    return {
      success: true,
      sent: successful,
      messageId: 'health-alert',
    };
  } catch (error) {
    console.error('Error sending health alert push:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
