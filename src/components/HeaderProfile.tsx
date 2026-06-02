'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Zeigt das eigene Profilfoto im Header (statt Logo/Initiale). Klick → Profil bearbeiten.
export default function HeaderProfile({ href, fallback }: { href: string; fallback: string }) {
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      fetch('/api/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (active && d) setPhoto(d.photoUrl || null); })
        .catch(() => {});
    refresh();
    // Nach dem Speichern im Profil (dispatcht 'focus') Foto aktualisieren
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, []);

  return (
    <Link
      href={href}
      title="Profil bearbeiten"
      className="w-9 h-9 rounded-full overflow-hidden bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center ring-1 ring-secondary-200 hover:ring-primary-300 transition shrink-0"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Profil" className="w-full h-full object-cover" />
      ) : (
        fallback
      )}
    </Link>
  );
}
