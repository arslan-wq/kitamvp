import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KitaContactView from '@/components/KitaContactView';

export const metadata = { title: 'Kita Kontakt – KitaLuna' };

export default async function KontaktPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) redirect('/auth/login');
  return <KitaContactView kitaId={session.user.kitaId} />;
}
