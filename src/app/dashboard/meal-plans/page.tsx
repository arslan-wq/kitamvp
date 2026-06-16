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

  // Alle Mitarbeitenden sehen den Menüplan; nur ADMIN/Leitung dürfen bearbeiten.
  const canEdit = ['ADMIN', 'KITA_LEITER'].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">🍽️ Menüplan</h1>
          <p className="page-subtitle">
            {canEdit
              ? 'Wöchentlichen Speiseplan erfassen. Eltern sehen relevante Allergie-Informationen.'
              : 'Wöchentlicher Speiseplan – nur ansehen und als PDF herunterladen.'}
          </p>
        </div>
      </div>

      <MealPlanManager kitaId={session.user.kitaId} canEdit={canEdit} />
    </div>
  );
}
