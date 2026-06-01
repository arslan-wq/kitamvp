import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChildForm from '../components/ChildForm';

export default async function CreateChildPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  // Only ADMIN can create children
  const userRole = (session.user as any)?.role;
  if (userRole !== 'ADMIN') {
    return (
      <div className="alert alert-error">
        <h1 className="text-2xl font-bold mb-2">🔒 Zugriff verweigert</h1>
        <p>
          Nur Administratoren dürfen neue Kinder anlegen. Bitte kontaktieren Sie einen Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChildForm />
    </div>
  );
}
