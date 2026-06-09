'use client';

import { useEffect, useState, useMemo } from 'react';

interface ChildLite { id: string; firstName: string; lastName: string; photoUrl?: string | null; locationId?: string | null; }
interface LocationLite { id: string; name: string; }

const TYPES = [
  { id: 'EATING', name: 'Essen', icon: '🍽️' }, { id: 'DRINKING', name: 'Trinken', icon: '🥤' },
  { id: 'CHANGING_DIAPER', name: 'Wickeln', icon: '🧷' }, { id: 'SLEEPING', name: 'Schlafen', icon: '😴' },
  { id: 'ACTIVITY', name: 'Beschäftigung', icon: '🎨' }, { id: 'DISCUSSION', name: 'Besprechung', icon: '💬' },
  { id: 'NOTE', name: 'Bemerkung', icon: '📝' }, { id: 'HEALTH_ISSUE', name: 'Autsch', icon: '🏥' },
  { id: 'TRIP', name: 'Ausflug', icon: '🚌' }, { id: 'ABSENT', name: 'Abwesend', icon: '❌' },
  { id: 'HOLIDAY', name: 'Ferien', icon: '🎉' }, { id: 'DRAWING', name: 'Zeichnen', icon: '🖍️' },
];
const meta = (t: string) => TYPES.find(x => x.id === t) || { name: t, icon: '•' };
const initials = (a: string, b: string) => `${(a || '?').charAt(0)}${(b || '').charAt(0)}`.toUpperCase();
const time = (s: string) => new Date(s).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });

export default function ActivitiesBoard({ childrenList, locations }: { childrenList: ChildLite[]; locations: LocationLite[]; }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'kanban' | 'timeline'>('kanban');

  const [childFilter, setChildFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null); // T6: Volltext-Popup
  const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const [form, setForm] = useState<any>(null);

  const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({ childId: a.childId, type: a.type, datetime: toLocalInput(a.timestamp), details: a.details || '', notes: a.notes || '' });
    setOpen(true);
  };

  const del = async (a: any) => {
    if (!confirm(`Aktivität „${meta(a.type).name}" für ${a.child?.firstName} wirklich löschen?`)) return;
    const res = await fetch(`/api/activities/${a.id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('Löschen fehlgeschlagen');
  };

  const load = async () => {
    const qs = new URLSearchParams();
    if (from) qs.set('startDate', from);
    if (to) qs.set('endDate', to);
    const res = await fetch(`/api/activities?${qs.toString()}`);
    if (res.ok) setActivities(await res.json()); else setError('Aktivitäten konnten nicht geladen werden');
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  // T6: Standort zuerst, dann mehrere Kinder
  const openModal = () => {
    setEditingId(null);
    setForm({ locationId: locations[0]?.id || '__none__', childIds: [], search: '', type: 'ACTIVITY', datetime: nowLocal(), details: '', notes: '' });
    setOpen(true);
  };

  // Kinder des im Modal gewählten Standorts, gefiltert nach Suche
  const modalChildren = useMemo(() => {
    if (!form) return [] as ChildLite[];
    const q = (form.search || '').trim().toLowerCase();
    return childrenList
      .filter(c => (c.locationId || '__none__') === form.locationId)
      .filter(c => !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q));
  }, [form, childrenList]);

  const toggleChild = (id: string) =>
    setForm((f: any) => ({ ...f, childIds: f.childIds.includes(id) ? f.childIds.filter((x: string) => x !== id) : [...f.childIds, id] }));
  const allVisibleSelected = modalChildren.length > 0 && modalChildren.every(c => form?.childIds?.includes(c.id));
  const toggleAllVisible = () =>
    setForm((f: any) => {
      const ids = modalChildren.map(c => c.id);
      const allSel = ids.every(id => f.childIds.includes(id));
      return { ...f, childIds: allSel ? f.childIds.filter((id: string) => !ids.includes(id)) : Array.from(new Set([...f.childIds, ...ids])) };
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const ts = new Date(form.datetime).toISOString();
      if (editingId) {
        const res = await fetch(`/api/activities/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: form.childId, type: form.type, timestamp: ts, details: form.details || undefined, notes: form.notes || undefined }),
        });
        if (res.ok) { setOpen(false); setEditingId(null); await load(); }
        else { const d = await res.json().catch(() => ({})); setError(d.error || 'Speichern fehlgeschlagen'); }
        return;
      }
      const ids: string[] = form.childIds || [];
      if (ids.length === 0) { setError('Bitte mindestens ein Kind wählen.'); setSaving(false); return; }
      const results = await Promise.all(ids.map(cid =>
        fetch('/api/activities', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: cid, type: form.type, timestamp: ts, details: form.details || undefined, notes: form.notes || undefined }),
        })
      ));
      if (results.every(r => r.ok)) { setOpen(false); await load(); }
      else { setError('Einige Aktivitäten konnten nicht gespeichert werden'); await load(); }
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => activities.filter(a => {
    if (childFilter !== 'all' && a.childId !== childFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    return true;
  }), [activities, childFilter, typeFilter]);

  // T4: Kanban zeigt nur den AKTUELLEN Tag (Datumsfilter gilt nur in der Zeitachse)
  const isToday = (ts: string) => new Date(ts).toDateString() === new Date().toDateString();
  const kanbanItems = useMemo(() => filtered.filter(a => isToday(a.timestamp)), [filtered]);

  // T3: Statistik je Typ — wie viele verschiedene Kinder hatten Typ X von insgesamt Y
  // (Y = Kinder im jeweiligen Standort/Scope). Liefert [{type, icon, count, total}].
  const typeStats = (items: any[], totalChildren: number) => {
    const byType = new Map<string, Set<string>>();
    for (const a of items) {
      if (!byType.has(a.type)) byType.set(a.type, new Set());
      byType.get(a.type)!.add(a.childId);
    }
    return TYPES
      .filter(t => byType.has(t.id) && (typeFilter === 'all' || typeFilter === t.id))
      .map(t => ({ type: t.id, icon: t.icon, name: t.name, count: byType.get(t.id)!.size, total: totalChildren }));
  };
  const childrenInLocation = (locId: string) =>
    childrenList.filter(c => (c.locationId || '__none__') === locId).length;

  // Kanban-Spalten nach Standort (nur heutige Aktivitäten)
  const columns = useMemo(() => {
    const cols: { id: string; name: string; items: any[] }[] = [
      ...locations.map(l => ({ id: l.id, name: l.name, items: [] as any[] })),
      { id: '__none__', name: 'Ohne Standort', items: [] as any[] },
    ];
    const map = new Map(cols.map(c => [c.id, c]));
    for (const a of kanbanItems) {
      const key = a.child?.locationId || '__none__';
      (map.get(key) || map.get('__none__'))!.items.push(a);
    }
    return cols.filter(c => c.items.length > 0 || c.id !== '__none__');
  }, [kanbanItems, locations]);

  // Zeitachse nach Tag
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const a of filtered) {
      const key = new Date(a.timestamp).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const Avatar = ({ a }: { a: any }) => (
    <div className="avatar avatar-sm overflow-hidden">
      {a.child?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.child.photoUrl} alt="" className="w-full h-full object-cover" />
      ) : initials(a.child?.firstName, a.child?.lastName)}
    </div>
  );

  const Card = ({ a }: { a: any }) => {
    const m = meta(a.type);
    return (
      <div className="card p-3 group">
        <button type="button" onClick={() => setDetail(a)} className="w-full text-left" title="Details anzeigen">
          <div className="flex items-center gap-2">
            <span className="text-xl">{m.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-secondary-900 truncate">{m.name}</p>
              <p className="text-xs text-secondary-400">{time(a.timestamp)}</p>
            </div>
            <Avatar a={a} />
          </div>
          <p className="text-xs text-secondary-600 mt-1 truncate">{a.child?.firstName} {a.child?.lastName}{a.details ? ` · ${a.details}` : ''}</p>
        </button>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {a.creatorName ? <span className="text-[10px] text-secondary-400 truncate">✎ {a.creatorName}</span> : <span />}
          <div className="flex gap-1 shrink-0">
            <button onClick={() => openEdit(a)} title="Bearbeiten" className="btn-icon w-6 h-6 text-secondary-400 hover:bg-primary-50 hover:text-primary-700">✏️</button>
            <button onClick={() => del(a)} title="Löschen" className="btn-icon w-6 h-6 text-secondary-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-8 text-secondary-500">Laden…</div>;

  return (
    <div className="space-y-5">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-secondary-100 p-1">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${view === 'kanban' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>Kanban</button>
            <button onClick={() => setView('timeline')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${view === 'timeline' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>Zeitachse</button>
          </div>
          <select className="input max-w-[11rem]" value={childFilter} onChange={e => setChildFilter(e.target.value)}>
            <option value="all">Alle Kinder</option>
            {childrenList.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
          <select className="input max-w-[11rem]" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Alle Typen</option>
            {TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </select>
          {/* T5: Zeitfilter Von–Bis nur in der Zeitachse, nebeneinander auf einer Linie */}
          {view === 'timeline' && (
            <div className="flex items-center gap-1.5">
              <input type="date" className="input w-[8.5rem]" value={from} onChange={e => setFrom(e.target.value)} title="Von" />
              <span className="text-secondary-400 text-sm">–</span>
              <input type="date" className="input w-[8.5rem]" value={to} onChange={e => setTo(e.target.value)} title="Bis" />
            </div>
          )}
        </div>
        <button onClick={openModal} className="btn btn-primary">+ Aktivität anlegen</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {(view === 'kanban' ? kanbanItems.length === 0 : filtered.length === 0) ? (
        <div className="empty-state"><div className="empty-state-icon">📊</div><p className="text-secondary-500">{view === 'kanban' ? 'Heute noch keine Aktivitäten' : 'Keine Aktivitäten im Zeitraum'}</p></div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map(col => {
            const stats = typeStats(col.items, childrenInLocation(col.id));
            return (
            <div key={col.id} className="w-72 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="font-semibold text-secondary-900 text-sm">📍 {col.name}</p>
                <span className="chip chip-neutral">{childrenInLocation(col.id)} Kinder</span>
              </div>
              {/* T3: X/Y je Typ — wie viele Kinder z.B. gewickelt/gegessen */}
              {stats.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 px-1">
                  {stats.map(s => (
                    <span key={s.type} className="chip chip-accent text-[11px]" title={`${s.count} von ${s.total} Kindern: ${s.name}`}>
                      {s.icon} {s.count}/{s.total}
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-2 bg-secondary-100/50 rounded-2xl p-2 min-h-[6rem]">
                {col.items.length === 0 ? <p className="text-xs text-secondary-400 text-center py-4">—</p> : col.items.map(a => <Card key={a.id} a={a} />)}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {/* T3: Statistik-Leiste über der Zeitachse */}
          {(() => {
            const total = childFilter === 'all' ? childrenList.length : 1;
            const stats = typeStats(filtered, total);
            return stats.length > 0 ? (
              <div className="card p-3 flex flex-wrap gap-1.5">
                <span className="text-xs font-semibold text-secondary-500 mr-1 self-center">Im Zeitraum:</span>
                {stats.map(s => (
                  <span key={s.type} className="chip chip-accent" title={`${s.count} von ${s.total} Kindern: ${s.name}`}>{s.icon} {s.name} {s.count}/{s.total}</span>
                ))}
              </div>
            ) : null;
          })()}
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="eyebrow mb-3">{day}</p>
              <div className="relative border-l-2 border-secondary-200 ml-3 pl-6 space-y-2">
                {items.map(a => {
                  const m = meta(a.type);
                  return (
                    <div key={a.id} className="relative">
                      <span className="absolute -left-[1.92rem] top-4 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-secondary-50" />
                      <div className="card p-3 flex items-center gap-3">
                        <button type="button" onClick={() => setDetail(a)} className="flex items-center gap-3 min-w-0 flex-1 text-left" title="Details anzeigen">
                          <span className="text-xl">{m.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-secondary-900">{m.name} · {a.child?.firstName} {a.child?.lastName}</p>
                            {a.details && <p className="text-xs text-secondary-600 truncate">{a.details}</p>}
                            {a.creatorName && <p className="text-[10px] text-secondary-400">✎ {a.creatorName}</p>}
                          </div>
                        </button>
                        {a.child?.location?.name && <span className="chip chip-accent shrink-0 hidden sm:inline-flex">📍 {a.child.location.name}</span>}
                        <span className="text-xs text-secondary-400 shrink-0">{time(a.timestamp)}</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(a)} title="Bearbeiten" className="btn-icon w-7 h-7 text-secondary-400 hover:bg-primary-50 hover:text-primary-700">✏️</button>
                          <button onClick={() => del(a)} title="Löschen" className="btn-icon w-7 h-7 text-secondary-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
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
            <h2 className="text-xl font-bold text-secondary-900">{editingId ? 'Aktivität bearbeiten' : 'Neue Aktivität'}</h2>

            {editingId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label label-required">Kind</label>
                  <select className="input" value={form.childId} onChange={e => setForm({ ...form, childId: e.target.value })} required>
                    {childrenList.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div><label className="label label-required">Datum & Zeit</label><input type="datetime-local" className="input" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required /></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="label label-required">📍 Standort</label>
                    <select className="input" value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value, childIds: [] })}>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      <option value="__none__">Ohne Standort</option>
                    </select>
                  </div>
                  <div><label className="label label-required">Datum & Zeit</label><input type="datetime-local" className="input" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} required /></div>
                </div>
                {/* T6: Kinder des Standorts — Mehrfachauswahl, Suche, „Alle" */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label label-required mb-0">Kinder ({form.childIds.length} gewählt)</label>
                    {modalChildren.length > 0 && (
                      <button type="button" onClick={toggleAllVisible} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                        {allVisibleSelected ? 'Alle abwählen' : 'Alle auswählen'}
                      </button>
                    )}
                  </div>
                  <input className="input mb-2" placeholder="🔍 Kind suchen…" value={form.search} onChange={e => setForm({ ...form, search: e.target.value })} />
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-secondary-100 divide-y divide-secondary-50">
                    {modalChildren.length === 0 ? (
                      <p className="text-sm text-secondary-400 text-center py-4">Keine Kinder an diesem Standort</p>
                    ) : modalChildren.map(c => (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary-50">
                        <input type="checkbox" checked={form.childIds.includes(c.id)} onChange={() => toggleChild(c.id)} className="w-4 h-4 accent-primary-600" />
                        <span className="text-sm text-secondary-900">{c.firstName} {c.lastName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div><label className="label">Typ</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TYPES.map(t => (
                  <button type="button" key={t.id} onClick={() => setForm({ ...form, type: t.id })}
                    className={`tile ${form.type === t.id ? 'tile-active' : ''} py-3`}>
                    <span className="text-xl">{t.icon}</span><span className="text-[11px] font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div><label className="label">Details</label><input className="input" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="z.B. 200ml Milch" /></div>
            <div><label className="label">Notizen</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Abbrechen</button>
              <button type="submit" disabled={saving} className="btn btn-primary px-6">{saving ? 'Speichert…' : 'Aktivität speichern'}</button>
            </div>
          </form>
        </div>
      )}

      {/* T6: Volltext-Detail-Popup */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-elevated">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl">{meta(detail.type).icon}</span>
                <h2 className="text-lg font-bold text-secondary-900">{meta(detail.type).name}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="btn-icon w-8 h-8 text-secondary-400 hover:bg-secondary-100" title="Schliessen">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar a={detail} />
                <div>
                  <p className="font-semibold text-secondary-900">{detail.child?.firstName} {detail.child?.lastName}</p>
                  {detail.child?.location?.name && <p className="text-xs text-secondary-500">📍 {detail.child.location.name}</p>}
                </div>
              </div>
              <p><span className="text-secondary-400">Zeitpunkt:</span> {new Date(detail.timestamp).toLocaleString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              {detail.details && <div><p className="text-secondary-400 mb-0.5">Details</p><p className="text-secondary-800 whitespace-pre-wrap break-words">{detail.details}</p></div>}
              {detail.notes && <div><p className="text-secondary-400 mb-0.5">Notizen</p><p className="text-secondary-800 whitespace-pre-wrap break-words">{detail.notes}</p></div>}
              {detail.creatorName && <p className="text-xs text-secondary-400 pt-2 border-t border-secondary-100">Eingepflegt von {detail.creatorName}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { const a = detail; setDetail(null); openEdit(a); }} className="btn btn-secondary btn-sm">✏️ Bearbeiten</button>
              <button onClick={() => setDetail(null)} className="btn btn-primary btn-sm px-5">Schliessen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
