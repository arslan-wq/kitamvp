'use client';

import { useEffect, useState, useMemo } from 'react';

interface ChildLite { id: string; firstName: string; lastName: string; photoUrl?: string | null; locationId?: string | null; }
interface LocationLite { id: string; name: string; }

const MOODS = [
  { v: 'happy', l: '😊 Fröhlich' }, { v: 'content', l: '🙂 Zufrieden' },
  { v: 'tired', l: '😴 Müde' }, { v: 'grumpy', l: '😣 Quengelig' }, { v: 'sick', l: '🤒 Krank' },
];
const MEAL_TYPES = [
  { k: 'breakfast', l: 'Frühstück' }, { k: 'lunch', l: 'Mittagessen' }, { k: 'snack', l: 'Snack' },
];
const moodLabel = (v?: string) => MOODS.find(m => m.v === v)?.l || v;
const initials = (a: string, b: string) => `${(a || '?').charAt(0)}${(b || '').charAt(0)}`.toUpperCase();
const parseArr = (a?: string[]) => (Array.isArray(a) ? a.map(x => { try { return JSON.parse(x); } catch { return { text: x }; } }) : []);

export default function DailyReportsTimeline({ childrenList, locations }: { childrenList: ChildLite[]; locations: LocationLite[]; }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter
  const [search, setSearch] = useState('');
  const [locFilter, setLocFilter] = useState('all');
  const [childFilter, setChildFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const [form, setForm] = useState<any>(null);

  const load = async () => {
    const qs = new URLSearchParams();
    if (from) qs.set('startDate', from);
    if (to) qs.set('endDate', to);
    const res = await fetch(`/api/daily-reports?${qs.toString()}`);
    if (res.ok) setReports(await res.json());
    else setError('Berichte konnten nicht geladen werden');
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const openModal = () => {
    setForm({
      childId: childrenList[0]?.id || '',
      datetime: nowLocal(),
      mood: '',
      meals: { breakfast: false, lunch: false, snack: false },
      sleepDuration: '',
      toiletVisits: '',
      notes: '',
      incident: '',
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId) { setError('Bitte ein Kind wählen.'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        childId: form.childId,
        date: new Date(form.datetime).toISOString(),
        mood: form.mood || null,
        meals: MEAL_TYPES.filter(m => form.meals[m.k]).map(m => ({ type: m.k, consumed: true })),
        sleepDuration: form.sleepDuration ? parseInt(form.sleepDuration) : null,
        toiletVisits: form.toiletVisits ? parseInt(form.toiletVisits) : 0,
        incidents: form.incident ? [{ type: 'Vorfall', description: form.incident }] : [],
        notes: form.notes || null,
        activities: [],
      };
      const res = await fetch('/api/daily-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setOpen(false); await load(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || 'Speichern fehlgeschlagen'); }
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      const name = `${r.child?.firstName} ${r.child?.lastName}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (locFilter !== 'all') { if (locFilter === 'none' ? r.child?.locationId : r.child?.locationId !== locFilter) return false; }
      if (childFilter !== 'all' && r.childId !== childFilter) return false;
      return true;
    });
  }, [reports, search, locFilter, childFilter]);

  // nach Tag gruppieren
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of filtered) {
      const key = new Date(r.date).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const printReport = (r: any) => {
    const meals = parseArr(r.meals);
    const incidents = parseArr(r.incidents);
    const activities = parseArr(r.activities);
    const childName = `${r.child?.firstName || ''} ${r.child?.lastName || ''}`;
    const dateStr = new Date(r.date).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Tagesbericht ${childName}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;max-width:720px;margin:24px auto;padding:0 16px}
      h1{font-size:22px;border-bottom:3px solid #458052;padding-bottom:8px}.row{margin:10px 0}.lbl{color:#6e6e73;font-size:13px}
      .val{font-weight:bold}.box{background:#f5f5f7;border:1px solid #ddd;border-radius:10px;padding:12px;margin:8px 0}
      .brand{color:#458052;font-weight:bold}ul{margin:4px 0}</style></head><body>
      <h1>📋 Tagesbericht <span class="brand">KitaLuna</span></h1>
      <div class="row"><span class="lbl">Kind:</span> <span class="val">${childName}</span></div>
      <div class="row"><span class="lbl">Datum:</span> <span class="val">${dateStr}</span></div>
      ${r.child?.location?.name ? `<div class="row"><span class="lbl">Standort:</span> <span class="val">${r.child.location.name}</span></div>` : ''}
      <div class="row"><span class="lbl">Stimmung:</span> <span class="val">${moodLabel(r.mood) || '—'}</span></div>
      <div class="box"><div class="lbl">Mahlzeiten</div>${meals.length ? '<ul>' + meals.map((m: any) => `<li>${MEAL_TYPES.find(t => t.k === m.type)?.l || m.type}${m.consumed ? ' ✓' : ''}</li>`).join('') + '</ul>' : '—'}</div>
      <div class="box"><div class="lbl">Schlaf</div> ${r.sleepDuration ? r.sleepDuration + ' Min' : '—'}${r.toiletVisits ? ` &nbsp; · &nbsp; WC: ${r.toiletVisits}` : ''}</div>
      ${activities.length ? `<div class="box"><div class="lbl">Aktivitäten</div><ul>${activities.map((a: any) => `<li>${a.name || a.text || ''}</li>`).join('')}</ul></div>` : ''}
      ${incidents.length ? `<div class="box" style="border-color:#e0a"><div class="lbl">Vorfälle</div><ul>${incidents.map((i: any) => `<li>${i.description || i.text || ''}</li>`).join('')}</ul></div>` : ''}
      ${r.notes ? `<div class="box"><div class="lbl">Notizen</div>${r.notes}</div>` : ''}
      <p style="color:#6e6e73;font-size:12px;margin-top:24px">Erstellt mit KitaLuna · ${new Date().toLocaleDateString('de-CH')}</p>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  };

  if (loading) return <div className="text-center py-8 text-secondary-500">Laden…</div>;

  return (
    <div className="space-y-5">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">🔍</span>
            <input className="input pl-9 max-w-[14rem]" placeholder="Kind suchen…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input max-w-[12rem]" value={childFilter} onChange={e => setChildFilter(e.target.value)}>
            <option value="all">Alle Kinder</option>
            {childrenList.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
          <select className="input max-w-[11rem]" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
            <option value="all">📍 Alle Standorte</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="none">Ohne Standort</option>
          </select>
          <input type="date" className="input max-w-[10rem]" value={from} onChange={e => setFrom(e.target.value)} title="Von" />
          <input type="date" className="input max-w-[10rem]" value={to} onChange={e => setTo(e.target.value)} title="Bis" />
        </div>
        <button onClick={openModal} className="btn btn-primary">+ Bericht anlegen</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Zeitachse */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><p className="text-secondary-500">Keine Berichte im gewählten Zeitraum</p></div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="eyebrow mb-3">{day}</p>
              <div className="relative border-l-2 border-secondary-200 ml-3 pl-6 space-y-3">
                {items.map(r => {
                  const incidents = parseArr(r.incidents);
                  const meals = parseArr(r.meals);
                  return (
                    <div key={r.id} className="relative">
                      <span className="absolute -left-[1.92rem] top-4 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-secondary-50" />
                      <div className="card p-4">
                        <div className="flex items-start gap-3">
                          <div className="avatar avatar-md overflow-hidden">
                            {r.child?.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.child.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : initials(r.child?.firstName, r.child?.lastName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-semibold text-secondary-900">{r.child?.firstName} {r.child?.lastName}</p>
                              <span className="text-xs text-secondary-400">{new Date(r.date).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex gap-1.5 flex-wrap mt-1">
                              {r.mood && <span className="chip chip-primary">{moodLabel(r.mood)}</span>}
                              {meals.length > 0 && <span className="chip chip-neutral">{meals.length} Mahlzeit(en)</span>}
                              {r.sleepDuration > 0 && <span className="chip chip-neutral">Schlaf {r.sleepDuration} Min</span>}
                              {incidents.length > 0 && <span className="chip chip-warning">⚠️ {incidents.length} Vorfall/-fälle</span>}
                              {r.child?.location?.name && <span className="chip chip-accent">📍 {r.child.location.name}</span>}
                            </div>
                            {r.notes && <p className="text-sm text-secondary-600 mt-2">{r.notes}</p>}
                          </div>
                          <button onClick={() => printReport(r)} className="btn btn-secondary btn-sm shrink-0" title="Als PDF drucken">🖨️ PDF</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {open && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-elevated">
            <h2 className="text-xl font-bold text-secondary-900">Neuer Tagesbericht</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label label-required">Kind</label>
                <select className="input" value={form.childId} onChange={e => setForm({ ...form, childId: e.target.value })} required>
                  {childrenList.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div><label className="label label-required">Datum & Zeit</label><input type="datetime-local" className="input" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required /></div>
            </div>
            <div><label className="label">Stimmung</label>
              <select className="input" value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })}>
                <option value="">—</option>{MOODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div><label className="label">Mahlzeiten gegessen</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(m => (
                  <button type="button" key={m.k} onClick={() => setForm({ ...form, meals: { ...form.meals, [m.k]: !form.meals[m.k] } })}
                    className={`btn btn-sm ${form.meals[m.k] ? 'btn-primary' : 'btn-secondary'}`}>{m.l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Schlaf (Min)</label><input type="number" className="input" value={form.sleepDuration} onChange={e => setForm({ ...form, sleepDuration: e.target.value })} /></div>
              <div><label className="label">WC-Besuche</label><input type="number" className="input" value={form.toiletVisits} onChange={e => setForm({ ...form, toiletVisits: e.target.value })} /></div>
            </div>
            <div><label className="label">Vorfall (optional)</label><input className="input" value={form.incident} onChange={e => setForm({ ...form, incident: e.target.value })} placeholder="z.B. kleiner Sturz" /></div>
            <div><label className="label">Notizen</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Abbrechen</button>
              <button type="submit" disabled={saving} className="btn btn-primary px-6">{saving ? 'Speichert…' : 'Bericht speichern'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
