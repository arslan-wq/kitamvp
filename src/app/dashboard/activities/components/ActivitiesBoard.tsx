'use client';

import { useEffect, useState, useMemo, useRef } from 'react';

interface ChildLite { id: string; firstName: string; lastName: string; photoUrl?: string | null; locationId?: string | null; photoConsent?: boolean; }
interface LocationLite { id: string; name: string; }

// T13: Foto nur bei diesen Aktivitätstypen erlaubt
const PHOTO_TYPES = ['DRAWING', 'TRIP', 'ACTIVITY', 'NOTE'];
// Bild verkleinern (Seitenverhältnis erhalten) → JPEG Data-URL
function activityImageToDataUrl(file: File, max = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('no ctx'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('img'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

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

export default function ActivitiesBoard({ childrenList, locations, initialActivities }: { childrenList: ChildLite[]; locations: LocationLite[]; initialActivities?: any[]; }) {
  const hasInitial = Array.isArray(initialActivities);
  const [activities, setActivities] = useState<any[]>(initialActivities || []);
  const [loading, setLoading] = useState(!hasInitial); // SSR: kein Lade-Flash
  const [error, setError] = useState('');
  const [view, setView] = useState<'kanban' | 'timeline'>('kanban');

  const [childFilter, setChildFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locFilter, setLocFilter] = useState('all'); // 'all' | <locationId> | 'none'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null); // T6: Volltext-Popup
  const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const [form, setForm] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [photoWarn, setPhotoWarn] = useState<string[] | null>(null); // T13: Namen ohne Foto-Einwilligung

  // T4: Tagesstatus — wer hat heute noch nicht gegessen / gewickelt
  const [todayStatus, setTodayStatus] = useState<any | null>(null);
  const [showOpen, setShowOpen] = useState(true);
  const loadTodayStatus = async () => {
    try {
      const qs = (locFilter !== 'all' && locFilter !== 'none') ? `?locationId=${locFilter}` : '';
      const r = await fetch('/api/activities/today-status' + qs);
      if (r.ok) setTodayStatus(await r.json());
    } catch { /* still */ }
  };
  useEffect(() => { loadTodayStatus(); /* eslint-disable-next-line */ }, [locFilter]);

  // T5: bis zu 6 Fotos hochladen
  const MAX_PHOTOS = 6;
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) { setError('Bitte eine Bilddatei wählen'); return; }
    const current: string[] = form?.photos || [];
    const room = Math.max(0, MAX_PHOTOS - current.length);
    if (room === 0) { setError(`Maximal ${MAX_PHOTOS} Bilder.`); return; }
    try {
      const toAdd = await Promise.all(imgs.slice(0, room).map((f) => activityImageToDataUrl(f)));
      setForm((prev: any) => ({ ...prev, photos: [...(prev.photos || []), ...toAdd].slice(0, MAX_PHOTOS) }));
      if (imgs.length > room) setError(`Maximal ${MAX_PHOTOS} Bilder — ${imgs.length - room} wurde(n) ignoriert.`);
    }
    catch { setError('Bild konnte nicht verarbeitet werden'); }
  };
  const removePhoto = (idx: number) =>
    setForm((prev: any) => ({ ...prev, photos: (prev.photos || []).filter((_: string, i: number) => i !== idx) }));

  const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({ childId: a.childId, type: a.type, datetime: toLocalInput(a.timestamp), endTime: a.endTime ? toLocalInput(a.endTime) : '', details: a.details || '', notes: a.notes || '', photos: (a.photoUrls?.length ? a.photoUrls : (a.photoUrl ? [a.photoUrl] : [])) });
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
    loadTodayStatus();
  };
  // SSR-Prefetch (ohne Filter) vorhanden → ersten load() überspringen,
  // bei Filter-Wechsel (from/to) aber normal neu laden.
  const skipFirstLoad = useRef(hasInitial);
  useEffect(() => {
    if (skipFirstLoad.current) { skipFirstLoad.current = false; return; }
    load(); /* eslint-disable-next-line */
  }, [from, to]);

  // T6: Standort zuerst, dann mehrere Kinder
  const openModal = () => {
    setEditingId(null);
    setForm({ locationId: locations[0]?.id || '__none__', childIds: [], search: '', type: 'ACTIVITY', datetime: nowLocal(), endTime: '', details: '', notes: '', photos: [] });
    setOpen(true);
  };

  // T2: heute anwesende Kinder (für grün/rot-Punkt im Modal)
  const presentSet = useMemo(() => new Set<string>(todayStatus?.presentIds || []), [todayStatus]);
  const isPresentToday = (id: string) => presentSet.has(id);

  // Kinder des im Modal gewählten Standorts, gefiltert nach Suche (Anwesende zuerst)
  const modalChildren = useMemo(() => {
    if (!form) return [] as ChildLite[];
    const q = (form.search || '').trim().toLowerCase();
    return childrenList
      .filter(c => (c.locationId || '__none__') === form.locationId)
      .filter(c => !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      .sort((a, b) => (presentSet.has(b.id) ? 1 : 0) - (presentSet.has(a.id) ? 1 : 0));
  }, [form, childrenList, presentSet]);

  const toggleChild = (id: string) =>
    setForm((f: any) => ({ ...f, childIds: f.childIds.includes(id) ? f.childIds.filter((x: string) => x !== id) : [...f.childIds, id] }));
  const allVisibleSelected = modalChildren.length > 0 && modalChildren.every(c => form?.childIds?.includes(c.id));
  const toggleAllVisible = () =>
    setForm((f: any) => {
      const ids = modalChildren.map(c => c.id);
      const allSel = ids.every(id => f.childIds.includes(id));
      return { ...f, childIds: allSel ? f.childIds.filter((id: string) => !ids.includes(id)) : Array.from(new Set([...f.childIds, ...ids])) };
    });

  const save = async (e: React.FormEvent | null, confirmed = false) => {
    e?.preventDefault?.();
    const photos: string[] = PHOTO_TYPES.includes(form.type) ? (form.photos || []) : [];
    const targets: string[] = editingId ? [form.childId] : (form.childIds || []);

    // T13: Foto-Datenschutz-Warnung — Kinder ohne Einwilligung auflisten
    if (photos.length > 0 && !confirmed) {
      const noConsent = targets
        .map(id => childrenList.find(c => c.id === id))
        .filter((c): c is ChildLite => !!c && c.photoConsent === false)
        .map(c => `${c.firstName} ${c.lastName}`);
      if (noConsent.length > 0) { setPhotoWarn(noConsent); return; }
    }

    setSaving(true); setError('');
    try {
      const ts = new Date(form.datetime).toISOString();
      const endTs = form.type === 'TRIP' && form.endTime ? new Date(form.endTime).toISOString() : null;
      if (editingId) {
        const res = await fetch(`/api/activities/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: form.childId, type: form.type, timestamp: ts, endTime: endTs, details: form.details || undefined, notes: form.notes || undefined, photoUrls: photos }),
        });
        if (res.ok) { setOpen(false); setEditingId(null); setPhotoWarn(null); await load(); }
        else { const d = await res.json().catch(() => ({})); setError(d.error || 'Speichern fehlgeschlagen'); }
        return;
      }
      if (targets.length === 0) { setError('Bitte mindestens ein Kind wählen.'); setSaving(false); return; }
      const results = await Promise.all(targets.map(cid =>
        fetch('/api/activities', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: cid, type: form.type, timestamp: ts, endTime: endTs, details: form.details || undefined, notes: form.notes || undefined, photoUrls: photos }),
        })
      ));
      if (results.every(r => r.ok)) { setOpen(false); setPhotoWarn(null); await load(); }
      else { setError('Einige Aktivitäten konnten nicht gespeichert werden'); await load(); }
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => activities.filter(a => {
    if (childFilter !== 'all' && a.childId !== childFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (locFilter !== 'all' && (a.child?.locationId || 'none') !== locFilter) return false;
    return true;
  }), [activities, childFilter, typeFilter, locFilter]);

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
    return cols
      .filter(c => locFilter === 'all' || (locFilter === 'none' ? c.id === '__none__' : c.id === locFilter))
      .filter(c => c.items.length > 0 || c.id !== '__none__');
  }, [kanbanItems, locations, locFilter]);

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
              <p className="text-xs text-secondary-400">{time(a.timestamp)}{a.endTime ? ` – ${time(a.endTime)}` : ''}</p>
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
          <select className="input max-w-[12rem]" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
            <option value="all">📍 Alle Standorte</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="none">Ohne Standort</option>
          </select>
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

      {/* T4: Heute offen — wer hat noch nicht gegessen / gewickelt (nur Kanban/heute) */}
      {view === 'kanban' && todayStatus && todayStatus.total > 0 && (
        <div className="card p-4 sm:p-5">
          <button type="button" onClick={() => setShowOpen(s => !s)} className="flex items-center justify-between w-full text-left">
            <span className="font-semibold text-secondary-900">📋 Heute offen</span>
            <span className="flex items-center gap-2 text-xs">
              <span className="chip chip-neutral">🍽️ {todayStatus.eatenCount}/{todayStatus.total} gegessen</span>
              <span className="chip chip-neutral">🧷 {todayStatus.changedCount}/{todayStatus.total} gewickelt</span>
              <span className="text-secondary-400">{showOpen ? '▲' : '▼'}</span>
            </span>
          </button>
          {showOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                <p className="font-semibold text-amber-800 text-sm mb-2">🍽️ Noch nicht gegessen <span className="chip chip-warning ml-1">{todayStatus.notEaten.length}</span></p>
                {todayStatus.notEaten.length === 0 ? (
                  <p className="text-sm text-secondary-500">Alle haben gegessen 🎉</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {todayStatus.notEaten.map((c: any) => (
                      <span key={c.id} className="chip chip-neutral bg-white">{c.firstName} {c.lastName.charAt(0)}.</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-secondary-50 border border-secondary-100 p-3">
                <p className="font-semibold text-secondary-700 text-sm mb-2">🧷 Noch nicht gewickelt <span className="chip chip-neutral ml-1">{todayStatus.notChanged.length}</span></p>
                {todayStatus.notChanged.length === 0 ? (
                  <p className="text-sm text-secondary-500">Alle gewickelt 🎉</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {todayStatus.notChanged.map((c: any) => (
                      <span key={c.id} className="chip chip-neutral bg-white">{c.firstName} {c.lastName.charAt(0)}.</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
                        <span className="text-xs text-secondary-400 shrink-0">{time(a.timestamp)}{a.endTime ? `–${time(a.endTime)}` : ''}</span>
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
                    ) : modalChildren.map(c => {
                      const present = isPresentToday(c.id);
                      return (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary-50">
                        <input type="checkbox" checked={form.childIds.includes(c.id)} onChange={() => toggleChild(c.id)} className="w-4 h-4 accent-primary-600" />
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${present ? 'bg-green-500' : 'bg-red-400'}`} title={present ? 'Heute anwesend' : 'Heute nicht anwesend (rückwirkend)'} />
                        <span className="text-sm text-secondary-900">{c.firstName} {c.lastName}</span>
                        {!present && <span className="text-[10px] text-secondary-400 ml-auto">abwesend</span>}
                      </label>
                      );
                    })}
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
            {/* T11: Ausflug von–bis */}
            {form.type === 'TRIP' && (
              <div><label className="label">🚌 Ausflug bis (Ende)</label>
                <input type="datetime-local" className="input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                <p className="help-text">Start ist „Datum & Zeit" oben.</p>
              </div>
            )}
            <div><label className="label">Details</label><input className="input" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="z.B. 200ml Milch" /></div>
            <div><label className="label">Notizen</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

            {/* T13: Foto nur bei Zeichnen/Ausflug/Beschäftigung/Bemerkung */}
            {PHOTO_TYPES.includes(form.type) && (
              <div>
                <label className="label">📷 Fotos (optional · max. {MAX_PHOTOS})</label>
                {form.photos?.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
                    {form.photos.map((src: string, i: number) => (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full aspect-square rounded-xl object-cover ring-1 ring-secondary-200" />
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow"
                          title="Entfernen">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {(form.photos?.length || 0) < MAX_PHOTOS && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm">📁 Dateien wählen</button>
                    <button type="button" onClick={() => camRef.current?.click()} className="btn btn-secondary btn-sm">📷 Foto aufnehmen</button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pickPhoto} />
                <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickPhoto} />
                <p className="help-text">Bis zu {MAX_PHOTOS} Bilder. Vor dem Speichern wird gewarnt, falls für ausgewählte Kinder keine Foto-Einwilligung vorliegt.</p>
              </div>
            )}

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
              <p><span className="text-secondary-400">Zeitpunkt:</span> {new Date(detail.timestamp).toLocaleString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{detail.endTime ? ` – ${time(detail.endTime)}` : ''}</p>
              {(() => {
                const imgs: string[] = detail.photoUrls?.length ? detail.photoUrls : (detail.photoUrl ? [detail.photoUrl] : []);
                if (!imgs.length) return null;
                return imgs.length === 1 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgs[0]} alt="Foto" className="w-full rounded-xl" />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {imgs.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt={`Foto ${i + 1}`} className="w-full aspect-square rounded-xl object-cover" />
                    ))}
                  </div>
                );
              })()}
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

      {/* T13: Foto-Datenschutz-Warnung */}
      {photoWarn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setPhotoWarn(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-elevated">
            <h2 className="text-lg font-bold text-secondary-900 mb-2">⚠️ Foto-Datenschutz</h2>
            <p className="text-sm text-secondary-700">Für folgende Kinder liegt <strong>keine Foto-Einwilligung</strong> der Eltern vor:</p>
            <ul className="my-3 space-y-1">
              {photoWarn.map(n => <li key={n} className="chip chip-warning">🚫 {n}</li>)}
            </ul>
            <p className="text-sm text-secondary-700">Ist das Gesicht dieser Kinder auf dem Foto erkennbar? <strong>Falls ja, bitte kein Foto hochladen.</strong></p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
              <button onClick={() => setPhotoWarn(null)} className="btn btn-secondary">Abbrechen</button>
              <button onClick={() => { setPhotoWarn(null); save(null, true); }} className="btn btn-primary">Gesicht nicht erkennbar – speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
