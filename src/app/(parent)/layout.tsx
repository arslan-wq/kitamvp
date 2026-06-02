import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';

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
    { label: 'Kita Kontakt', href: '/kontakt' },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white/80 glass border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Brand */}
            <Link href="/children" className="flex items-center gap-2.5 hover:opacity-80 transition">
              <div className="h-9 w-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-soft">
                <span className="text-white text-base font-bold">K</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-secondary-900 hidden sm:inline">KitaLuna</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />
              <span className="chip chip-neutral max-w-[12rem] hidden sm:inline-flex">
                <span className="truncate-1">{session.user?.name}</span>
              </span>
              <a href="/api/auth/signout" className="btn btn-secondary btn-sm">Abmelden</a>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="lg:hidden pb-3 pt-1 flex flex-wrap gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
