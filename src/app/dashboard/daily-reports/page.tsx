import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import DailyReportForm from './components/DailyReportForm';

export const metadata = {
  title: 'Tagesbericht - KiTA Luna',
  description: 'Tagesbericht für Kinder erstellen und verwalten',
};

export default async function DailyReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(session.user.role)) {
    redirect('/auth/login');
  }

  // Get all children in this KiTA
  const children = await prisma.child.findMany({
    where: { kitaId: session.user.kitaId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
    },
    orderBy: { firstName: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">📋 Tagesbericht</h1>
        <p className="page-subtitle">
          Detaillierter Tagesbericht je Kind — Mahlzeiten, Schlaf, Toilette und mehr.
        </p>
      </div>

      <DailyReportForm children={children} />
    </div>
  );
}
