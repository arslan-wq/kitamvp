import { prisma } from '@/lib/db';
import { sendNewMessageEmail } from '@/lib/email';

interface NotifyOpts {
  kitaId: string;
  childId?: string | null;
  locationId?: string | null;
  isAnnouncement?: boolean;
  senderName: string;
  content: string;
  title?: string | null;
}

// Ermittelt die betroffenen Eltern und sendet "Neue Mitteilung"-E-Mails.
// Best-effort: Fehler einzelner Sendungen werden geloggt, nicht geworfen.
export async function notifyParentsOfNewMessage(opts: NotifyOpts) {
  try {
    let where: any;
    if (opts.childId) {
      where = { children: { some: { id: opts.childId } } };
    } else if (opts.isAnnouncement && opts.locationId) {
      where = { children: { some: { locationId: opts.locationId } } };
    } else if (opts.isAnnouncement) {
      where = { children: { some: { kitaId: opts.kitaId } } };
    } else {
      return;
    }

    const parents = await prisma.parent.findMany({
      where,
      select: { email: true, firstName: true },
      take: 200,
    });

    const results = await Promise.allSettled(
      parents.map((p) =>
        sendNewMessageEmail(p.email, {
          name: p.firstName,
          senderName: opts.senderName,
          preview: opts.content,
          title: opts.title,
          isAnnouncement: opts.isAnnouncement,
        })
      )
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.length - ok;
    console.log(`[notifyMessage] Benachrichtigungen: ${ok} gesendet, ${fail} fehlgeschlagen (${parents.map((p) => p.email).join(', ')})`);
    results.forEach((r) => { if (r.status === 'rejected') console.error('[notifyMessage] Sendefehler:', r.reason?.message); });
  } catch (e) {
    console.error('[notifyMessage] Fehler:', e);
  }
}
