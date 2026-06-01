import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import MedicalRecordsForm from './components/MedicalRecordsForm';

export const metadata = {
  title: 'Medizinische Informationen | KiTA Dashboard',
  description: 'Verwaltung von medizinischen Informationen, Impfungen und Gesundheitsverlauf'
};

export default async function MedicalRecordsPage() {
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
      birthDate: true
    },
    orderBy: { firstName: 'asc' }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">🏥 Medizinische Info</h1>
        <p className="page-subtitle">
          Impfungen, Gesundheitsverlauf und ärztliche Kontaktdaten
        </p>
      </div>

      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value">{children.length}</p>
          <p className="stat-label">Kinder</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">3</p>
          <p className="stat-label">Schweregrade</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">8</p>
          <p className="stat-label">Ereignistypen</p>
        </div>
      </div>

      {/* Form */}
      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏥</div>
          <p className="text-secondary-500 text-lg">
            Keine Kinder in dieser KiTA eingetragen.
          </p>
        </div>
      ) : (
        <MedicalRecordsForm children={children} kitaId={user.kitaId} />
      )}
    </div>
  );
}
