'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NavItem { label: string; href: string; }

// T16: Eltern-Navigation auf Mobile in ein Burger-Menü (statt zweizeiliger Leiste).
export default function ParentMobileMenu({ navItems }: { navItems: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-icon text-secondary-600 hover:bg-secondary-100"
        aria-label="Menü"
      >
        ☰
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-16 z-50 bg-white border-t border-gray-100 shadow-elevated px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-secondary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-smooth"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <a href="/api/auth/signout" className="btn btn-secondary btn-block mt-3">Abmelden</a>
          </div>
        </>
      )}
    </div>
  );
}
