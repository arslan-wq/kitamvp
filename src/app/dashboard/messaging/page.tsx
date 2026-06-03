import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import MessagingClient from './components/MessagingClient';

export const metadata = {
  title: 'Pinnwand | KiTA Dashboard',
  description: 'Kommunikation mit Eltern und Verwaltung von Ankündigungen',
};

export default async function MessagingPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect('/auth/login');

  const user = session.user as any;
  if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) redirect('/');

  const [children, locations, dbUser] = await Promise.all([
    prisma.child.findMany({
      where: { kitaId: user.kitaId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
    prisma.location.findMany({
      where: { kitaId: user.kitaId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      include: { location: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Kommunikation</p>
        <h1 className="page-title">Pinnwand</h1>
        <p className="page-subtitle">Kind-Pinnwand und Ankündigungen an einem Ort</p>
      </div>

      <MessagingClient
        childrenList={children}
        role={user.role}
        locations={locations}
        myLocationId={dbUser?.locationId || null}
        myLocationName={dbUser?.location?.name || null}
      />
    </div>
  );
}
