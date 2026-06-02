import { prisma } from '@/lib/db';

// Prüft, ob die aktuelle Sitzung (per E-Mail) Zugriff auf ein Kind hat.
// Personal der gleichen KiTA ODER Elternteil des Kindes.
export async function resolveChildAccess(email: string | null | undefined, childId: string) {
  if (!email || !childId) return { allowed: false as const };
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { parents: { select: { id: true, email: true } } },
  });
  if (!child) return { allowed: false as const, notFound: true as const };

  const user = await prisma.user.findUnique({ where: { email } });
  const isStaff = !!user && user.kitaId === child.kitaId;
  const isParent = child.parents.some((p) => p.email === email);
  const isAdmin = isStaff && user!.role === 'ADMIN';

  return {
    // Lesen: Personal der KiTA oder Eltern
    allowed: isStaff || isParent,
    // Bearbeiten von Profil-/Medizindaten: NUR Admin oder Eltern des Kindes
    canEdit: isParent || isAdmin,
    isStaff,
    isParent,
    isAdmin,
    child,
    user,
  };
}
