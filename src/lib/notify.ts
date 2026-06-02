import { prisma } from '@/lib/db';

/**
 * Erstellt In-App-Benachrichtigungen für eine Liste von Empfängern.
 * recipientId = User-ID (Personal) oder Parent-ID (Eltern).
 * Best effort: Fehler werden geloggt, blockieren aber nie die Hauptoperation.
 */
export async function createNotifications(opts: {
  kitaId: string;
  recipientIds: string[];
  type: string; // NEW_ACTIVITY, NEW_REPORT, NEW_MESSAGE, ANNOUNCEMENT, BOOKING_REQUEST, ...
  title: string;
  message: string;
  link?: string;
}) {
  const recipients = Array.from(new Set(opts.recipientIds.filter(Boolean)));
  if (recipients.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: recipients.map((recipientId) => ({
        kitaId: opts.kitaId,
        recipientId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        link: opts.link || null,
        isSent: true,
        sentVia: 'PUSH',
      })),
    });
  } catch (e) {
    console.error('[notify] createNotifications fehlgeschlagen:', e);
  }
}
