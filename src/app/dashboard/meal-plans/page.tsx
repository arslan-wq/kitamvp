import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MealPlanManager from './components/MealPlanManager';

export const metadata = {
  title: 'Speiseplan-Verwaltung - KiTA Luna',
  description: 'Speiseplan hochladen und verwalten',
};

export default async function MealPlansPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    redirect('/auth/login');
  }

  // Only ADMIN and KITA_LEITER can access
  if (!['ADMIN', 'KITA_LEITER'].includes(session.user.role)) {
    return (
      <div className="alert alert-error">
        <div>
          <h1 className="text-lg font-semibold mb-1">Zugriff verweigert</h1>
          <p>Nur Kita-Leiter und Administratoren können Speisepläne verwalten.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">🍽️ Speiseplan-Verwaltung</h1>
          <p className="page-subtitle">
            Wöchentlichen Speiseplan erfassen. Eltern sehen relevante Allergie-Informationen.
          </p>
        </div>
      </div>

      <MealPlanManager kitaId={session.user.kitaId} />
    </div>
  );
}
