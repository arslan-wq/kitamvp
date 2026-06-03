import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import HeaderProfile from '@/components/HeaderProfile';

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
    { label: 'Pinnwand', href: '/messages' },
    { label: 'Bilder & Dokumente', href: '/documents' },
    { label: 'Kita Kontakt', href: '/kontakt' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white/80 glass border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Brand */}
            <Link href="/children" className="flex items-center hover:opacity-80 transition shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/kitaluna-wordmark.svg" alt="KitaLuna" className="h-8 sm:h-9 w-auto" />
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
              <HeaderProfile href="/profil" fallback={(session.user?.name || '?').charAt(0).toUpperCase()} />
              <span className="chip chip-neutral max-w-[10rem] hidden sm:inline-flex">
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
