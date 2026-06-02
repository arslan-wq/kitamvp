'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  photoUrl?: string | null;
  location?: { name: string } | null;
  present?: boolean;
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/parent/children');
        if (!response.ok) throw new Error('Kinder konnten nicht geladen werden');
        setChildren(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? children.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      : children;
  }, [children, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-300 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-secondary-600">Lädt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Eltern-Portal</p>
        <h1 className="page-title">Meine Kinder</h1>
      </div>

      {error && <div className="alert alert-error"><p>{error}</p></div>}

      {/* Suche — nur bei mehreren Kindern */}
      {children.length > 2 && (
        <div className="card p-3 sm:p-4">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">🔍</span>
            <input
              type="text"
              placeholder="Nach Name suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>
      )}

      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <h3 className="text-xl font-semibold text-secondary-900 mb-2">Keine Kinder verknüpft</h3>
          <p className="text-secondary-500">Sie werden benachrichtigt, sobald Ihr Kind registriert wurde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((child) => (
            <Link
              key={child.id}
              href={`/children/${child.id}`}
              className="card overflow-hidden hover:-translate-y-0.5 transition-all group"
            >
              <div className="p-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xl shrink-0 ring-1 ring-secondary-100">
                  {child.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={child.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${child.firstName.charAt(0)}${child.lastName.charAt(0)}`.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-secondary-900 text-lg leading-tight truncate group-hover:text-primary-700 transition-colors">
                    {child.firstName} {child.lastName}
                  </h3>
                  <p className="text-sm text-secondary-500 truncate mt-0.5">
                    📍 {child.location?.name || 'Kein Standort'}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-secondary-100 bg-secondary-50/60 flex items-center justify-between gap-2">
                <span className={`chip ${child.present ? 'chip-success' : 'chip-neutral'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${child.present ? 'bg-green-500' : 'bg-secondary-400'}`} />
                  {child.present ? 'Heute anwesend' : 'Nicht da'}
                </span>
                <span className="text-primary-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Details <span>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
