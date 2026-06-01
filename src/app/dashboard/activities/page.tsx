import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ActivityLogger from './components/ActivityLogger';

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Only ADMIN and BETREUER can log activities
  const userRole = (session.user as any)?.role;
  if (userRole !== 'ADMIN' && userRole !== 'BETREUER') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-red-900 mb-2">Zugriff verweigert</h1>
        <p className="text-red-700">
          Nur Administratoren und Betreuer können Aktivitäten protokollieren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tagesaktivitäten</h1>
        <p className="text-gray-600">
          Protokollieren Sie die täglichen Aktivitäten und Ereignisse für jedes Kind.
          Die Eltern werden automatisch benachrichtigt.
        </p>
      </div>

      <ActivityLogger />
    </div>
  );
}
