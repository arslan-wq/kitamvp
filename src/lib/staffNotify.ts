import { prisma } from '@/lib/db';
import { sendStaffRequestEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notify';

/**
 * Benachrichtigt die für ein Kind zuständigen Personen über eine Eltern-Anfrage
 * (Anmeldung/Abmeldung): das dem Standort des Kindes zugewiesene Personal sowie
 * alle Admins der KiTA. Versendet E-Mail (saubere Betreffzeile) + In-App-Glocke.
 * Best effort: Fehler blockieren nie die Hauptoperation.
 */
export async function notifyResponsibleStaff(opts: {
  kitaId: string;
  child: { firstName: string; lastName: string; locationId: string | null };
  kind: 'Betreuungsanfrage' | 'Abmeldung';
  periodLabel: string;
  parentName?: string;
  notes?: string | null;
}) {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        kitaId: opts.kitaId,
        OR: [
          ...(opts.child.locationId ? [{ locationId: opts.child.locationId }] : []),
          { role: 'ADMIN' as const },
        ],
      },
      select: { id: true, email: true, name: true },
    });
    if (recipients.length === 0) return;

    const childName = `${opts.child.firstName} ${opts.child.lastName}`;

    // E-Mails (best effort)
    await Promise.allSettled(
      recipients.map((r) =>
        sendStaffRequestEmail(r.email, {
          kind: opts.kind,
          childName,
          periodLabel: opts.periodLabel,
          parentName: opts.parentName,
          notes: opts.notes,
        })
      )
    );

    // In-App-Glocke
    await createNotifications({
      kitaId: opts.kitaId,
      recipientIds: recipients.map((r) => r.id),
      type: opts.kind === 'Abmeldung' ? 'CANCELLATION_REQUEST' : 'BOOKING_REQUEST',
      title: `Neue ${opts.kind}: ${childName}`,
      message: `${childName} · ${opts.periodLabel}`,
      link: '/dashboard/schedule',
    });
  } catch (e) {
    console.error('[staffNotify] notifyResponsibleStaff fehlgeschlagen:', e);
  }
}
