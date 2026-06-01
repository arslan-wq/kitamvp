'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

  const [form, setForm] = useState({
    childId: '',
    startDate: '',
    endDate: '',
    weekdays: [1, 2, 3, 4, 5] as number[],
    dayType: 'FULL_DAY',
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

  const toggleWeekday = (v: number) =>
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(v) ? f.weekdays.filter(d => d !== v) : [...f.weekdays, v],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.childId || !form.startDate || !form.endDate || form.weekdays.length === 0) {
      setError('Bitte Kind, Zeitraum und mindestens einen Wochentag wählen.');
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
        body: JSON.stringify(form),
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

        {/* Wochentage */}
        <div className="mb-6">
          <label className="label">Wochentage (wiederholt sich wöchentlich)</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(d => {
              const active = form.weekdays.includes(d.v);
              return (
                <button key={d.v} type="button" onClick={() => toggleWeekday(d.v)}
                  className={`w-12 h-12 rounded-xl border font-semibold transition-all ${
                    active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                           : 'border-gray-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tagestyp als Kacheln */}
        <div className="mb-6">
          <label className="label">Betreuungsart</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {DAY_TYPES.map(t => {
              const active = form.dayType === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, dayType: t.id }))}
                  className={`tile ${active ? 'tile-active' : ''}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <span className={`text-xs font-medium ${active ? 'text-primary-900' : 'text-secondary-600'}`}>{t.name}</span>
                </button>
              );
            })}
          </div>
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
                      {fmt(b.startDate)} – {fmt(b.endDate)} · {b.weekdays.map(w => WEEKDAYS.find(d => d.v === w)?.label).filter(Boolean).join(', ')} · {dt?.icon} {dt?.name}
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
