'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import HeaderProfile from '@/components/HeaderProfile';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter navigation items based on role
  const getNavItems = () => {
    const allItems = [
      { label: '📋 Berichte', href: '/dashboard/daily-reports' },
      { label: '📊 Aktivitäten', href: '/dashboard/activities' },
      { label: '👶 Kinder', href: '/dashboard/children' },
      { label: '📅 Belegungsplanung', href: '/dashboard/schedule' },
      { label: '💬 Pinnwand', href: '/dashboard/messaging' },
      { label: '🏥 Medizinische Info', href: '/dashboard/medical-records' },
      { label: '📍 Standorte', href: '/dashboard/locations' },
      { label: '📞 Kita Kontakt', href: '/dashboard/kontakt' },
      { label: '🖼️ Fotos & Dokumente', href: '/dashboard/documents' },
    ];

    const role = (session?.user as any)?.role;
    // Menüplan & Benutzerverwaltung für Admin & Leitung
    if (role === 'ADMIN' || role === 'KITA_LEITER') {
      allItems.push({ label: '🍽️ Menüplan', href: '/dashboard/meal-plans' });
      allItems.push({ label: '👥 Benutzer', href: '/dashboard/users' });
    }
    // Nur Admin: Verträge & Abrechnung
    if (role === 'ADMIN') {
      allItems.push({ label: '📄 Verträge', href: '/dashboard/contracts' });
      allItems.push({ label: '💰 Abrechnung', href: '/dashboard/billing' });
    }

    return allItems;
  };

  const navItems = getNavItems();

  // Nur bei BESTÄTIGT nicht-authentifiziert blocken. Während `loading`
  // (Server-Render & erster Client-Tick) den Inhalt rendern — die Seiten
  // sind server-seitig per getServerSession geschützt. Das ermöglicht echtes
  // SSR der Seiten und vermeidet das „Zugriff erforderlich"-Flackern.
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="empty-state max-w-md w-full">
          <div className="empty-state-icon">🔒</div>
          <h1 className="page-title">Zugriff erforderlich</h1>
          <p className="page-subtitle mb-8">Bitte melden Sie sich an, um fortzufahren.</p>
          <Link href="/auth/login" className="btn btn-primary btn-lg">
            Zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="bg-white/80 glass border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Links: auf Mobile Profil + Glocke ganz links, dann Logo */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1 lg:hidden shrink-0">
                <HeaderProfile href="/dashboard/profil" fallback={(session?.user?.name || session?.user?.email || '?').charAt(0).toUpperCase()} />
                <NotificationBell />
              </div>
              <Link href="/dashboard" className="flex items-center hover:opacity-80 transition shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/kitaluna-wordmark.svg" alt="KitaLuna" className="h-7 sm:h-9 w-auto" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
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
                <button className="px-3 py-2 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth">
                  Mehr ▾
                </button>
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
              <div className="hidden lg:flex items-center gap-3">
                <NotificationBell />
                <HeaderProfile href="/dashboard/profil" fallback={(session?.user?.name || session?.user?.email || '?').charAt(0).toUpperCase()} />
                <span className="chip chip-neutral max-w-[10rem]">
                  <span className="truncate-1">{session?.user?.email}</span>
                </span>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="btn btn-secondary btn-sm">Abmelden</button>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn-icon lg:hidden text-secondary-600 hover:bg-secondary-100"
                aria-label="Menü"
              >
                ☰
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                className="btn btn-secondary btn-block mt-3"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
