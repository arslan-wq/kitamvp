import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ActivitiesBoard from './components/ActivitiesBoard';

export const metadata = { title: 'Aktivitäten – KitaLuna' };

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes((session.user as any).role)) {
    redirect('/auth/login');
  }

  const [children, locations, activities] = await Promise.all([
    prisma.child.findMany({
      where: { kitaId: session.user.kitaId },
      select: { id: true, firstName: true, lastName: true, photoUrl: true, locationId: true, photoConsent: true },
      orderBy: { firstName: 'asc' },
    }),
    prisma.location.findMany({
      where: { kitaId: session.user.kitaId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    // Perf: initiale Aktivitätsliste (ohne Filter) server-seitig vorladen,
    // gleiche Shape wie GET /api/activities (inkl. creatorName unten).
    prisma.activity.findMany({
      where: { kitaId: session.user.kitaId },
      take: 500,
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true, locationId: true, location: { select: { id: true, name: true } } } } },
      orderBy: { timestamp: 'desc' },
    }),
  ]);

  const creatorIds = Array.from(new Set(activities.map((a) => a.createdBy).filter(Boolean)));
  const creators = creatorIds.length
    ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(creators.map((u) => [u.id, u.name]));
  const initialActivities = JSON.parse(JSON.stringify(
    activities.map((a) => ({ ...a, creatorName: nameById.get(a.createdBy) || null }))
  ));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Dokumentation</p>
        <h1 className="page-title">Aktivitäten</h1>
        <p className="page-subtitle">Kanban nach Standort oder Zeitachse – filterbar, Eltern werden benachrichtigt</p>
      </div>
      <ActivitiesBoard childrenList={children} locations={locations} initialActivities={initialActivities} />
    </div>
  );
}
