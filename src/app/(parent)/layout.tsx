import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).type !== 'parent') {
    redirect('/auth/login');
  }

  const navItems = [
    { label: 'Meine Kinder', href: '/children' },
    { label: 'Betreuungstage', href: '/bookings' },
    { label: 'Tagesberichte', href: '/daily-reports' },
    { label: 'Nachrichten', href: '/messages' },
    { label: 'Bilder & Dokumente', href: '/documents' },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gradient-to-br from-primary to-kita-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg font-bold">K</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Eltern Portal</h1>
              </div>
              <div className="hidden md:flex space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-700 hover:text-primary px-4 py-2 rounded-lg hover:bg-kita-50 transition font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium">{session.user?.name}</span>
              <a
                href="/api/auth/signout"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition font-medium shadow-soft"
              >
                Abmelden
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
