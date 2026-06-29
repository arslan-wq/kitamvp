'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { weekOccupancyPercent } from '@/lib/occupancy';

export default function ChildrenList({
  initialChildren,
  initialLocations,
  initialAttendance,
}: {
  initialChildren?: any[];
  initialLocations?: any[];
  initialAttendance?: any[];
} = {}) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const hasInitial = Array.isArray(initialChildren);
  const [children, setChildren] = useState<any[]>(initialChildren || []);
  const [locations, setLocations] = useState<any[]>(initialLocations || []);
  const [attendance, setAttendance] = useState<any[]>(initialAttendance || []);
  const [loading, setLoading] = useState(!hasInitial); // SSR: kein Lade-Flash
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all'); // all | <id> | none
  const [presenceFilter, setPresenceFilter] = useState('all'); // all | present | absent

  useEffect(() => {
    if (hasInitial) return; // SSR-Prefetch vorhanden → kein Initial-Fetch
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      try {
        const [cRes, lRes, aRes] = await Promise.all([
          fetch('/api/children'),
          fetch('/api/locations'),
          fetch(`/api/attendance?date=${today}`),
        ]);
        if (!cRes.ok) throw new Error('Kinder konnten nicht geladen werden');
        setChildren(await cRes.json());
        if (lRes.ok) setLocations(await lRes.json());
        if (aRes.ok) setAttendance(await aRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPresent = (childId: string) =>
    attendance.some((a) => a.childId === childId && a.checkInTime && !a.checkOutTime);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return children.filter((c) => {
      const matchesName = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
      const matchesLoc =
        locationFilter === 'all' ||
        (locationFilter === 'none' && !c.locationId) ||
        c.locationId === locationFilter;
      const present = isPresent(c.id);
      const matchesPresence =
        presenceFilter === 'all' ||
        (presenceFilter === 'present' && present) ||
        (presenceFilter === 'absent' && !present);
      return matchesName && matchesLoc && matchesPresence;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, attendance, search, locationFilter, presenceFilter]);

  const presentCount = children.filter((c) => isPresent(c.id)).length;

  if (loading) return <div className="text-center py-8 text-secondary-500">Laden…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Kinderverwaltung</p>
          <h1 className="page-title">Kinder</h1>
        </div>
        {isAdmin && (
          <Link href="/dashboard/children/create" className="btn btn-primary">
            + Kind hinzufügen
          </Link>
        )}
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value">{children.length}</p>
          <p className="stat-label">Kinder gesamt</p>
        </div>
        <div className="stat-card">
          <p className="stat-value text-green-600">{presentCount}</p>
          <p className="stat-label">Heute anwesend</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{filtered.length}</p>
          <p className="stat-label">Angezeigt</p>
        </div>
      </div>

      {/* Filterleiste */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">🔍</span>
          <input
            type="text"
            placeholder="Nach Name suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="input sm:max-w-[14rem]">
          <option value="all">📍 Alle Standorte</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
          <option value="none">Ohne Standort</option>
        </select>
        <select value={presenceFilter} onChange={(e) => setPresenceFilter(e.target.value)} className="input sm:max-w-[12rem]">
          <option value="all">Alle</option>
          <option value="present">✅ Anwesend</option>
          <option value="absent">Nicht da</option>
        </select>
      </div>

      {/* Profil-Kärtchen */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <p className="text-lg font-medium text-secondary-900">Keine Kinder gefunden</p>
          <p className="page-subtitle">Passe Suche oder Filter an.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((child) => {
            const present = isPresent(child.id);
            const allergyCount = child.allergies?.length || 0;
            const pct = weekOccupancyPercent(child.desiredCareDays);
            return (
              <Link
                key={child.id}
                href={`/dashboard/children/${child.id}`}
                className="card overflow-hidden hover:-translate-y-0.5 transition-all group"
              >
                {/* Kopf mit Foto */}
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

                {/* Status-Fußleiste */}
                <div className="px-5 py-3 border-t border-secondary-100 bg-secondary-50/60 flex items-center justify-between gap-2">
                  <span className={`chip ${present ? 'chip-success' : 'chip-neutral'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${present ? 'bg-green-500' : 'bg-secondary-400'}`} />
                    {present ? 'Anwesend' : 'Nicht da'}
                  </span>
                  <span className="flex items-center gap-2">
                    {allergyCount > 0 && (
                      <span className="chip chip-warning">⚠️ {allergyCount} Allergie{allergyCount > 1 ? 'n' : ''}</span>
                    )}
                    <span className={`chip ${pct >= 100 ? 'chip-success' : pct > 0 ? 'chip-accent' : 'chip-neutral'}`}
                      title="Belegung aus gewünschten Betreuungstagen">
                      {pct >= 100 ? '✓ 100%' : `${pct}%`}
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
