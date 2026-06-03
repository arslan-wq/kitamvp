'use client';

import { useEffect, useState, useCallback } from 'react';

interface ChildLite { id: string; firstName: string; lastName: string; }
interface LocationLite { id: string; name: string; }
interface Props {
  childrenList: ChildLite[];
  role: string;
  locations: LocationLite[];
  myLocationId: string | null;
  myLocationName: string | null;
}

const initials = (s: string) => (s || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const fmt = (s: string) => new Date(s).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function MessagingClient({ childrenList, role, locations, myLocationId, myLocationName }: Props) {
  const isAdmin = role === 'ADMIN';

  const [threads, setThreads] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState<'all' | 'announcement' | 'child'>('all');
  const [locFilter, setLocFilter] = useState('all');

  const [showNew, setShowNew] = useState(false);
  const [nType, setNType] = useState<'announcement' | 'child'>('announcement');
  const [nChildId, setNChildId] = useState('');
  const [nLocationId, setNLocationId] = useState('');
  const [nTitle, setNTitle] = useState('');
  const [nContent, setNContent] = useState('');

  const loadThreads = useCallback(async () => {
    const res = await fetch('/api/messages/threads');
    if (res.ok) setThreads(await res.json());
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const openThread = async (t: any) => {
    setSelected(t);
    setDetail(null);
    const res = await fetch(`/api/messages/threads/${t.id}`);
    if (res.ok) setDetail(await res.json());
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/messages/threads/${selected.id}/replies`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      });
      if (res.ok) { setReply(''); await openThread(selected); await loadThreads(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || 'Senden fehlgeschlagen'); }
    } finally { setBusy(false); }
  };

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const payload: any = { content: nContent, title: nTitle || undefined };
      if (nType === 'child') {
        if (!nChildId) { setError('Bitte ein Kind wählen.'); setBusy(false); return; }
        payload.childId = nChildId;
      } else {
        payload.isAnnouncement = true;
        if (isAdmin && nLocationId) payload.locationId = nLocationId;
      }
      const res = await fetch('/api/messages/threads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowNew(false); setNContent(''); setNTitle(''); setNChildId(''); setNLocationId('');
        await loadThreads();
      } else {
        setError(d.error || 'Erstellen fehlgeschlagen');
      }
    } finally { setBusy(false); }
  };

  const filtered = threads.filter(t => {
    if (typeFilter === 'announcement' && !t.isAnnouncement) return false;
    if (typeFilter === 'child' && t.isAnnouncement) return false;
    if (locFilter !== 'all') {
      if (locFilter === 'none') { if (t.locationId) return false; }
      else if (t.locationId !== locFilter) return false;
    }
    return true;
  });

  const audienceLabel = (t: any) =>
    t.isAnnouncement ? (t.locationName ? `Ankündigung · ${t.locationName}` : 'Ankündigung · Alle') : (t.childName || 'Nachricht');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-secondary-100 p-1">
            {([['all', 'Alle'], ['announcement', 'Ankündigungen'], ['child', 'Kind-Pinnwand']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${typeFilter === v ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>{l}</button>
            ))}
          </div>
          <select value={locFilter} onChange={e => setLocFilter(e.target.value)} className="input max-w-[12rem] py-1.5">
            <option value="all">📍 Alle Standorte</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="none">Standortübergreifend</option>
          </select>
        </div>
        {isAdmin && !showNew && <button onClick={() => setShowNew(true)} className="btn btn-primary">+ Neu</button>}
        {!isAdmin && <span className="chip chip-neutral">Nur Lesen · senden nur Admin</span>}
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {showNew && (
        <form onSubmit={createThread} className="card p-6 mb-4 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setNType('announcement')} className={`btn btn-sm ${nType === 'announcement' ? 'btn-primary' : 'btn-secondary'}`}>📢 Ankündigung</button>
            <button type="button" onClick={() => setNType('child')} className={`btn btn-sm ${nType === 'child' ? 'btn-primary' : 'btn-secondary'}`}>👶 Kind-Nachricht</button>
          </div>

          {nType === 'announcement' ? (
            <div>
              <label className="label">Empfänger</label>
              {isAdmin ? (
                <select value={nLocationId} onChange={e => setNLocationId(e.target.value)} className="input">
                  <option value="">Alle Standorte (ganze KiTA)</option>
                  {locations.map(l => <option key={l.id} value={l.id}>Nur: {l.name}</option>)}
                </select>
              ) : myLocationId ? (
                <p className="text-sm text-secondary-600 bg-secondary-50 rounded-xl px-3 py-2 border border-secondary-100">
                  Geht an die Eltern Ihres Standorts: <span className="font-semibold">{myLocationName}</span>
                </p>
              ) : (
                <p className="alert alert-warning">Ihnen ist kein Standort zugewiesen — Ankündigungen sind nicht möglich. Bitte an die Leitung wenden.</p>
              )}
            </div>
          ) : (
            <div>
              <label className="label label-required">Kind</label>
              <select value={nChildId} onChange={e => setNChildId(e.target.value)} className="input" required>
                <option value="">— wählen —</option>
                {childrenList.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
          )}

          {nType === 'announcement' && (
            <div><label className="label">Titel (optional)</label><input className="input" value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="z.B. Sommerfest" /></div>
          )}
          <div><label className="label label-required">Nachricht</label><textarea className="input" rows={3} value={nContent} onChange={e => setNContent(e.target.value)} required /></div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowNew(false)} className="btn btn-secondary">Abbrechen</button>
            <button type="submit" disabled={busy || (nType === 'announcement' && !isAdmin && !myLocationId)} className="btn btn-primary px-6">{busy ? 'Senden…' : 'Senden'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2 lg:col-span-1">
          {filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💬</div><p className="text-secondary-500">Keine Konversationen</p></div>
          ) : filtered.map(t => (
            <button key={t.id} onClick={() => openThread(t)} className={`w-full text-left card p-4 transition ${selected?.id === t.id ? 'ring-2 ring-primary-300' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`chip ${t.isAnnouncement ? 'chip-primary' : 'chip-neutral'}`}>
                  {t.isAnnouncement ? '📢' : '👶'} {audienceLabel(t)}
                </span>
                <span className="text-xs text-secondary-400">{t.messageCount}</span>
              </div>
              {t.title && <p className="font-semibold text-secondary-900 text-sm truncate">{t.title}</p>}
              {t.lastMessage && <p className="text-sm text-secondary-500 truncate">{t.lastMessage.senderName}: {t.lastMessage.content}</p>}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="empty-state h-full flex flex-col items-center justify-center"><div className="empty-state-icon">✉️</div><p className="text-secondary-500">Wählen Sie eine Konversation</p></div>
          ) : (
            <div className="card overflow-hidden flex flex-col h-full">
              <div className="px-5 py-4 border-b border-secondary-100">
                <p className="font-semibold text-secondary-900">{selected.title || audienceLabel(selected)}</p>
                <p className="text-xs text-secondary-500">{audienceLabel(selected)}</p>
              </div>
              <div className="surface m-4 p-4 max-h-[28rem] overflow-y-auto space-y-3">
                {!detail ? <p className="text-secondary-400 text-sm">Lädt…</p> :
                  detail.messages?.filter((m: any) => !m.parentId).map((m: any) => (
                    <div key={m.id}>
                      <div className="flex gap-2">
                        <div className="avatar avatar-sm">{initials(m.senderName)}</div>
                        <div className="flex-1 min-w-0 bg-white rounded-xl border border-secondary-100 p-3">
                          <div className="flex justify-between gap-2 mb-0.5"><span className="font-semibold text-sm text-secondary-900">{m.senderName}</span><span className="text-xs text-secondary-400">{fmt(m.createdAt)}</span></div>
                          <p className="text-sm text-secondary-700 whitespace-pre-wrap break-words">{m.content}</p>
                        </div>
                      </div>
                      {m.replies?.length > 0 && (
                        <div className="ml-7 mt-2 space-y-2 border-l-2 border-secondary-100 pl-3">
                          {m.replies.map((r: any) => (
                            <div key={r.id} className="bg-white rounded-lg border border-secondary-100 p-2.5">
                              <div className="flex justify-between gap-2 mb-0.5"><span className="font-medium text-sm text-secondary-900">{r.senderName}</span><span className="text-xs text-secondary-400">{fmt(r.createdAt)}</span></div>
                              <p className="text-sm text-secondary-700 whitespace-pre-wrap break-words">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              {isAdmin ? (
                <div className="border-t border-secondary-100 p-4 flex items-end gap-3">
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Antwort…" className="input flex-1 resize-none" />
                  <button onClick={sendReply} disabled={busy || !reply.trim()} className="btn btn-primary px-6 shrink-0">{busy ? '…' : 'Senden'}</button>
                </div>
              ) : (
                <div className="border-t border-secondary-100 p-4 text-center text-sm text-secondary-400">Antworten können nur von Admins gesendet werden.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
