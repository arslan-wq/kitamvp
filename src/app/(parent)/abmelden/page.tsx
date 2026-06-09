'use client';

import { useEffect, useState, useCallback } from 'react';

interface Child { id: string; firstName: string; lastName: string; defaultPickupPerson?: string | null; }

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ParentAbmeldenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [childId, setChildId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [absent, setAbsent] = useState(false);
  const [reason, setReason] = useState('');
  const [earlyPickup, setEarlyPickup] = useState(false);
  const [pickupTime, setPickupTime] = useState('');
  const [pickupPerson, setPickupPerson] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const loadNotices = useCallback(async () => {
    const res = await fetch('/api/day-notices');
    if (res.ok) setNotices(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const cRes = await fetch('/api/parent/children');
      const cs = cRes.ok ? await cRes.json() : [];
      setChildren(cs);
      if (cs[0]) { setChildId(cs[0].id); setPickupPerson(cs[0].defaultPickupPerson || ''); }
      await loadNotices();
      setLoading(false);
    })();
  }, [loadNotices]);

  // Standard-Abholperson beim Kindwechsel vorbelegen
  const onChildChange = (id: string) => {
    setChildId(id);
    const c = children.find(x => x.id === id);
    setPickupPerson(c?.defaultPickupPerson || '');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) return;
    if (!absent && !earlyPickup && !pickupPerson.trim()) { setMsg('❌ Bitte mindestens „Abwesend", „Früher abholen" oder eine Abholperson angeben.'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/day-notices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, date, absent, reason: reason || undefined, earlyPickup, pickupTime: pickupTime || undefined, pickupPerson: pickupPerson || undefined, saveAsDefault }),
      });
      if (res.ok) {
        setMsg('✅ Gemeldet — die Kita ist informiert.');
        setAbsent(false); setReason(''); setEarlyPickup(false); setPickupTime('');
        await loadNotices();
      } else { const d = await res.json().catch(() => ({})); setMsg(`❌ ${d.error || 'Senden fehlgeschlagen'}`); }
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Meldung wirklich entfernen?')) return;
    const res = await fetch(`/api/day-notices/${id}`, { method: 'DELETE' });
    if (res.ok) await loadNotices();
  };

  if (loading) return <div className="text-center py-12 text-secondary-500">Lädt…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Abwesenheit & Abholung</h1>
        <p className="page-subtitle">Kind krank/abwesend melden oder eine frühere Abholung mitteilen.</p>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label label-required">Kind</label>
            <select className="input" value={childId} onChange={e => onChildChange(e.target.value)}>
              {children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div><label className="label label-required">Datum</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required /></div>
        </div>

        {/* Abwesend / krank */}
        <label className="flex items-start gap-3 p-3 surface rounded-xl cursor-pointer">
          <input type="checkbox" checked={absent} onChange={e => setAbsent(e.target.checked)} className="w-5 h-5 accent-primary-600 mt-0.5" />
          <span className="flex-1">
            <span className="font-medium text-secondary-900">🤒 Kind ist abwesend / krank</span>
            {absent && <input className="input mt-2" placeholder="Grund/Notiz (z.B. Fieber)" value={reason} onChange={e => setReason(e.target.value)} />}
          </span>
        </label>

        {/* Früher abholen */}
        <label className="flex items-start gap-3 p-3 surface rounded-xl cursor-pointer">
          <input type="checkbox" checked={earlyPickup} onChange={e => setEarlyPickup(e.target.checked)} className="w-5 h-5 accent-primary-600 mt-0.5" />
          <span className="flex-1">
            <span className="font-medium text-secondary-900">⏰ Ich hole das Kind früher ab</span>
            {earlyPickup && <input type="time" className="input mt-2 max-w-[10rem]" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />}
          </span>
        </label>

        {/* Abholperson */}
        <div>
          <label className="label">👤 Wer holt das Kind ab?</label>
          <input className="input" placeholder="Name der abholenden Person" value={pickupPerson} onChange={e => setPickupPerson(e.target.value)} />
          <label className="flex items-center gap-2 mt-2 text-sm text-secondary-600 cursor-pointer">
            <input type="checkbox" checked={saveAsDefault} onChange={e => setSaveAsDefault(e.target.checked)} className="w-4 h-4 accent-primary-600" />
            Als Standard-Abholperson speichern (wird künftig vorbelegt)
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary px-6">{saving ? 'Sendet…' : 'Melden'}</button>
        </div>
      </form>

      {/* Bestehende Meldungen */}
      {notices.length > 0 && (
        <div className="card p-6">
          <p className="eyebrow mb-3">Gemeldet</p>
          <div className="space-y-2">
            {notices.map(n => (
              <div key={n.id} className="flex items-center justify-between gap-3 p-3 surface rounded-xl">
                <div className="min-w-0">
                  <p className="font-medium text-secondary-900">{n.child?.firstName} {n.child?.lastName} · {new Date(n.date).toLocaleDateString('de-CH')}</p>
                  <p className="text-xs text-secondary-500">
                    {[n.absent && `🤒 abwesend${n.reason ? ` (${n.reason})` : ''}`, n.earlyPickup && `⏰ früher abholen${n.pickupTime ? ` ${n.pickupTime}` : ''}`, n.pickupPerson && `👤 ${n.pickupPerson}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => remove(n.id)} className="btn-icon text-secondary-400 hover:bg-red-50 hover:text-red-600 shrink-0" title="Entfernen">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
