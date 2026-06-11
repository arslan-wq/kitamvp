'use client';

import { useState, useEffect, useCallback } from 'react';

interface Doc {
  id: string;
  childId: string | null;
  fileName: string;
  storageUrl: string;
  kind: string;
  uploadedAt: string;
}
interface Child { id: string; firstName: string; lastName: string; photoConsent?: boolean; }

// Bild auf max. Kantenlänge verkleinern (Seitenverhältnis erhalten) → JPEG Data-URL
function imageToDataUrl(file: File, max = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
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
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export default function DocumentGallery() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<'all' | 'photo' | 'document'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<Doc | null>(null);

  useEffect(() => {
    fetch('/api/children').then((r) => (r.ok ? r.json() : [])).then((d) => setChildren(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (selectedChildId) qs.set('childId', selectedChildId);
    if (kindFilter !== 'all') qs.set('kind', kindFilter);
    if (from) qs.set('startDate', from);
    if (to) qs.set('endDate', to);
    try {
      const res = await fetch(`/api/documents?${qs.toString()}`);
      setDocuments(res.ok ? await res.json() : []);
    } catch { setError('Laden fehlgeschlagen'); }
    finally { setLoading(false); }
  }, [selectedChildId, kindFilter, from, to]);
  useEffect(() => { load(); }, [load]);

  const consentOf = (id: string) => children.find((c) => c.id === id)?.photoConsent;

  const MAX_FILES = 6; // T5
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    setError('');
    if (files.length > MAX_FILES) {
      setError(`Maximal ${MAX_FILES} Dateien auf einmal — die ersten ${MAX_FILES} werden hochgeladen.`);
      files = files.slice(0, MAX_FILES);
    }
    // Vorab-Hinweis: Foto ohne Einwilligung (für gewähltes Kind)
    const hasImage = files.some((f) => f.type.startsWith('image/'));
    if (hasImage && selectedChildId && consentOf(selectedChildId) === false) {
      const c = children.find((x) => x.id === selectedChildId);
      setError(`Für ${c?.firstName} ${c?.lastName} liegt keine Foto-Einwilligung der Eltern vor. Es dürfen keine Bilder hochgeladen werden.`);
      return;
    }
    setUploading(true);
    let failed = 0;
    try {
      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const kind = isImage ? 'photo' : 'document';
        try {
          const dataUrl = isImage ? await imageToDataUrl(file) : await fileToDataUrl(file);
          const res = await fetch('/api/documents', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId: selectedChildId || null, fileName: file.name, storageUrl: dataUrl, kind }),
          });
          if (!res.ok) failed++;
        } catch { failed++; }
      }
      await load();
      if (failed > 0) setError(`${failed} von ${files.length} Datei(en) konnten nicht hochgeladen werden.`);
    } finally { setUploading(false); }
  };

  const del = async (doc: Doc) => {
    if (!confirm(`„${doc.fileName}" wirklich löschen?`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    if (res.ok) { setViewer(null); await load(); } else setError('Löschen fehlgeschlagen');
  };

  const isImg = (d: Doc) => d.kind === 'photo' || d.storageUrl.startsWith('data:image/');

  if (loading) return <div className="text-center py-12 text-secondary-500">Laden…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">🖼️ Bilder &amp; Dokumente</h1>
          <p className="page-subtitle">Fotos &amp; Dateien — Fotos nur mit Eltern-Einwilligung</p>
        </div>
        <label className="btn btn-primary cursor-pointer">
          <input type="file" accept="image/*,application/pdf" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
          {uploading ? 'Hochladen…' : '+ Hochladen (max. 6)'}
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Kind</label>
          <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} className="input">
            <option value="">Alle / Allgemein</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.photoConsent === false ? ' (keine Foto-Einwilligung)' : ''}</option>
            ))}
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

      {/* Einwilligungs-Hinweis für gewähltes Kind */}
      {selectedChildId && consentOf(selectedChildId) === false && (
        <div className="alert alert-warning">⚠️ Keine Foto-Einwilligung der Eltern — für dieses Kind dürfen keine Bilder hochgeladen werden.</div>
      )}

      {documents.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🖼️</div><p>Keine Einträge</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card overflow-hidden p-0 group">
              <button type="button" onClick={() => setViewer(doc)} className="block w-full text-left">
                {isImg(doc) ? (
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={doc.storageUrl} alt={doc.fileName} className="w-full h-44 object-cover group-hover:scale-105 transition" />
                    <span className="chip chip-neutral absolute top-2 left-2">Bild</span>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center bg-secondary-50">
                    <span className="text-5xl">📄</span>
                    <span className="chip chip-accent mt-2">Dokument</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-secondary-900 truncate">{doc.fileName}</p>
                  <p className="text-xs text-secondary-500 mt-0.5">{new Date(doc.uploadedAt).toLocaleDateString('de-CH')}</p>
                </div>
              </button>
              <div className="px-3 pb-3 flex justify-end">
                <button onClick={() => del(doc)} className="btn btn-sm text-red-600 hover:bg-red-50" title="Löschen">🗑️ Löschen</button>
              </div>
            </div>
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
              <div className="text-center py-8">
                <span className="text-6xl">📄</span>
                <p className="text-secondary-500 mt-2">{viewer.fileName}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <a href={viewer.storageUrl} download={viewer.fileName} className="btn btn-secondary btn-sm">⬇️ Herunterladen</a>
              <button onClick={() => del(viewer)} className="btn btn-sm text-red-600 hover:bg-red-50">🗑️ Löschen</button>
              <button onClick={() => setViewer(null)} className="btn btn-primary btn-sm px-5">Schliessen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
