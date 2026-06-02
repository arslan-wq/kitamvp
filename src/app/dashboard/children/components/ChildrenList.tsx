'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function ChildrenList() {
  const { data: session } = useSession();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/children');
        if (!response.ok) {
          throw new Error('Failed to fetch children');
        }
        const data = await response.json();
        setChildren(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  const filteredChildren = children.filter(
    (child) =>
      child.firstName.toLowerCase().includes(search.toLowerCase()) ||
      child.lastName.toLowerCase().includes(search.toLowerCase())
  );

  const withAllergies = children.filter(
    (child) => child.allergies && child.allergies.length > 0
  ).length;

  if (loading) {
    return <div className="text-center py-8 text-secondary-500">Laden…</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">👶 Kinderverwaltung</h1>
          <p className="page-subtitle">Übersicht aller betreuten Kinder</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/children/create" className="btn btn-primary">
            + Kind hinzufügen
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value">{children.length}</p>
          <p className="stat-label">Kinder gesamt</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{filteredChildren.length}</p>
          <p className="stat-label">Angezeigt</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{withAllergies}</p>
          <p className="stat-label">Mit Allergien</p>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <input
          type="text"
          placeholder="Nach Name suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-md"
        />
      </div>

      {filteredChildren.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <p className="text-lg font-medium text-secondary-900">Keine Kinder gefunden</p>
          <p className="page-subtitle">Passe die Suche an oder füge ein neues Kind hinzu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredChildren.map((child) => (
            <Link
              key={child.id}
              href={`/dashboard/children/${child.id}`}
              className="card p-5 hover:shadow-elevated transition block group"
            >
              <div className="flex items-center gap-4">
                <div className="avatar avatar-lg overflow-hidden group-hover:scale-105 transition">
                  {child.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={child.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>{child.firstName.charAt(0)}{child.lastName.charAt(0)}</>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-secondary-900 truncate">
                    {child.firstName} {child.lastName}
                  </h3>
                  <p className="text-sm text-secondary-500">
                    {new Date(child.birthDate).toLocaleDateString('de-CH')}
                  </p>
                </div>
              </div>
              {child.allergies && child.allergies.length > 0 && (
                <div className="mt-4">
                  <span className="chip chip-warning">
                    ⚠️ {child.allergies.length} Allergie(n)
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
