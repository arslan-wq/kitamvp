'use client';

import { useState, useEffect, useCallback } from 'react';

interface Doc {
  id: string;
  fileName: string;
  storageUrl: string;
  kind?: string;
  uploadedAt: string;
  childId?: string | null;
  child?: { firstName: string; lastName: string } | null;
}

export default function ParentDocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'photo' | 'document'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [viewer, setViewer] = useState<Doc | null>(null);

  useEffect(() => {
    fetch('/api/parent/children').then((r) => (r.ok ? r.json() : [])).then((d) => setChildren(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (selectedChildId) qs.set('childId', selectedChildId);
    if (kindFilter !== 'all') qs.set('kind', kindFilter);
    if (from) qs.set('startDate', from);
    if (to) qs.set('endDate', to);
    try {
      const res = await fetch(`/api/parent/documents?${qs.toString()}`);
      setDocuments(res.ok ? await res.json() : []);
    } catch { setError('Laden fehlgeschlagen'); }
    finally { setLoading(false); }
  }, [selectedChildId, kindFilter, from, to]);
  useEffect(() => { load(); }, [load]);

  const isImg = (d: Doc) => d.kind === 'photo' || d.storageUrl?.startsWith('data:image/');

  if (loading) return <div className="text-center text-secondary-500 py-16">Lädt…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">📸 Fotos &amp; Dokumente</h1>
        <p className="page-subtitle">Geteilte Momente und Unterlagen Ihrer Kinder</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Kind</label>
          <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} className="input">
            <option value="">Alle Kinder</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Typ</label>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as any)} className="input">
            <option value="all">Alle</option>
            <option value="photo">Bilder</option>
            <option value="document">Dokumente</option>
          </select>
        </div>
        <div><label className="label">Von</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">Bis</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <p className="text-secondary-900 font-semibold">Noch nichts geteilt</p>
          <p className="page-subtitle">Sobald die KiTA etwas teilt, erscheint es hier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <button key={doc.id} type="button" onClick={() => setViewer(doc)} className="card overflow-hidden p-0 hover:-translate-y-0.5 transition-all text-left">
              {isImg(doc) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.storageUrl} alt={doc.fileName} className="w-full h-48 object-cover" />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center bg-secondary-50">
                  <span className="text-5xl">📄</span><span className="chip chip-accent mt-2">Dokument</span>
                </div>
              )}
              <div className="p-4 space-y-2">
                <p className="font-semibold text-secondary-900 truncate">{doc.fileName}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {doc.child && <span className="chip chip-accent">{doc.child.firstName} {doc.child.lastName}</span>}
                  <span className="chip chip-neutral">{new Date(doc.uploadedAt).toLocaleDateString('de-CH')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Viewer-Popup */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 shadow-elevated">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="font-semibold text-secondary-900 truncate">{viewer.fileName}</p>
              <button onClick={() => setViewer(null)} className="btn-icon w-8 h-8 text-secondary-400 hover:bg-secondary-100">✕</button>
            </div>
            {isImg(viewer) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.storageUrl} alt={viewer.fileName} className="w-full rounded-xl" />
            ) : (
              <div className="text-center py-8"><span className="text-6xl">📄</span><p className="text-secondary-500 mt-2">{viewer.fileName}</p></div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <a href={viewer.storageUrl} download={viewer.fileName} className="btn btn-secondary btn-sm">⬇️ Herunterladen</a>
              <button onClick={() => setViewer(null)} className="btn btn-primary btn-sm px-5">Schliessen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
