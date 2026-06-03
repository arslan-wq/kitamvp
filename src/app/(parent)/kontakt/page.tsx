import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import KitaContactView from '@/components/KitaContactView';

export const metadata = { title: 'Kita Kontakt – KitaLuna' };

export default async function ParentKontaktPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'parent') {
    redirect('/auth/login');
  }

  // Eltern-Sessions tragen evtl. keine kitaId → aus dem Kind ableiten
  let kitaId = (session.user as any)?.kitaId as string | undefined;
  if (!kitaId) {
    const child = await prisma.child.findFirst({
      where: { parents: { some: { id: (session.user as any).id } } },
      select: { kitaId: true },
    });
    kitaId = child?.kitaId;
  }

  if (!kitaId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📞</div>
        <p className="text-secondary-500">Noch keine Kita-Zuordnung vorhanden.</p>
      </div>
    );
  }

  return <KitaContactView kitaId={kitaId} />;
}
