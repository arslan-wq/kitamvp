import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import DailyReportsTimeline from './components/DailyReportsTimeline';
import ExtraDayExport from './components/ExtraDayExport';

export const metadata = {
  title: 'Tagesberichte – KitaLuna',
};

export default async function DailyReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(session.user.role)) {
    redirect('/auth/login');
  }

  const [children, locations] = await Promise.all([
    prisma.child.findMany({
      where: { kitaId: session.user.kitaId },
      select: { id: true, firstName: true, lastName: true, photoUrl: true, locationId: true },
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
        <h1 className="page-title">Tagesberichte</h1>
        <p className="page-subtitle">Zeitachse aller Berichte – filterbar, druckbar als PDF</p>
      </div>
      {/* T14: Zusatztage-Export — nur Admin/Leitung */}
      {['ADMIN', 'KITA_LEITER'].includes(session.user.role) && <ExtraDayExport />}
      <DailyReportsTimeline childrenList={children} locations={locations} />
    </div>
  );
}
