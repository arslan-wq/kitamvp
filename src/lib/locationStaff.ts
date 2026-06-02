import { prisma } from '@/lib/db';
import { sendStaffAssignmentEmail } from '@/lib/email';

/**
 * Weist einem Standort Personal zu (mit optionalen Arbeitszeiten).
 * - Setzt locationId + workingHours für zugewiesenes Personal.
 * - Löst Personal, das nicht mehr in der Liste ist.
 * - Benachrichtigt neu zugewiesenes / geändertes Personal per E-Mail (best effort).
 * Mandantengescoped: nur Personal der eigenen KiTA wird berücksichtigt.
 */
export async function applyStaffAssignments(
  locationId: string,
  kitaId: string,
  locationName: string,
  assignments: { userId: string; workingHours?: string }[]
) {
  // Nur gültiges Personal der eigenen KiTA
  const validUsers = await prisma.user.findMany({
    where: { id: { in: assignments.map((a) => a.userId) }, kitaId },
    select: { id: true, email: true, name: true, workingHours: true, locationId: true },
  });
  const validById = new Map(validUsers.map((u) => [u.id, u]));
  const nextIds = new Set(validUsers.map((u) => u.id));

  // Aktuell diesem Standort zugewiesene Personen
  const current = await prisma.user.findMany({
    where: { locationId },
    select: { id: true },
  });

  // Entfernen: aktuell zugewiesen, aber nicht mehr in der Liste
  const toRemove = current.filter((u) => !nextIds.has(u.id)).map((u) => u.id);
  if (toRemove.length) {
    await prisma.user.updateMany({ where: { id: { in: toRemove } }, data: { locationId: null } });
  }

  // Zuweisen / aktualisieren
  const toNotify: { email: string; name: string; workingHours?: string }[] = [];
  for (const a of assignments) {
    const u = validById.get(a.userId);
    if (!u) continue;
    const wh = a.workingHours?.trim() || null;
    const changed = u.locationId !== locationId || u.workingHours !== wh;
    await prisma.user.update({ where: { id: u.id }, data: { locationId, workingHours: wh } });
    if (changed) toNotify.push({ email: u.email, name: u.name, workingHours: wh || undefined });
  }

  // E-Mails best effort — Fehler blockieren niemals die Speicherung
  await Promise.allSettled(
    toNotify.map((u) =>
      sendStaffAssignmentEmail(u.email, { staffName: u.name, locationName, workingHours: u.workingHours })
    )
  );
}
