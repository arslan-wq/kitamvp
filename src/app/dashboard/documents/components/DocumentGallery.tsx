'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  childId: string | null;
  fileName: string;
  storageUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

export default function DocumentGallery() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childRes = await fetch('/api/children');
        if (!childRes.ok) throw new Error('Failed to fetch children');
        const childData = await childRes.json();
        setChildren(childData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const query = selectedChildId ? `?childId=${selectedChildId}` : '';
        const response = await fetch(`/api/documents${query}`);
        if (!response.ok) throw new Error('Failed to fetch documents');
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchDocuments();
  }, [selectedChildId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          childId: selectedChildId || null,
          fileName: file.name,
          storageUrl: URL.createObjectURL(file),
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to upload document');
      const newDoc = await response.json();
      setDocuments([newDoc, ...documents]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="empty-state">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Seitenkopf mit Aktion */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">🖼️ Bilder & Dokumente</h1>
          <p className="page-subtitle">Fotos und Dateien zentral verwalten</p>
        </div>
        <label className="btn btn-primary cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? 'Hochladen…' : '+ Datei hochladen'}
        </label>
      </div>

      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value">{documents.length}</p>
          <p className="stat-label">Dateien angezeigt</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{children.length}</p>
          <p className="stat-label">Kinder</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{selectedChildId ? '1' : 'Alle'}</p>
          <p className="stat-label">Aktiver Filter</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter & Upload-Zone */}
      <div className="card p-6">
        <p className="eyebrow mb-3">Filter & Upload</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Filter nach Kind</label>
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value || null)}
              className="input"
            >
              <option value="">Alle Bilder</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>
          <label className="surface flex flex-col items-center justify-center gap-1 text-center cursor-pointer hover:bg-secondary-100 transition">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <span className="text-2xl">📤</span>
            <span className="text-sm font-medium text-secondary-900">
              {uploading ? 'Hochladen…' : 'Datei hierher oder klicken'}
            </span>
            <span className="text-xs text-secondary-500">Nur Bilddateien</span>
          </label>
        </div>
      </div>

      {/* Galerie */}
      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <p>Keine Bilder vorhanden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card overflow-hidden p-0 group">
              <div className="relative overflow-hidden">
                <img
                  src={doc.storageUrl}
                  alt={doc.fileName}
                  className="w-full h-44 object-cover group-hover:scale-105 transition"
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ccc" width="200" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666" font-family="Arial" font-size="16"%3EBild%3C/text%3E%3C/svg%3E';
                  }}
                />
                <span className="chip chip-neutral absolute top-2 left-2">Bild</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-secondary-900 truncate">{doc.fileName}</p>
                <p className="text-xs text-secondary-500 mt-0.5">
                  {new Date(doc.uploadedAt).toLocaleDateString('de-CH')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
