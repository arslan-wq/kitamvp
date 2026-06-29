'use client';

import { useMemo, useState } from 'react';
import WeekdayPartsPicker, { type DayParts } from '@/components/WeekdayPartsPicker';
import { weekOccupancyPercent, monthlyAmount, fullMonthRate } from '@/lib/occupancy';

// T3: Admin bearbeitet die gewünschten Betreuungstage eines Kindes,
// sieht die Belegung in % (100% gedeckt oder nicht) und den Monatsbetrag.
export default function DesiredCareDaysEditor({
  childId,
  locationName,
  birthDate,
  initial,
}: {
  childId: string;
  locationName?: string | null;
  birthDate: string;
  initial?: DayParts | null;
}) {
  const [dcd, setDcd] = useState<DayParts>(initial || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const pct = useMemo(() => weekOccupancyPercent(dcd), [dcd]);
  const full = pct >= 100;
  const rate = fullMonthRate(locationName, birthDate);
  const amount = monthlyAmount(pct, locationName, birthDate);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch(`/api/children/${childId}/desired-care-days`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desiredCareDays: dcd }),
      });
      if (res.ok) setMsg('✅ Gewünschte Betreuungstage gespeichert.');
      else { const d = await res.json().catch(() => ({})); setMsg(`❌ ${d.error || 'Speichern fehlgeschlagen'}`); }
    } catch { setMsg('❌ Speichern fehlgeschlagen'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h2 className="text-lg font-bold text-secondary-900">📅 Gewünschte Betreuungstage</h2>
          <p className="page-subtitle">Pro Wochentag die Tagesteile wählen. Vormittag 50 % · +Mittagessen 70 % · +Nachmittag 100 %.</p>
        </div>
        <div className="text-right">
          <span className={`chip ${full ? 'chip-success' : 'chip-warning'} text-base`}>
            {full ? '✓ 100 % gedeckt' : `${pct} % gedeckt`}
          </span>
          {!full && <p className="text-xs text-secondary-400 mt-1">Fehlen {Math.round((100 - pct) * 10) / 10} %</p>}
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <WeekdayPartsPicker value={dcd} onChange={setDcd} />

      {/* Belegung & Rechnungsbetrag */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="surface rounded-xl p-3">
          <p className="text-xs text-secondary-500">Belegung</p>
          <p className="text-xl font-bold text-secondary-900">{pct} %</p>
        </div>
        <div className="surface rounded-xl p-3">
          <p className="text-xs text-secondary-500">Tarif 100 % {locationName ? `· ${locationName}` : ''}</p>
          <p className="text-xl font-bold text-secondary-900">{rate != null ? `CHF ${rate.toLocaleString('de-CH')}` : '—'}</p>
        </div>
        <div className="surface rounded-xl p-3 bg-primary-50/60">
          <p className="text-xs text-secondary-500">Betrag / Monat</p>
          <p className="text-xl font-bold text-primary-700">{amount != null ? `CHF ${amount.toLocaleString('de-CH')}` : '—'}</p>
        </div>
      </div>
      {rate == null && (
        <p className="text-xs text-amber-600">⚠️ Standort nicht erkannt — bitte dem Kind einen Standort (Aesch / St. Johan / Breite) zuweisen, damit der Tarif greift.</p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="btn btn-primary px-6">{saving ? 'Speichert…' : '💾 Speichern'}</button>
      </div>
    </div>
  );
}
