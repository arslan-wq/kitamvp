'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import WeekdayPartsPicker, { dayPartsToWeekdays, dayPartsLabel, type DayParts } from '@/components/WeekdayPartsPicker';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

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
  const [children, setChildren] = useState<Child[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<{ childId: string; startDate: string; endDate: string; dayParts: DayParts }>({
    childId: '',
    startDate: '',
    endDate: '',
    dayParts: {},
  });

  const loadBookings = async () => {
    const res = await fetch('/api/bookings');
    if (res.ok) setBookings(await res.json());
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const childRes = await fetch('/api/parent/children');
        const childData = await childRes.json();
        const list = Array.isArray(childData) ? childData : [];
        setChildren(list);
        if (list.length > 0) setForm(f => ({ ...f, childId: list[0].id }));
        await loadBookings();
      } catch {
        setError('Daten konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    })();
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const weekdays = dayPartsToWeekdays(form.dayParts);
    if (!form.childId || !form.startDate || !form.endDate || weekdays.length === 0) {
      setError('Bitte Kind, Zeitraum und mindestens einen Tagesteil wählen.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: form.childId, startDate: form.startDate, endDate: form.endDate, weekdays, dayParts: form.dayParts }),
      });
      if (res.ok) {
        await loadBookings();
        setForm(f => ({ ...f, startDate: '', endDate: '' }));
      } else {
        setError('Buchung konnte nicht gespeichert werden.');
      }
    } catch {
      setError('Buchung konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
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

  if (loading) return <div className="text-center py-8">Lädt…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="eyebrow">Anwesenheit planen</p>
        <h1 className="page-title">🗓️ Betreuungstage buchen</h1>
        <p className="page-subtitle">
          Wählen Sie einen Zeitraum und die Wochentage, an denen Ihr Kind kommt. Das Team nimmt die Buchung an.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Buchungsformular */}
      <form onSubmit={submit} className="card p-6 sm:p-8">
        {/* Kind + Zeitraum */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="label label-required">👶 Kind</label>
            <select className="input" value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))} required>
              <option value="">— wählen —</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label label-required">Von</label>
            <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
          </div>
          <div>
            <label className="label label-required">Bis</label>
            <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
          </div>
        </div>

        {/* T16: Wochentag → Tagesteile (wiederholt sich wöchentlich) */}
        <div className="mb-6">
          <label className="label">Betreuungstage (Tagesteile je Wochentag)</label>
          <WeekdayPartsPicker value={form.dayParts} onChange={dp => setForm(f => ({ ...f, dayParts: dp }))} />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={submitting} className="btn btn-primary btn-lg px-8">
            {submitting ? 'Wird gesendet…' : '🗓️ Buchung anfragen'}
          </button>
        </div>
      </form>

      {/* Eigene Buchungen */}
      <div>
        <p className="eyebrow mb-3">Meine Buchungen</p>
        {bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗓️</div>
            <p className="text-secondary-500">Noch keine Buchungen angefragt</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map(b => {
              const st = STATUS_META[b.status] ?? STATUS_META.PENDING;
              const dt = DAY_TYPES.find(t => t.id === b.dayType);
              return (
                <div key={b.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-secondary-900">{childName(b)}</p>
                      <span className={`chip ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-secondary-500 mt-0.5">
                      {fmt(b.startDate)} – {fmt(b.endDate)} · {b.dayParts
                        ? b.weekdays.map(w => `${WEEKDAYS.find(d => d.v === w)?.label} (${dayPartsLabel(b.dayParts, w)})`).filter(Boolean).join(', ')
                        : `${b.weekdays.map(w => WEEKDAYS.find(d => d.v === w)?.label).filter(Boolean).join(', ')} · ${dt?.icon || ''} ${dt?.name || ''}`}
                    </p>
                  </div>
                  <button onClick={() => cancelBooking(b.id)}
                    className="btn-icon text-secondary-400 hover:bg-red-50 hover:text-red-600 shrink-0" title="Entfernen">
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
