'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  fileName: string;
  storageUrl: string;
  uploadedAt: string;
  childId?: string;
  child?: { firstName: string; lastName: string };
}

export default function ParentDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childRes = await fetch('/api/parent/children');
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
        let url = '/api/parent/documents';
        if (selectedChildId) {
          url += `?childId=${selectedChildId}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch documents');
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchDocuments();
  }, [selectedChildId]);

  if (loading) {
    return <div className="text-center text-secondary-500 py-16">Lädt…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">📸 Fotos &amp; Dokumente</h1>
          <p className="page-subtitle">Geteilte Momente und Unterlagen Ihrer Kinder</p>
        </div>
        <div className="w-full sm:w-64">
          <label className="label">Nach Kind filtern</label>
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value || null)}
            className="input"
          >
            <option value="">Alle Kinder</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value">{documents.length}</p>
          <p className="stat-label">Geteilte Dateien</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{documents.filter((d) => d.storageUrl).length}</p>
          <p className="stat-label">Mit Vorschau</p>
        </div>
        <div className="stat-card col-span-2 lg:col-span-1">
          <p className="stat-value">
            {children.length || (selectedChildId ? 1 : 0)}
          </p>
          <p className="stat-label">Kinder</p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <p className="text-secondary-900 font-semibold">Noch keine Fotos oder Dokumente geteilt</p>
          <p className="page-subtitle">Sobald die KiTA etwas teilt, erscheint es hier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="card overflow-hidden p-0 hover:-translate-y-0.5 transition-all"
            >
              {doc.storageUrl && (
                <img
                  src={doc.storageUrl}
                  alt={doc.fileName}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4 space-y-2">
                <p className="font-semibold text-secondary-900 truncate">
                  {doc.fileName}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {doc.child && (
                    <span className="chip chip-accent">
                      <span className="avatar avatar-sm !w-5 !h-5 !text-[10px] !rounded-md">
                        {doc.child.firstName.charAt(0)}{doc.child.lastName.charAt(0)}
                      </span>
                      {doc.child.firstName} {doc.child.lastName}
                    </span>
                  )}
                  <span className="chip chip-neutral">
                    {new Date(doc.uploadedAt).toLocaleDateString('de-CH')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
