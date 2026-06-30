'use client';

import { useEffect, useState, useCallback } from 'react';
import { extraDayCost, extraDayLabel } from '@/lib/occupancy';

interface Child { id: string; firstName: string; lastName: string; }
const PARTS = [{ k: 'VORMITTAG', l: 'Vormittag' }, { k: 'MITTAGESSEN', l: 'Mittagessen' }, { k: 'NACHMITTAG', l: 'Nachmittag' }];
const partLabel = (p: string) => PARTS.find(x => x.k === p)?.l || p;
const STATUS: Record<string, { l: string; cls: string }> = {
  REQUESTED: { l: 'Angefragt', cls: 'chip-warning' },
  APPROVED: { l: 'Bestätigt', cls: 'chip-success' },
  REJECTED: { l: 'Abgelehnt', cls: 'chip-neutral' },
  CANCELLED: { l: 'Storniert', cls: 'chip-neutral' },
};
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ParentExtraDaysPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [childId, setChildId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [parts, setParts] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/extra-days');
    if (res.ok) setList(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const cRes = await fetch('/api/parent/children');
      const cs = cRes.ok ? await cRes.json() : [];
      setChildren(cs); if (cs[0]) setChildId(cs[0].id);
      await load(); setLoading(false);
    })();
  }, [load]);

  const togglePart = (k: string) => setParts(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId || parts.length === 0) { setMsg('❌ Bitte Kind und mindestens einen Tagesteil wählen.'); return; }
    if (!consent) { setMsg('❌ Bitte die Bestätigung ankreuzen.'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/extra-days', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, date, parts }),
      });
      if (res.ok) { setMsg('✅ Zusatztag angefragt — die Kita prüft die Anfrage.'); setParts([]); setConsent(false); await load(); }
      else { const d = await res.json().catch(() => ({})); setMsg(`❌ ${typeof d.error === 'string' ? d.error : 'Senden fehlgeschlagen'}`); }
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Zusatztag entfernen?')) return;
    const res = await fetch(`/api/extra-days/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  };

  if (loading) return <div className="text-center py-12 text-secondary-500">Lädt…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Zusatztage</h1>
        <p className="page-subtitle">Zusätzlichen Betreuungstag anfragen.</p>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label label-required">Kind</label>
            <select className="input" value={childId} onChange={e => setChildId(e.target.value)}>
              {children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div><label className="label label-required">Datum</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required /></div>
        </div>

        <div>
          <label className="label label-required">Tagesteile</label>
          <div className="flex flex-wrap gap-2">
            {PARTS.map(p => {
              const active = parts.includes(p.k);
              return (
                <button key={p.k} type="button" onClick={() => togglePart(p.k)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200' : 'border-gray-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                  {active ? '✓ ' : ''}{p.l}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 surface rounded-xl cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="w-5 h-5 accent-primary-600 mt-0.5" />
          <span className="text-sm text-secondary-700">Ich nehme diesen Zusatztag zur Kenntnis und bestätige die Anfrage.</span>
        </label>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary px-6">{saving ? 'Sendet…' : 'Zusatztag anfragen'}</button>
        </div>
      </form>

      {list.length > 0 && (
        <div className="card p-6">
          <p className="eyebrow mb-3">Meine Zusatztage</p>
          <div className="space-y-2">
            {list.map(ed => {
              const st = STATUS[ed.status] || STATUS.REQUESTED;
              const pl = Array.isArray(ed.parts) ? ed.parts.map((p: string) => partLabel(p)).join(' + ') : '';
              const cost = extraDayCost(ed.parts);
              const approved = ed.status === 'APPROVED';
              return (
                <div key={ed.id} className="flex items-center justify-between gap-3 p-3 surface rounded-xl">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-secondary-900">{ed.child?.firstName} {ed.child?.lastName} · {new Date(ed.date).toLocaleDateString('de-CH')}</p>
                      <span className={`chip ${st.cls}`}>{st.l}</span>
                    </div>
                    {pl && <p className="text-xs text-secondary-500">{pl} · {extraDayLabel(ed.parts)} · CHF {cost}.–</p>}
                  </div>
                  {approved ? (
                    <span className="text-xs text-secondary-400 shrink-0" title="Bestätigte Zusatztage kann nur die Kita-Leitung entfernen">🔒 bestätigt</span>
                  ) : (
                    <button onClick={() => remove(ed.id)} className="btn-icon text-secondary-400 hover:bg-red-50 hover:text-red-600 shrink-0" title="Entfernen">🗑️</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
