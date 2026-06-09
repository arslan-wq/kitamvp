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

  const [children, locations] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Dokumentation</p>
        <h1 className="page-title">Aktivitäten</h1>
        <p className="page-subtitle">Kanban nach Standort oder Zeitachse – filterbar, Eltern werden benachrichtigt</p>
      </div>
      <ActivitiesBoard childrenList={children} locations={locations} />
    </div>
  );
}
