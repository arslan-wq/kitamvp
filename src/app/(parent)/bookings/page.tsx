'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import WeekdayPartsPicker, { dayPartsToWeekdays, dayPartsLabel, type DayParts } from '@/components/WeekdayPartsPicker';
import BookingCalendar, { type DayMark, expandBookingDays } from '@/components/BookingCalendar';
import DayBookingModal from '@/components/DayBookingModal';

interface Child { id: string; firstName: string; lastName: string; }

interface Booking {
  id: string;
  childId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  dayType: string;
  dayParts?: Record<number, string[]> | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  child?: { firstName: string; lastName: string };
}

interface ExtraDay {
  id: string;
  childId: string;
  date: string;
  parts?: string[] | null;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  child?: { firstName: string; lastName: string };
}

const WEEKDAYS = [
  { v: 1, label: 'Mo' }, { v: 2, label: 'Di' }, { v: 3, label: 'Mi' },
  { v: 4, label: 'Do' }, { v: 5, label: 'Fr' }, { v: 6, label: 'Sa' }, { v: 0, label: 'So' },
];

const DAY_TYPES = [
  { id: 'FULL_DAY', name: 'Ganztags', icon: '☀️' },
  { id: 'MORNING_WITH_MEAL', name: 'Vormittag + Essen', icon: '🍽️' },
  { id: 'MORNING_NO_MEAL', name: 'Vormittag', icon: '🌅' },
  { id: 'AFTERNOON_WITH_MEAL', name: 'Nachmittag + Essen', icon: '🍲' },
  { id: 'AFTERNOON_NO_MEAL', name: 'Nachmittag', icon: '🌇' },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Ausstehend', cls: 'chip-warning' },
  APPROVED: { label: 'Akzeptiert', cls: 'chip-success' },
  REJECTED: { label: 'Abgelehnt', cls: 'chip-error' },
};

export default function ParentBookingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'kalender' | 'zeitleiste'>('kalender');
  const [children, setChildren] = useState<Child[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [extraDays, setExtraDays] = useState<ExtraDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showRange, setShowRange] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);

  const [form, setForm] = useState<{ childId: string; startDate: string; endDate: string; dayParts: DayParts }>({
    childId: '', startDate: '', endDate: '', dayParts: {},
  });

  const loadBookings = async () => {
    const res = await fetch('/api/bookings');
    if (res.ok) setBookings(await res.json());
  };
  const loadExtraDays = async () => {
    const res = await fetch('/api/extra-days');
    if (res.ok) { const d = await res.json(); setExtraDays(Array.isArray(d) ? d : []); }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const childRes = await fetch('/api/parent/children');
        const childData = await childRes.json();
        const list = Array.isArray(childData) ? childData : [];
        setChildren(list);
        if (list.length > 0) setForm(f => ({ ...f, childId: list[0].id }));
        await Promise.all([loadBookings(), loadExtraDays()]);
      } catch { setError('Daten konnten nicht geladen werden'); }
      finally { setLoading(false); }
    })();
  }, [status, router]);

  // Markierungen für den Kalender aus Buchungen + Zusatztagen
  const marks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    for (const b of bookings) {
      if (b.status === 'REJECTED') continue;
      const days = expandBookingDays(b, new Date(b.startDate.slice(0, 10)), new Date(b.endDate.slice(0, 10)));
      for (const k of days) {
        m[k] = m[k] || {};
        if (b.status === 'APPROVED') m[k].booked = true; else m[k].pending = true;
      }
    }
    for (const e of extraDays) {
      if (e.status === 'REJECTED') continue;
      const k = e.date.slice(0, 10);
      m[k] = m[k] || {};
      m[k].extra = true;
      if (e.status === 'APPROVED') m[k].booked = true; else m[k].pending = true;
    }
    return m;
  }, [bookings, extraDays]);

  // Was ist an einem bestimmten Tag bereits gebucht? (für Popup-Anzeige)
  const existingOnDay = (dateStr: string): string[] => {
    const out: string[] = [];
    const [yy, mm, dd] = dateStr.split('-').map(Number);
    const dow = new Date(yy, mm - 1, dd).getDay();
    for (const b of bookings) {
      if (b.status === 'REJECTED') continue;
      if (dateStr >= b.startDate.slice(0, 10) && dateStr <= b.endDate.slice(0, 10) && b.weekdays.includes(dow)) {
        const name = b.child ? `${b.child.firstName}` : (children.find(c => c.id === b.childId)?.firstName || 'Kind');
        out.push(`${name} · ${b.dayParts ? dayPartsLabel(b.dayParts, dow) : (DAY_TYPES.find(t => t.id === b.dayType)?.name || '')} (${STATUS_META[b.status].label})`);
      }
    }
    for (const e of extraDays) {
      if (e.status === 'REJECTED') continue;
      if (e.date.slice(0, 10) === dateStr) {
        const name = e.child ? `${e.child.firstName}` : (children.find(c => c.id === e.childId)?.firstName || 'Kind');
        out.push(`⭐ ${name} · Zusatztag (${e.status === 'APPROVED' ? 'Akzeptiert' : 'Ausstehend'})`);
      }
    }
    return out;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const weekdays = dayPartsToWeekdays(form.dayParts);
    if (!form.childId || !form.startDate || !form.endDate || weekdays.length === 0) {
      setError('Bitte Kind, Zeitraum und mindestens einen Tagesteil wählen.'); return;
    }
    if (form.endDate < form.startDate) { setError('Das Enddatum darf nicht vor dem Startdatum liegen.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: form.childId, startDate: form.startDate, endDate: form.endDate, weekdays, dayParts: form.dayParts }),
      });
      if (res.ok) { await loadBookings(); setForm(f => ({ ...f, startDate: '', endDate: '', dayParts: {} })); setShowRange(false); }
      else setError('Buchung konnte nicht gespeichert werden.');
    } catch { setError('Buchung konnte nicht gespeichert werden.'); }
    finally { setSubmitting(false); }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Diese Buchung wirklich entfernen?')) return;
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (res.ok) setBookings(bs => bs.filter(b => b.id !== id));
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString('de-CH');
  const childName = (b: Booking) =>
    b.child ? `${b.child.firstName} ${b.child.lastName}` :
    (() => { const c = children.find(c => c.id === b.childId); return c ? `${c.firstName} ${c.lastName}` : 'Kind'; })();

  // Zeitleiste: Buchungen + Zusatztage chronologisch
  const timeline = useMemo(() => {
    const items: { key: string; date: string; label: string; sub: string; status: string; extra?: boolean; id?: string; kind: 'booking' | 'extra' }[] = [];
    for (const b of bookings) {
      items.push({
        key: 'b' + b.id, date: b.startDate, id: b.id, kind: 'booking', status: b.status,
        label: childName(b),
        sub: `${fmt(b.startDate)} – ${fmt(b.endDate)} · ${b.dayParts
          ? b.weekdays.map(w => `${WEEKDAYS.find(d => d.v === w)?.label} (${dayPartsLabel(b.dayParts, w)})`).filter(Boolean).join(', ')
          : `${b.weekdays.map(w => WEEKDAYS.find(d => d.v === w)?.label).filter(Boolean).join(', ')}`}`,
      });
    }
    for (const e of extraDays) {
      const name = e.child ? `${e.child.firstName} ${e.child.lastName}` : (children.find(c => c.id === e.childId) ? `${children.find(c => c.id === e.childId)!.firstName}` : 'Kind');
      items.push({
        key: 'e' + e.id, date: e.date, kind: 'extra', extra: true, status: e.status === 'APPROVED' ? 'APPROVED' : e.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
        label: name, sub: `${fmt(e.date)} · Zusatztag${Array.isArray(e.parts) && e.parts.length ? ` · ${e.parts.map(p => ({ VORMITTAG: 'Vormittag', MITTAGESSEN: 'Mittagessen', NACHMITTAG: 'Nachmittag' } as any)[p] || p).join(' + ')}` : ''}`,
      });
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bookings, extraDays, children]);

  if (loading) return <div className="text-center py-8">Lädt…</div>;

  const tabs: { id: 'kalender' | 'zeitleiste'; label: string }[] = [
    { id: 'kalender', label: '📅 Kalender' },
    { id: 'zeitleiste', label: '📋 Zeitleiste' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="eyebrow">Anwesenheit planen</p>
        <h1 className="page-title">🗓️ Betreuungstage</h1>
        <p className="page-subtitle">Tippen Sie auf einen Tag, um eine Buchung anzufragen. Das Team nimmt sie an.</p>
      </div>

      {/* Dossier-Tabs */}
      <div className="flex gap-1 border-b border-secondary-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 -mb-px transition ${
              tab === t.id ? 'bg-white border-secondary-200 text-secondary-900' : 'bg-transparent border-transparent text-secondary-500 hover:text-secondary-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'kalender' ? (
        <div className="space-y-4">
          <BookingCalendar marks={marks} onDayClick={d => setModalDate(d)} />

          {/* Mehrtägige Buchung (erweitert) */}
          <div className="card p-4 sm:p-5">
            <button type="button" onClick={() => setShowRange(s => !s)} className="flex items-center justify-between w-full text-left">
              <span className="font-semibold text-secondary-900">📆 Mehrtägige / wiederkehrende Buchung</span>
              <span className="text-secondary-400">{showRange ? '▲' : '▼'}</span>
            </button>
            {showRange && (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label label-required">👶 Kind</label>
                    <select className="input" value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))} required>
                      <option value="">— wählen —</option>
                      {children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                  </div>
                  <div><label className="label label-required">Von</label><input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                  <div><label className="label label-required">Bis</label><input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
                </div>
                <div>
                  <label className="label">Betreuungstage (Tagesteile je Wochentag)</label>
                  <WeekdayPartsPicker value={form.dayParts} onChange={dp => setForm(f => ({ ...f, dayParts: dp }))} />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={submitting} className="btn btn-primary px-8">{submitting ? 'Wird gesendet…' : '🗓️ Buchung anfragen'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div>
          {timeline.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🗓️</div><p className="text-secondary-500">Noch keine Buchungen</p></div>
          ) : (
            <div className="relative pl-5 space-y-3">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-secondary-200" />
              {timeline.map(it => {
                const st = STATUS_META[it.status] ?? STATUS_META.PENDING;
                return (
                  <div key={it.key} className="relative">
                    <span className={`absolute -left-[14px] top-3 w-3 h-3 rounded-full border-2 border-white ${it.extra ? 'bg-amber-400' : it.status === 'APPROVED' ? 'bg-primary-500' : 'bg-secondary-300'}`} />
                    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {it.extra && <span>⭐</span>}
                          <p className="font-semibold text-secondary-900">{it.label}</p>
                          <span className={`chip ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-sm text-secondary-500 mt-0.5">{it.sub}</p>
                      </div>
                      {it.kind === 'booking' && it.id && (
                        <button onClick={() => cancelBooking(it.id!)} className="btn-icon text-secondary-400 hover:bg-red-50 hover:text-red-600 shrink-0" title="Entfernen">🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modalDate && (
        <DayBookingModal
          date={modalDate}
          childrenList={children}
          existing={existingOnDay(modalDate)}
          onClose={() => setModalDate(null)}
          onCreated={() => { loadBookings(); loadExtraDays(); }}
        />
      )}
    </div>
  );
}
