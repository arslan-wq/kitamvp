'use client';

import { useEffect, useRef, useState } from 'react';
import { resizeToSquare } from '@/lib/image';

interface Me {
  id: string;
  type: 'staff' | 'parent';
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: string;
  photoUrl?: string | null;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', KITA_LEITER: 'Leitung', BETREUER: 'Betreuer' };

export default function ProfileEditor() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Bearbeitbare Felder
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Me | null) => {
        if (d) {
          setMe(d);
          setName(d.name || '');
          setFirstName(d.firstName || '');
          setLastName(d.lastName || '');
          setPhone(d.phone || '');
          setPhoto(d.photoUrl || null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg('❌ Bitte eine Bilddatei wählen'); return; }
    try {
      setPhoto(await resizeToSquare(f));
    } catch {
      setMsg('❌ Bild konnte nicht verarbeitet werden');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const body = me?.type === 'parent'
        ? { firstName, lastName, phone, photoUrl: photo }
        : { name, photoUrl: photo };
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg('✅ Profil gespeichert');
        // Header-Foto sofort aktualisieren
        window.dispatchEvent(new Event('focus'));
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(`❌ ${d.error || 'Speichern fehlgeschlagen'}`);
      }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-8 text-secondary-500">Laden…</div>;
  if (!me) return <div className="alert alert-error">Profil konnte nicht geladen werden.</div>;

  const initials = (me.type === 'parent'
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`
    : name.charAt(0)).toUpperCase() || '?';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <p className="eyebrow">Konto</p>
        <h1 className="page-title">Mein Profil</h1>
        <p className="page-subtitle">Foto und persönliche Angaben bearbeiten</p>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <form onSubmit={save} className="card p-6 space-y-5">
        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-3xl shrink-0 ring-1 ring-secondary-200">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Profilfoto" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm">
                {photo ? '📷 Foto ändern' : '📷 Foto hochladen'}
              </button>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="btn btn-sm text-red-600 hover:bg-red-50">Entfernen</button>
              )}
            </div>
            <p className="text-xs text-secondary-400">JPG/PNG · wird automatisch verkleinert</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </div>

        {/* Felder */}
        {me.type === 'parent' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label label-required">Vorname</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div><label className="label label-required">Nachname</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
            <div><label className="label">Telefon</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label label-required">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><label className="label">Rolle</label><input className="input bg-secondary-100" value={ROLE_LABEL[me.role || ''] || me.role || ''} disabled /></div>
          </div>
        )}

        <div>
          <label className="label">E-Mail</label>
          <input className="input bg-secondary-100" value={me.email} disabled />
          <p className="help-text">E-Mail kann nicht selbst geändert werden.</p>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary px-6">{saving ? 'Speichert…' : '💾 Speichern'}</button>
        </div>
      </form>
    </div>
  );
}
