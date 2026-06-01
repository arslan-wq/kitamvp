import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function ParentDashboard() {
  const session = await getServerSession(authOptions);

  const parent = await prisma.parent.findUnique({
    where: { id: session?.user?.id as string },
    include: { children: true },
  });

  if (!parent) {
    return <div>Fehler: Elternkonto nicht gefunden</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Willkommen, {parent.firstName}!
        </h1>
        <p className="text-lg text-gray-600">
          Hier können Sie die Informationen Ihrer Kinder einsehen und mit der KiTA kommunizieren.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/parent/children" className="block">
          <div className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-4">👶</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Meine Kinder</h3>
            <p className="text-gray-600">
              {parent.children.length} {parent.children.length === 1 ? 'Kind' : 'Kinder'} registriert
            </p>
          </div>
        </Link>

        <Link href="/parent/messages" className="block">
          <div className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nachrichten</h3>
            <p className="text-gray-600">
              Kommunizieren Sie mit der KiTA
            </p>
          </div>
        </Link>

        <Link href="/parent/documents" className="block">
          <div className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-4">📷</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Fotos & Dokumente</h3>
            <p className="text-gray-600">
              Bilder von den Aktivitäten ansehen
            </p>
          </div>
        </Link>
      </div>

      {parent.children.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ihre Kinder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parent.children.map((child) => (
              <Link key={child.id} href={`/parent/children/${child.id}`}>
                <div className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-lg transition cursor-pointer">
                  <h3 className="text-lg font-bold text-gray-900">
                    {child.firstName} {child.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    geb. {new Date(child.birthDate).toLocaleDateString('de-CH')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
