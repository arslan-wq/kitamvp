import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ParentDashboardClient from './components/ParentDashboardClient';

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/login');
  }

  // Check if user is a parent
  const parent = await prisma.parent.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      children: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          kitaId: true,
          allergies: true,
          activities: {
            orderBy: { timestamp: 'desc' },
            take: 50,
            select: {
              id: true,
              type: true,
              timestamp: true,
              details: true,
              notes: true,
            },
          },
        },
      },
    },
  });

  if (!parent) {
    return (
      <div className="empty-state max-w-lg mx-auto">
        <div className="empty-state-icon">🔒</div>
        <h1 className="page-title">Zugriff verweigert</h1>
        <p className="page-subtitle">
          Ihr Konto ist nicht als Eltern-Konto registriert. Bitte kontaktieren Sie die KiTA.
        </p>
      </div>
    );
  }

  if (!parent.children || parent.children.length === 0) {
    return (
      <div className="empty-state max-w-lg mx-auto">
        <div className="empty-state-icon">👶</div>
        <h1 className="page-title">Willkommen!</h1>
        <p className="page-subtitle">
          Ihnen sind noch keine Kinder zugeordnet. Bitte kontaktieren Sie die KiTA, um Ihr Kind hinzuzufügen.
        </p>
      </div>
    );
  }

  return <ParentDashboardClient parent={parent} />;
}
