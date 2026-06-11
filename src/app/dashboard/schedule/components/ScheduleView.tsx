'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { dayPartsLabel } from '@/components/WeekdayPartsPicker';
import BookingCalendar, { type DayMark, expandBookingDays } from '@/components/BookingCalendar';
import DayBookingModal from '@/components/DayBookingModal';

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
  dayParts?: Record<number, string[]> | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isExtraDay?: boolean;
  notes?: string;
  child: { id: string; firstName: string; lastName: string; locationId: string | null; photoUrl?: string | null; defaultPickupPerson?: string | null };
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

  // T8: Personal legt Zusatztag an
  const [children, setChildren] = useState<{ id: string; firstName: string; lastName: string; locationId?: string | null }[]>([]);
  const [edOpen, setEdOpen] = useState(false);
  const [edForm, setEdForm] = useState<{ locationId: string; childId: string; date: string; parts: string[] }>({ locationId: '', childId: '', date, parts: [] });
  const [edSaving, setEdSaving] = useState(false);
  const ED_PARTS = [{ k: 'VORMITTAG', l: 'Vormittag' }, { k: 'MITTAGESSEN', l: 'Mittagessen' }, { k: 'NACHMITTAG', l: 'Nachmittag' }];

  // T3: Tabs (Kanban / Kalender), Zoom-Stufe, Kalender-Tag-Popup
  const [tab, setTab] = useState<'kanban' | 'kalender'>('kanban');
  const [zoom, setZoom] = useState<number | null>(null); // null = automatisch
  const [calModalDate, setCalModalDate] = useState<string | null>(null);

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

  const [extraDays, setExtraDays] = useState<any[]>([]); // T8 Zusatztage (gewählter Tag)
  const fetchExtraDays = useCallback(async (d: string) => {
    const res = await fetch(`/api/extra-days?date=${d}`);
    if (res.ok) setExtraDays(await res.json());
  }, []);

  // T3: alle Zusatztage für die Kalender-Markierungen
  const [calExtra, setCalExtra] = useState<any[]>([]);
  const fetchCalExtra = useCallback(async () => {
    const res = await fetch('/api/extra-days');
    if (res.ok) { const d = await res.json(); setCalExtra(Array.isArray(d) ? d : []); }
  }, []);
  const reviewExtraDay = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading('ed' + id);
    try {
      const res = await fetch(`/api/extra-days/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) { await fetchExtraDays(date); fetchCalExtra(); } else setError('Aktion fehlgeschlagen');
    } finally { setActionLoading(null); }
  };
  const openExtraDay = () => { setEdForm({ locationId: locations[0]?.id || '', childId: '', date, parts: [] }); setEdOpen(true); };
  const edChildren = children.filter(c => !edForm.locationId || (c.locationId || '') === edForm.locationId);
  const submitExtraDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edForm.childId || edForm.parts.length === 0) { setError('Bitte Kind und mindestens einen Tagesteil wählen.'); return; }
    setEdSaving(true); setError('');
    try {
      const res = await fetch('/api/extra-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: edForm.childId, date: edForm.date, parts: edForm.parts }) });
      if (res.ok) { setEdOpen(false); await fetchExtraDays(date); fetchCalExtra(); }
      else setError('Zusatztag konnte nicht angelegt werden');
    } finally { setEdSaving(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [, , locRes, chRes] = await Promise.all([
          fetchBookings(),
          fetchAttendance(date),
          fetch('/api/locations'),
          fetch('/api/children'),
        ]);
        if (locRes.ok) setLocations(await locRes.json());
        if (chRes.ok) setChildren(await chRes.json());
        fetchNotices(date);
        fetchExtraDays(date);
        fetchCalExtra();
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
    fetchExtraDays(date);
  }, [date, fetchAttendance, fetchNotices, fetchExtraDays]);

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

  // T3: Kalender-Markierungen aus allen Buchungen + Zusatztagen
  const calMarks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    for (const b of bookings) {
      if (b.status === 'REJECTED') continue;
      const days = expandBookingDays(b as any, new Date(b.startDate.slice(0, 10)), new Date(b.endDate.slice(0, 10)));
      for (const k of days) {
        m[k] = m[k] || { count: 0 };
        m[k].count = (m[k].count || 0) + 1;
        if (b.status === 'APPROVED') m[k].booked = true; else m[k].pending = true;
      }
    }
    for (const e of calExtra) {
      if (e.status === 'REJECTED') continue;
      const k = e.date.slice(0, 10);
      m[k] = m[k] || { count: 0 };
      m[k].count = (m[k].count || 0) + 1;
      m[k].extra = true;
      if (e.status === 'APPROVED') m[k].booked = true; else m[k].pending = true;
    }
    return m;
  }, [bookings, calExtra]);

  const calExistingOnDay = (dateStr: string): string[] => {
    const out: string[] = [];
    const [yy2, mm2, dd2] = dateStr.split('-').map(Number);
    const dw = new Date(yy2, mm2 - 1, dd2).getDay();
    for (const b of bookings) {
      if (b.status === 'REJECTED') continue;
      if (dateStr >= b.startDate.slice(0, 10) && dateStr <= b.endDate.slice(0, 10) && b.weekdays.includes(dw)) {
        out.push(`${b.child.firstName} ${b.child.lastName} (${b.status === 'APPROVED' ? 'bestätigt' : 'offen'})`);
      }
    }
    for (const e of calExtra) {
      if (e.status === 'REJECTED') continue;
      if (e.date.slice(0, 10) === dateStr) out.push(`⭐ ${e.child?.firstName ?? ''} ${e.child?.lastName ?? ''} · Zusatztag`);
    }
    return out;
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
  // T8: bestätigte Zusatztage des Tages als erwartete Kinder ergänzen
  const extraRequests = extraDays.filter(e => e.status === 'REQUESTED');
  for (const e of extraDays.filter(e => e.status === 'APPROVED')) {
    const existing = expectedMap.get(e.childId);
    if (existing) {
      // T2-Fix: bereits via Buchung erwartet → trotzdem als Zusatztag markieren (Stern)
      (existing as any).isExtraDay = true;
      continue;
    }
    expectedMap.set(e.childId, {
      id: 'ed-' + e.id, childId: e.childId, startDate: e.date, endDate: e.date,
      weekdays: [dow], dayType: 'FULL_DAY', dayParts: e.parts ? { [dow]: e.parts } : null,
      status: 'APPROVED', child: e.child, isExtraDay: true,
    } as any);
  }
  const expected = Array.from(expectedMap.values());

  // T3: Dynamische Container-Dichte — bei vielen Kindern automatisch verkleinern,
  // per Zoom-Button überstimmbar (0 = groß, 1 = mittel, 2 = klein).
  const autoLevel = expected.length > 24 ? 2 : expected.length > 12 ? 1 : 0;
  const level = zoom ?? autoLevel;
  const gridCls = ['grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'][level];
  const cardPad = ['p-4', 'p-3', 'p-2'][level];
  const compact = level >= 2;

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
        {tab === 'kanban' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-secondary-500 whitespace-nowrap">Tag:</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input max-w-[180px]" />
            <button onClick={openExtraDay} className="btn btn-primary whitespace-nowrap" disabled={children.length === 0}>+ Zusatztag</button>
          </div>
        )}
      </div>

      {/* T3: Dossier-Tabs Kanban / Kalender */}
      <div className="flex gap-1 border-b border-secondary-200">
        {([{ id: 'kanban', label: '🗂️ Kanban' }, { id: 'kalender', label: '📅 Kalender' }] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 -mb-px transition ${
              tab === t.id ? 'bg-white border-secondary-200 text-secondary-900' : 'bg-transparent border-transparent text-secondary-500 hover:text-secondary-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* T3: Kalender-Ansicht */}
      {tab === 'kalender' && (
        <div className="space-y-2">
          <p className="text-sm text-secondary-500">Tippen Sie auf einen Tag, um eine Buchung anzulegen. ⭐ = Zusatztag · Zahl = erwartete Kinder.</p>
          <BookingCalendar marks={calMarks} onDayClick={d => setCalModalDate(d)} />
        </div>
      )}

      {/* T3: Kanban-Ansicht */}
      {tab === 'kanban' && (<>
      {/* Zoom-Steuerung */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-secondary-500">Ansicht:</span>
        <div className="flex items-center gap-1 bg-secondary-100 rounded-xl p-1">
          <button onClick={() => setZoom(Math.min(2, level + 1))} disabled={level >= 2} title="Verkleinern"
            className="btn-icon w-8 h-8 text-secondary-600 hover:bg-white disabled:opacity-40">🔍−</button>
          <button onClick={() => setZoom(null)} title="Automatisch"
            className={`px-2.5 h-8 rounded-lg text-xs font-medium ${zoom === null ? 'bg-white text-primary-700' : 'text-secondary-500 hover:bg-white'}`}>Auto</button>
          <button onClick={() => setZoom(Math.max(0, level - 1))} disabled={level <= 0} title="Vergrössern"
            className="btn-icon w-8 h-8 text-secondary-600 hover:bg-white disabled:opacity-40">🔍+</button>
        </div>
      </div>

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
                    {fmtRange(b)} · {b.dayParts
                      ? b.weekdays.map(w => `${WEEKDAYS[w]} (${dayPartsLabel(b.dayParts, w)})`).join(', ')
                      : `${b.weekdays.map(w => WEEKDAYS[w]).join(', ')} · ${DAY_TYPE_LABELS[b.dayType]}`}
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

      {/* A2) Zusatztag-Anfragen (T8) */}
      {extraRequests.length > 0 && (
        <div className="card p-6">
          <p className="eyebrow mb-3">⭐ Zusatztag-Anfragen — annehmen oder ablehnen</p>
          <div className="space-y-2">
            {extraRequests.map(e => (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 surface">
                {avatarEl(e.child)}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary-900">{e.child.firstName} {e.child.lastName}</p>
                  <p className="text-sm text-secondary-500">
                    {new Date(e.date).toLocaleDateString('de-CH')}{Array.isArray(e.parts) && e.parts.length ? ` · ${e.parts.map((p: string) => ({ VORMITTAG: 'Vormittag', MITTAGESSEN: 'Mittagessen', NACHMITTAG: 'Nachmittag' } as any)[p] || p).join(' + ')}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => reviewExtraDay(e.id, 'APPROVED')} disabled={actionLoading === 'ed' + e.id}
                    className="btn btn-primary btn-sm">{actionLoading === 'ed' + e.id ? '⏳' : '✓ Annehmen'}</button>
                  <button onClick={() => reviewExtraDay(e.id, 'REJECTED')} disabled={actionLoading === 'ed' + e.id}
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
                <div key={b.childId} className={`bg-white rounded-2xl border border-secondary-100 ${cardPad} flex flex-col ${compact ? 'gap-1.5' : 'gap-3'}`}>
                  <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
                    {avatarEl(b.child)}
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-secondary-900 truncate ${compact ? 'text-sm' : ''}`}>{b.child.firstName} {compact ? b.child.lastName.charAt(0) + '.' : b.child.lastName}</p>
                      {!compact && <span className="chip chip-primary mt-0.5">{(b.dayParts && dayPartsLabel(b.dayParts, dow)) || DAY_TYPE_LABELS[b.dayType]}</span>}
                      {b.isExtraDay && <span className={`chip chip-accent mt-0.5 ${compact ? '' : 'ml-1'}`}>⭐{compact ? '' : ' Zusatztag'}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!b.isExtraDay && !compact && (
                        <button onClick={() => review(b.id, 'PENDING')}
                          disabled={actionLoading === b.id}
                          title="Annahme rückgängig machen"
                          className="btn-icon w-7 h-7 text-secondary-400 hover:bg-yellow-50 hover:text-yellow-700">↩</button>
                      )}
                    </div>
                  </div>
                  {/* T9/T10: Eltern-Tagesmeldungen (in kompakter Ansicht ausgeblendet) */}
                  {!compact && n && (n.absent || n.earlyPickup || pickup) && (
                    <div className="flex flex-wrap gap-1.5">
                      {n.absent && <span className="chip chip-warning">🤒 Abgemeldet{n.reason ? `: ${n.reason}` : ''}</span>}
                      {n.earlyPickup && <span className="chip chip-accent">⏰ Früher abholen{n.pickupTime ? ` ${n.pickupTime}` : ''}</span>}
                      {pickup && <span className="chip chip-neutral">👤 Abholung: {pickup}</span>}
                    </div>
                  )}
                  {!compact && !n && pickup && (
                    <div className="flex flex-wrap gap-1.5"><span className="chip chip-neutral">👤 Abholung: {pickup}</span></div>
                  )}
                  {!isAbsent(b) && (
                    <div className="flex items-center justify-between text-sm gap-2">
                      {!compact && (
                        <span className="text-secondary-500 min-w-0 truncate">
                          {checkedOut ? `Abgang ${fmtTime(att!.checkOutTime)}` : 'Anwesend'}
                        </span>
                      )}
                      <div className="flex gap-1.5 shrink-0 ml-auto">
                        {!checkedOut ? (
                          <button onClick={() => attendanceAction(b.childId, 'checkout')}
                            disabled={actionLoading === b.childId + 'checkout'}
                            className="btn btn-primary btn-sm" title="Abgang">🚪{compact ? '' : ' Abgang'}</button>
                        ) : (
                          <button onClick={() => undoAttendance(b.childId, 'checkout')}
                            disabled={actionLoading === b.childId + 'undocheckout'}
                            title="Abholung rückgängig" className="btn btn-secondary btn-sm">↩{compact ? '' : ' Abgang rückgängig'}</button>
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
                    <div className={`grid ${gridCls} ${compact ? "gap-2" : "gap-3"}`}>
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
                    <div className={`grid ${gridCls} ${compact ? "gap-2" : "gap-3"}`}>
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
                    <div className={`grid ${gridCls} ${compact ? "gap-2" : "gap-3"}`}>
                      {absent.map(renderCard)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}

      {/* T3: Kalender-Tag → Buchung für ein Kind anlegen (Personal) */}
      {calModalDate && (
        <DayBookingModal
          date={calModalDate}
          childrenList={children}
          existing={calExistingOnDay(calModalDate)}
          onClose={() => setCalModalDate(null)}
          onCreated={() => { fetchBookings(); fetchCalExtra(); }}
        />
      )}

      {/* T8: Zusatztag anlegen (Personal) */}
      {edOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEdOpen(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={submitExtraDay} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-elevated">
            <h2 className="text-xl font-bold text-secondary-900">⭐ Zusatztag anlegen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label label-required">📍 Standort</label>
                <select className="input" value={edForm.locationId} onChange={e => setEdForm(f => ({ ...f, locationId: e.target.value, childId: '' }))}>
                  <option value="">Alle Standorte</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label className="label label-required">Datum</label><input type="date" className="input" value={edForm.date} onChange={e => setEdForm(f => ({ ...f, date: e.target.value }))} required /></div>
            </div>
            <div><label className="label label-required">Kind</label>
              <select className="input" value={edForm.childId} onChange={e => setEdForm(f => ({ ...f, childId: e.target.value }))} required>
                <option value="">— wählen —</option>
                {edChildren.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div><label className="label label-required">Tagesteile</label>
              <div className="flex flex-wrap gap-2">
                {ED_PARTS.map(p => {
                  const active = edForm.parts.includes(p.k);
                  return (
                    <button key={p.k} type="button" onClick={() => setEdForm(f => ({ ...f, parts: active ? f.parts.filter(x => x !== p.k) : [...f.parts, p.k] }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200' : 'border-gray-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                      {active ? '✓ ' : ''}{p.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEdOpen(false)} className="btn btn-secondary">Abbrechen</button>
              <button type="submit" disabled={edSaving} className="btn btn-primary px-6">{edSaving ? 'Speichert…' : 'Zusatztag anlegen'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
