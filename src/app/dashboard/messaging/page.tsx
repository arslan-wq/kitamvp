import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import MessagingClient from './components/MessagingClient';

export const metadata = {
  title: 'Nachrichten | KiTA Dashboard',
  description: 'Kommunikation mit Eltern und Verwaltung von Ankündigungen'
};

export default async function MessagingPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  // Check authorization
  const user = session.user as any;
  if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) {
    redirect('/');
  }

  // Fetch children in this KiTA
  const children = await prisma.child.findMany({
    where: { kitaId: user.kitaId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { firstName: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">💬 Nachrichten & Ankündigungen</h1>
        <p className="page-subtitle">
          Kommunikation mit Eltern und Verwaltung von Ankündigungen
        </p>
      </div>

      {/* Messaging Interface */}
      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <p className="text-secondary-500">
            Keine Kinder in dieser KiTA eingetragen.
          </p>
        </div>
      ) : (
        <MessagingClient children={children} kitaId={user.kitaId} />
      )}
    </div>
  );
}
