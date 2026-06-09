'use client';

import { useState, useEffect, useCallback } from 'react';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAY_TYPE_LABELS: Record<string, string> = {
  FULL_DAY: 'Ganztags',
  MORNING_WITH_MEAL: 'Vormittag + Essen',
  MORNING_NO_MEAL: 'Vormittag',
  AFTERNOON_WITH_MEAL: 'Nachmittag + Essen',
  AFTERNOON_NO_MEAL: 'Nachmittag',
};

interface Booking {
  id: string;
  childId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  dayType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  child: { id: string; firstName: string; lastName: string; locationId: string | null; photoUrl?: string | null };
}

interface Location {
  id: string;
  name: string;
  capacity: number;
}

export default function ScheduleView() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    const res = await fetch('/api/bookings');
    if (res.ok) setBookings(await res.json());
  }, []);

  const fetchAttendance = useCallback(async (d: string) => {
    const res = await fetch(`/api/attendance?date=${d}`);
    if (res.ok) setAttendance(await res.json());
  }, []);

  const [notices, setNotices] = useState<any[]>([]); // T9/T10 Tagesmeldungen
  const fetchNotices = useCallback(async (d: string) => {
    const res = await fetch(`/api/day-notices?date=${d}`);
    if (res.ok) setNotices(await res.json());
  }, []);
  const noticeByChild = (childId: string) => notices.find(n => n.childId === childId);

  useEffect(() => {
    (async () => {
      try {
        const [, , locRes] = await Promise.all([
          fetchBookings(),
          fetchAttendance(date),
          fetch('/api/locations'),
        ]);
        if (locRes.ok) setLocations(await locRes.json());
      } catch {
        setError('Daten konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAttendance(date);
    fetchNotices(date);
  }, [date, fetchAttendance, fetchNotices]);

  const review = async (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await fetchBookings();
      else setError('Aktion fehlgeschlagen');
    } finally {
      setActionLoading(null);
    }
  };

  const undoAttendance = async (childId: string, action: 'checkin' | 'checkout') => {
    setActionLoading(childId + 'undo' + action);
    try {
      const res = await fetch(`/api/attendance/${childId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await fetchAttendance(date);
      else setError('Aktion fehlgeschlagen');
    } finally {
      setActionLoading(null);
    }
  };

  const attendanceAction = async (childId: string, action: 'checkin' | 'checkout') => {
    setActionLoading(childId + action);
    try {
      const res = await fetch(`/api/attendance/${childId}/${action}`, { method: 'POST' });
      if (res.ok) await fetchAttendance(date);
      else setError('Aktion fehlgeschlagen');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="text-center py-8">Laden…</div>;

  // Ausgewähltes Datum lokal parsen (kein UTC-Versatz)
  const [yy, mm, dd] = date.split('-').map(Number);
  const selected = new Date(yy, mm - 1, dd);
  const dow = selected.getDay();

  const pending = bookings.filter(b => b.status === 'PENDING');

  // Erwartete Kinder am gewählten Tag aus akzeptierten Buchungen (dedupe je Kind)
  const expectedMap = new Map<string, Booking>();
  for (const b of bookings) {
    if (b.status !== 'APPROVED') continue;
    const startStr = b.startDate.slice(0, 10);
    const endStr = b.endDate.slice(0, 10);
    if (date >= startStr && date <= endStr && b.weekdays.includes(dow)) {
      if (!expectedMap.has(b.childId)) expectedMap.set(b.childId, b);
    }
  }
  const expected = Array.from(expectedMap.values());

  // Nach Standort gruppieren
  const locName = (id: string | null) =>
    id ? locations.find(l => l.id === id)?.name ?? 'Unbekannter Standort' : 'Ohne Standort';
  const groups = new Map<string, Booking[]>();
  for (const b of expected) {
    const key = b.child.locationId ?? '__none__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const attByChild = (childId: string) => attendance.find(a => a.childId === childId);
  const initials = (f: string, l: string) => `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  const avatarEl = (c: Booking['child']) => (
    <div className="avatar avatar-md overflow-hidden">
      {c.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(c.firstName, c.lastName)
      )}
    </div>
  );
  const fmtTime = (t: string) =>
    new Date(t).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  const fmtRange = (b: Booking) =>
    `${new Date(b.startDate).toLocaleDateString('de-CH')} – ${new Date(b.endDate).toLocaleDateString('de-CH')}`;

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <p className="eyebrow">Planung</p>
          <h1 className="page-title">📅 Belegungsplan</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-secondary-500 whitespace-nowrap">Tag:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input max-w-[180px]" />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Übersicht */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><p className="stat-value text-secondary-900">{expected.length}</p><p className="stat-label">Erwartet am {WEEKDAYS[dow]}.</p></div>
        <div className="stat-card"><p className="stat-value text-primary-600">{Math.max(0, expected.length - attendance.filter(a => a.checkOutTime).length)}</p><p className="stat-label">✅ Anwesend</p></div>
        <div className="stat-card"><p className="stat-value text-success">{attendance.filter(a => a.checkOutTime).length}</p><p className="stat-label">🚪 Abgeholt</p></div>
        <div className="stat-card"><p className="stat-value text-warning">{pending.length}</p><p className="stat-label">⏳ Offene Anfragen</p></div>
      </div>

      {/* A) Offene Buchungsanfragen */}
      {pending.length > 0 && (
        <div className="card p-6">
          <p className="eyebrow mb-3">Offene Buchungsanfragen — annehmen oder ablehnen</p>
          <div className="space-y-2">
            {pending.map(b => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 surface">
                {avatarEl(b.child)}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary-900">{b.child.firstName} {b.child.lastName}</p>
                  <p className="text-sm text-secondary-500">
                    {fmtRange(b)} · {b.weekdays.map(w => WEEKDAYS[w]).join(', ')} · {DAY_TYPE_LABELS[b.dayType]}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => review(b.id, 'APPROVED')} disabled={actionLoading === b.id}
                    className="btn btn-primary btn-sm">{actionLoading === b.id ? '⏳' : '✓ Annehmen'}</button>
                  <button onClick={() => review(b.id, 'REJECTED')} disabled={actionLoading === b.id}
                    className="btn btn-secondary btn-sm text-red-700">✕ Ablehnen</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* B) Belegung pro Standort */}
      {expected.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="text-lg text-secondary-500">Keine akzeptierten Buchungen für {selected.toLocaleDateString('de-CH')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(groups.entries()).map(([key, items]) => {
            const name = key === '__none__' ? 'Ohne Standort' : locName(key);
            const cap = key === '__none__' ? null : locations.find(l => l.id === key)?.capacity;

            // Kinder gelten standardmäßig als anwesend. „Abgang" markiert die Abholung.
            // Abgemeldet (krank/abwesend) eigene Zone. Sonst Anwesend / Abgeholt.
            const isAbsent = (b: Booking) => !!noticeByChild(b.childId)?.absent;
            const abgemeldet = items.filter(b => isAbsent(b));
            const present = items.filter(b => !isAbsent(b) && !attByChild(b.childId)?.checkOutTime);
            const absent = items.filter(b => !isAbsent(b) && attByChild(b.childId)?.checkOutTime);

            const renderCard = (b: Booking) => {
              const att = attByChild(b.childId);
              const checkedOut = att?.checkOutTime;
              const n = noticeByChild(b.childId);
              const pickup = n?.pickupPerson || (b.child as any).defaultPickupPerson;
              return (
                <div key={b.childId} className="bg-white rounded-2xl border border-secondary-100 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {avatarEl(b.child)}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-secondary-900 truncate">{b.child.firstName} {b.child.lastName}</p>
                      <span className="chip chip-primary mt-0.5">{DAY_TYPE_LABELS[b.dayType]}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => review(b.id, 'PENDING')}
                        disabled={actionLoading === b.id}
                        title="Annahme rückgängig machen"
                        className="btn-icon w-7 h-7 text-secondary-400 hover:bg-yellow-50 hover:text-yellow-700">↩</button>
                    </div>
                  </div>
                  {/* T9/T10: Eltern-Tagesmeldungen */}
                  {n && (n.absent || n.earlyPickup || pickup) && (
                    <div className="flex flex-wrap gap-1.5">
                      {n.absent && <span className="chip chip-warning">🤒 Abgemeldet{n.reason ? `: ${n.reason}` : ''}</span>}
                      {n.earlyPickup && <span className="chip chip-accent">⏰ Früher abholen{n.pickupTime ? ` ${n.pickupTime}` : ''}</span>}
                      {pickup && <span className="chip chip-neutral">👤 Abholung: {pickup}</span>}
                    </div>
                  )}
                  {!n && pickup && (
                    <div className="flex flex-wrap gap-1.5"><span className="chip chip-neutral">👤 Abholung: {pickup}</span></div>
                  )}
                  {!isAbsent(b) && (
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="text-secondary-500 min-w-0 truncate">
                        {checkedOut ? `Abgang ${fmtTime(att!.checkOutTime)}` : 'Anwesend'}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        {!checkedOut ? (
                          <button onClick={() => attendanceAction(b.childId, 'checkout')}
                            disabled={actionLoading === b.childId + 'checkout'}
                            className="btn btn-primary btn-sm">🚪 Abgang</button>
                        ) : (
                          <button onClick={() => undoAttendance(b.childId, 'checkout')}
                            disabled={actionLoading === b.childId + 'undocheckout'}
                            title="Abholung rückgängig" className="btn btn-secondary btn-sm">↩ Abgang rückgängig</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div key={key} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-secondary-900 flex items-center gap-2">
                    📍 {name}
                  </h3>
                  <span className="chip chip-neutral">
                    {present.length} anwesend{abgemeldet.length ? ` · ${abgemeldet.length} abgemeldet` : ''} · {items.length}{cap ? ` / ${cap}` : ''} erwartet
                  </span>
                </div>

                {/* Zone: Abgemeldet / krank (T9) */}
                {abgemeldet.length > 0 && (
                  <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-3 mb-3">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <p className="font-semibold text-yellow-800 text-sm">🤒 Abgemeldet / krank</p>
                      <span className="chip chip-warning">{abgemeldet.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {abgemeldet.map(renderCard)}
                    </div>
                  </div>
                )}

                {/* Zone: Anwesend (oben) */}
                <div className="rounded-2xl bg-primary-50/60 border border-primary-100 p-3 mb-3">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                    <p className="font-semibold text-primary-800 text-sm">✅ Anwesend</p>
                    <span className="chip chip-success">{present.length}</span>
                  </div>
                  {present.length === 0 ? (
                    <p className="text-sm text-secondary-400 text-center py-3">Alle Kinder wurden abgeholt 👋</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {present.map(renderCard)}
                    </div>
                  )}
                </div>

                {/* Zone: Abgeholt (unten) */}
                <div className="rounded-2xl bg-secondary-50 border border-secondary-100 p-3">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-300" />
                    <p className="font-semibold text-secondary-600 text-sm">👋 Abgeholt</p>
                    <span className="chip chip-neutral">{absent.length}</span>
                  </div>
                  {absent.length === 0 ? (
                    <p className="text-sm text-secondary-400 text-center py-3">Noch niemand abgeholt</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {absent.map(renderCard)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
