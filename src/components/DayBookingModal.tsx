'use client';

import { useState } from 'react';

const PARTS = [
  { k: 'VORMITTAG', l: 'Vormittag', icon: '🌅' },
  { k: 'MITTAGESSEN', l: 'Mittagessen', icon: '🍽️' },
  { k: 'NACHMITTAG', l: 'Nachmittag', icon: '🌇' },
];

interface ChildLite { id: string; firstName: string; lastName: string; }

// Tag-Buchungs-Popup: für den gewählten Tag Kind + Tagesteile wählen.
// Eltern → Anfrage (PENDING), Personal → bestätigt (APPROVED) — serverseitig.
export default function DayBookingModal({
  date,
  childrenList,
  existing = [],
  onClose,
  onCreated,
}: {
  date: string;
  childrenList: ChildLite[];
  existing?: string[]; // bereits an diesem Tag gebucht (Anzeige)
  onClose: () => void;
  onCreated: () => void;
}) {
  const [childId, setChildId] = useState(childrenList[0]?.id || '');
  const [parts, setParts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const togglePart = (k: string) =>
    setParts(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!childId) { setError('Bitte ein Kind wählen.'); return; }
    if (parts.length === 0) { setError('Bitte mindestens einen Tagesteil wählen.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          startDate: date,
          endDate: date,
          weekdays: [dow],
          dayParts: { [dow]: parts },
        }),
      });
      if (res.ok) { onCreated(); onClose(); }
      else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Buchung konnte nicht gespeichert werden.');
      }
    } catch {
      setError('Buchung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-elevated">
        <div>
          <p className="eyebrow">Neue Buchung</p>
          <h2 className="text-xl font-bold text-secondary-900 capitalize">{dateLabel}</h2>
        </div>

        {existing.length > 0 && (
          <div className="rounded-xl bg-secondary-50 border border-secondary-100 p-3 text-sm text-secondary-600">
            <span className="font-medium">Bereits an diesem Tag:</span>
            <ul className="mt-1 space-y-0.5">
              {existing.map((x, i) => <li key={i}>• {x}</li>)}
            </ul>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {childrenList.length > 1 && (
          <div>
            <label className="label label-required">👶 Kind</label>
            <select className="input" value={childId} onChange={e => setChildId(e.target.value)} required>
              {childrenList.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label label-required">Tagesteile</label>
          <div className="grid grid-cols-3 gap-2">
            {PARTS.map(p => {
              const active = parts.includes(p.k);
              return (
                <button key={p.k} type="button" onClick={() => togglePart(p.k)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-sm font-medium transition ${active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200' : 'border-secondary-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                  <span className="text-xl">{p.icon}</span>
                  {p.l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Abbrechen</button>
          <button type="submit" disabled={saving} className="btn btn-primary px-6">{saving ? 'Speichert…' : '🗓️ Buchen'}</button>
        </div>
      </form>
    </div>
  );
}
