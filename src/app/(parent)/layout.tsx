import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import NotificationBell from '@/components/NotificationBell';
import HeaderProfile from '@/components/HeaderProfile';
import ParentMobileMenu from './components/ParentMobileMenu';

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).type !== 'parent') {
    redirect('/auth/login');
  }

  // T13: Nur mit Foto-Einwilligung erscheint „Bilder & Dokumente", sonst nur „Dokumente"
  const consentCount = await prisma.child.count({
    where: { parents: { some: { id: (session.user as any).id } }, photoConsent: true },
  });
  const docsLabel = consentCount > 0 ? 'Bilder & Dokumente' : 'Dokumente';

  const navItems = [
    { label: 'Meine Kinder', href: '/children' },
    { label: 'Betreuungstage', href: '/bookings' },
    { label: 'Zusatztage', href: '/extra-days' },
    { label: 'Abwesenheit', href: '/abmelden' },
    { label: 'Tagesberichte', href: '/daily-reports' },
    { label: 'Aktivitäten', href: '/activities' },
    { label: 'Pinnwand', href: '/messages' },
    { label: docsLabel, href: '/documents' },
    { label: 'Kita Kontakt', href: '/kontakt' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white/80 glass border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Links: auf Mobile Profil + Glocke ganz links, dann Logo */}
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              <div className="flex items-center gap-1 xl:hidden shrink-0">
                <HeaderProfile href="/profil" fallback={(session.user?.name || '?').charAt(0).toUpperCase()} />
                <NotificationBell />
              </div>
              <Link href="/children" className="flex items-center hover:opacity-80 transition shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/kitaluna-wordmark.svg" alt="KitaLuna" className="h-7 sm:h-9 w-auto" />
              </Link>
            </div>

            {/* Desktop Navigation (ab xl; darunter Burger-Menü) */}
            <nav className="hidden xl:flex items-center gap-0.5 min-w-0 shrink">
              {navItems.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth"
                >
                  {item.label}
                </Link>
              ))}
              <div className="relative group">
                <button className="px-3 py-2 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth">Mehr ▾</button>
                <div className="absolute right-0 mt-1 w-56 card p-1.5 hidden group-hover:block z-50">
                  {navItems.slice(5).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-3 py-2 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            {/* Rechts: Desktop Glocke+Profil+Abmelden, Mobile Burger */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden xl:flex items-center gap-3">
                <NotificationBell />
                <HeaderProfile href="/profil" fallback={(session.user?.name || '?').charAt(0).toUpperCase()} />
                <span className="chip chip-neutral max-w-[10rem] hidden 2xl:inline-flex">
                  <span className="truncate-1">{session.user?.name}</span>
                </span>
                <a href="/api/auth/signout" className="btn btn-secondary btn-sm">Abmelden</a>
              </div>
              <ParentMobileMenu navItems={navItems} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
