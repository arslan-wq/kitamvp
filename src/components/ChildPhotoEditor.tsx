'use client';

import { useRef, useState } from 'react';

interface Props {
  childId: string;
  initialPhotoUrl?: string | null;
  initials: string;
  onChange?: (photoUrl: string | null) => void;
}

// Verkleinert ein Bild clientseitig auf ein 320px-Quadrat (cover) → JPEG Data-URL
function resizeToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 320;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        const scale = Math.max(S / img.width, S / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('img'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export default function ChildPhotoEditor({ childId, initialPhotoUrl, initials, onChange }: Props) {
  const [photo, setPhoto] = useState<string | null>(initialPhotoUrl || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (dataUrl: string | null) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/children/${childId}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: dataUrl }),
      });
      if (res.ok) {
        setPhoto(dataUrl);
        onChange?.(dataUrl);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Speichern fehlgeschlagen');
      }
    } catch {
      setError('Speichern fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Bitte eine Bilddatei wählen');
      return;
    }
    try {
      const dataUrl = await resizeToSquare(f);
      await save(dataUrl);
    } catch {
      setError('Bild konnte nicht verarbeitet werden');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-3xl shrink-0 ring-1 ring-secondary-200">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Profilfoto" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn btn-secondary btn-sm">
            {busy ? 'Lädt …' : photo ? '📷 Foto ändern' : '📷 Foto hochladen'}
          </button>
          {photo && (
            <button type="button" onClick={() => save(null)} disabled={busy} className="btn btn-sm text-red-600 hover:bg-red-50">
              Entfernen
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-xs text-secondary-400">JPG/PNG · wird automatisch verkleinert</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}
