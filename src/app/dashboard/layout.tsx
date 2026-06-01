'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter navigation items based on role
  const getNavItems = () => {
    const allItems = [
      { label: '📋 Tagesbericht', href: '/dashboard/daily-reports' },
      { label: '📊 Aktivitäten', href: '/dashboard/activities' },
      { label: '👶 Kinder', href: '/dashboard/children' },
      { label: '📅 Belegungsplanung', href: '/dashboard/schedule' },
      { label: '💬 Nachrichten', href: '/dashboard/messages' },
      { label: '🏥 Medizinische Info', href: '/dashboard/medical-records' },
      { label: '📍 Standorte', href: '/dashboard/locations' },
      { label: '🖼️ Fotos & Dokumente', href: '/dashboard/documents' },
    ];

    // Only show admin features for ADMIN users
    if (session?.user && (session.user as any).role === 'ADMIN') {
      allItems.push({ label: '📄 Verträge', href: '/dashboard/contracts' });
      allItems.push({ label: '💰 Abrechnung', href: '/dashboard/billing' });
    }

    return allItems;
  };

  const navItems = getNavItems();

  if (!session) {
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
    <div className="min-h-screen bg-secondary-50">
      {/* Header Navigation */}
      <header className="bg-white/80 glass border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Brand */}
            <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition">
              <div className="h-9 w-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-soft">
                <span className="text-white text-base font-bold">K</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-secondary-900 hidden sm:inline">KitaLuna</span>
            </Link>

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

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="chip chip-neutral max-w-[12rem] hidden sm:inline-flex">
                <span className="truncate-1">{session.user?.email}</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn-icon lg:hidden text-secondary-600 hover:bg-gray-100"
              >
                ☰
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn btn-secondary btn-sm"
              >
                Abmelden
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-1">
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
