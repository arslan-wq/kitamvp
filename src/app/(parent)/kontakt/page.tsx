import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KitaContactView from '@/components/KitaContactView';

export const metadata = { title: 'Kita Kontakt – KitaLuna' };

export default async function ParentKontaktPage() {
  const session = await getServerSession(authOptions);
  const kitaId = (session?.user as any)?.kitaId;
  if (!session || (session.user as any).type !== 'parent' || !kitaId) {
    redirect('/auth/login');
  }
  return <KitaContactView kitaId={kitaId} />;
}
