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
  child: { id: string; firstName: string; lastName: string; locationId: string | null };
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
  const [children, setChildren] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Schnell-Buchung durch Personal
  const [showAdd, setShowAdd] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    childId: '',
    startDate: '',
    endDate: '',
    weekdays: [] as number[],
    dayType: 'FULL_DAY',
  });

  const fetchBookings = useCallback(async () => {
    const res = await fetch('/api/bookings');
    if (res.ok) setBookings(await res.json());
  }, []);

  const fetchAttendance = useCallback(async (d: string) => {
    const res = await fetch(`/api/attendance?date=${d}`);
    if (res.ok) setAttendance(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [, , locRes, childRes] = await Promise.all([
          fetchBookings(),
          fetchAttendance(date),
          fetch('/api/locations'),
          fetch('/api/children'),
        ]);
        if (locRes.ok) setLocations(await locRes.json());
        if (childRes.ok) setChildren(await childRes.json());
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
  }, [date, fetchAttendance]);

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

  // Formular öffnen, vorbelegt mit dem aktuell gewählten Tag
  const openAdd = () => {
    const [y, m, d] = date.split('-').map(Number);
    setAddForm({
      childId: children[0]?.id || '',
      startDate: date,
      endDate: date,
      weekdays: [new Date(y, m - 1, d).getDay()],
      dayType: 'FULL_DAY',
    });
    setShowAdd(true);
  };

  const toggleAddWeekday = (v: number) =>
    setAddForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(v) ? f.weekdays.filter(d => d !== v) : [...f.weekdays, v],
    }));

  const createBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!addForm.childId || !addForm.startDate || !addForm.endDate || addForm.weekdays.length === 0) {
      setError('Bitte Kind, Zeitraum und mindestens einen Wochentag wählen.');
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        await fetchBookings();
        setShowAdd(false);
      } else {
        setError('Buchung konnte nicht erstellt werden.');
      }
    } finally {
      setAddSubmitting(false);
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
          {!showAdd && (
            <button onClick={openAdd} className="btn btn-primary whitespace-nowrap" disabled={children.length === 0}>
              + Kind hinzufügen
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Schnell-Buchung durch Personal (sofort akzeptiert) */}
      {showAdd && (
        <form onSubmit={createBooking} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="eyebrow">Kind zur Belegung hinzufügen — sofort akzeptiert</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label label-required">👶 Kind</label>
              <select className="input" value={addForm.childId}
                onChange={e => setAddForm(f => ({ ...f, childId: e.target.value }))} required>
                <option value="">— wählen —</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="label label-required">Von</label>
              <input type="date" className="input" value={addForm.startDate}
                onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div>
              <label className="label label-required">Bis</label>
              <input type="date" className="input" value={addForm.endDate}
                onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Wochentage</label>
              <div className="flex flex-wrap gap-1.5">
                {[{ v: 1, l: 'Mo' }, { v: 2, l: 'Di' }, { v: 3, l: 'Mi' }, { v: 4, l: 'Do' }, { v: 5, l: 'Fr' }, { v: 6, l: 'Sa' }, { v: 0, l: 'So' }].map(d => {
                  const active = addForm.weekdays.includes(d.v);
                  return (
                    <button key={d.v} type="button" onClick={() => toggleAddWeekday(d.v)}
                      className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-all ${
                        active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                               : 'border-gray-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                      {d.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Betreuungsart</label>
              <select className="input" value={addForm.dayType}
                onChange={e => setAddForm(f => ({ ...f, dayType: e.target.value }))}>
                {Object.entries(DAY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">Abbrechen</button>
            <button type="submit" disabled={addSubmitting} className="btn btn-primary px-6">
              {addSubmitting ? 'Wird erstellt…' : '✓ Hinzufügen'}
            </button>
          </div>
        </form>
      )}

      {/* Übersicht */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><p className="stat-value text-secondary-900">{expected.length}</p><p className="stat-label">Erwartet am {WEEKDAYS[dow]}.</p></div>
        <div className="stat-card"><p className="stat-value text-primary-600">{attendance.filter(a => a.checkInTime && !a.checkOutTime).length}</p><p className="stat-label">✅ Anwesend</p></div>
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
                <div className="avatar avatar-md">{initials(b.child.firstName, b.child.lastName)}</div>
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
            return (
              <div key={key} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-secondary-900 flex items-center gap-2">
                    📍 {name}
                  </h3>
                  <span className="chip chip-neutral">
                    {items.length}{cap ? ` / ${cap}` : ''} Kinder
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map(b => {
                    const att = attByChild(b.childId);
                    const checkedIn = att?.checkInTime && !att?.checkOutTime;
                    const checkedOut = att?.checkOutTime;
                    return (
                      <div key={b.childId} className="surface p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="avatar avatar-md">{initials(b.child.firstName, b.child.lastName)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-secondary-900 truncate">{b.child.firstName} {b.child.lastName}</p>
                            <span className="chip chip-primary mt-0.5">{DAY_TYPE_LABELS[b.dayType]}</span>
                          </div>
                          {/* Akzeptiert-Chip mit Rückgängig */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="chip chip-success">Akzeptiert</span>
                            <button onClick={() => review(b.id, 'PENDING')}
                              disabled={actionLoading === b.id}
                              title="Annahme rückgängig machen"
                              className="btn-icon w-7 h-7 text-secondary-400 hover:bg-yellow-50 hover:text-yellow-700">↩</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-secondary-500 min-w-0 truncate">
                            {att?.checkInTime ? `Ankunft ${fmtTime(att.checkInTime)}` : 'Noch nicht angekommen'}
                            {checkedOut ? ` · Abgang ${fmtTime(att.checkOutTime)}` : ''}
                          </span>
                          <div className="flex gap-1.5 shrink-0">
                            {!att?.checkInTime && (
                              <button onClick={() => attendanceAction(b.childId, 'checkin')}
                                disabled={actionLoading === b.childId + 'checkin'}
                                className="btn btn-primary btn-sm">✅ Ankunft</button>
                            )}
                            {checkedIn && (
                              <>
                                <button onClick={() => undoAttendance(b.childId, 'checkin')}
                                  disabled={actionLoading === b.childId + 'undocheckin'}
                                  title="Ankunft rückgängig" className="btn btn-secondary btn-sm">↩</button>
                                <button onClick={() => attendanceAction(b.childId, 'checkout')}
                                  disabled={actionLoading === b.childId + 'checkout'}
                                  className="btn btn-secondary btn-sm">🚪 Abgang</button>
                              </>
                            )}
                            {checkedOut && (
                              <button onClick={() => undoAttendance(b.childId, 'checkout')}
                                disabled={actionLoading === b.childId + 'undocheckout'}
                                title="Abholung rückgängig" className="btn btn-secondary btn-sm">↩ Abgang</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
