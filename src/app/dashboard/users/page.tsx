'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { readFileAsDataUrl } from '@/lib/image';
import ImageCropper from '@/components/ImageCropper';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  KITA_LEITER: 'Leitung',
  BETREUER: 'Betreuer',
};
const ROLE_CHIP: Record<string, string> = {
  ADMIN: 'chip-primary',
  KITA_LEITER: 'chip-accent',
  BETREUER: 'chip-neutral',
};

// Foto-Auswahl: erzeugt eine verkleinerte Data-URL (kein Upload, wird mit dem Formular gespeichert)
function PhotoField({ value, onChange, initials }: { value: string | null; onChange: (v: string | null) => void; initials: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr('Bitte eine Bilddatei wählen'); return; }
    try { setCropSrc(await readFileAsDataUrl(f)); setErr(''); } catch { setErr('Bild konnte nicht verarbeitet werden'); }
  };
  return (
    <div className="flex items-center gap-4">
      {cropSrc && <ImageCropper src={cropSrc} onCancel={() => setCropSrc(null)} onCrop={(d) => { onChange(d); setCropSrc(null); }} />}
      <div className="w-20 h-20 rounded-full overflow-hidden bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-2xl shrink-0 ring-1 ring-secondary-200">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : initials}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button type="button" onClick={() => ref.current?.click()} className="btn btn-secondary btn-sm">
            {value ? '📷 Foto ändern' : '📷 Foto hochladen'}
          </button>
          {value && <button type="button" onClick={() => onChange(null)} className="btn btn-sm text-red-600 hover:bg-red-50">Entfernen</button>}
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

export default function UsersPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canManage = role === 'ADMIN' || role === 'KITA_LEITER';

  const [staff, setStaff] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [tab, setTab] = useState<'staff' | 'parent'>('staff');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [busyReset, setBusyReset] = useState<string | null>(null);
  const [busyLink, setBusyLink] = useState<string | null>(null);

  const [form, setForm] = useState<any>({ type: 'staff', email: '', name: '', role: 'BETREUER', locationId: '', firstName: '', lastName: '', phone: '', photoUrl: null });

  // Bearbeiten
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    const [uRes, lRes] = await Promise.all([fetch('/api/users'), fetch('/api/locations')]);
    if (uRes.ok) { const d = await uRes.json(); setStaff(d.staff || []); setParents(d.parents || []); }
    if (lRes.ok) setLocations(await lRes.json());
    setLoading(false);
  };
  useEffect(() => { if (canManage) load(); else setLoading(false); }, [canManage]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.photoUrl) { setMsg('❌ Bitte ein Profilfoto hochladen.'); return; }
    setSubmitting(true); setMsg('');
    try {
      const payload = form.type === 'staff'
        ? { type: 'staff', email: form.email, name: form.name, role: form.role, locationId: form.locationId || undefined, photoUrl: form.photoUrl }
        : { type: 'parent', email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined, photoUrl: form.photoUrl };
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`✅ Angelegt — eine E-Mail zum Passwort-Festlegen wurde an ${form.email} gesendet.`);
        setShowForm(false);
        setForm({ type: form.type, email: '', name: '', role: 'BETREUER', locationId: '', firstName: '', lastName: '', phone: '', photoUrl: null });
        load();
      } else {
        setMsg(`❌ ${d.error || 'Anlegen fehlgeschlagen'}`);
      }
    } finally { setSubmitting(false); }
  };

  const sendReset = async (email: string) => {
    setBusyReset(email); setMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setMsg(res.ok ? `✅ Einladungs-/Passwort-Mail an ${email} gesendet.` : '❌ Konnte Mail nicht senden.');
    } finally { setBusyReset(null); }
  };

  // „Link kopieren": frischen Set-Passwort-Link erzeugen + in Zwischenablage —
  // Fallback, falls die E-Mail nicht ankommt (Admin schickt ihn dann selbst).
  const copyInviteLink = async (p: any) => {
    setBusyLink(p.id); setMsg('');
    try {
      const res = await fetch(`/api/users/${p.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) { setMsg(`❌ ${d.error || 'Link konnte nicht erzeugt werden.'}`); return; }
      try {
        await navigator.clipboard.writeText(d.url);
        setMsg(`✅ Einladungs-Link kopiert (24 h gültig) — an ${p.email} weiterleiten.`);
      } catch {
        // Clipboard-API nicht verfügbar → Link im Hinweis anzeigen
        setMsg(`✅ Einladungs-Link (24 h gültig): ${d.url}`);
      }
    } finally { setBusyLink(null); }
  };

  const archiveParent = async (p: any, archive: boolean) => {
    setMsg('');
    const res = await fetch(`/api/users/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'parent', archive }),
    });
    if (res.ok) { setMsg(archive ? '✅ Elternteil archiviert.' : '✅ Aus dem Archiv geholt.'); load(); }
    else setMsg('❌ Aktion fehlgeschlagen.');
  };

  const deleteParent = async (p: any) => {
    const kids = (p.children || []).map((c: any) => c.firstName).join(', ');
    if (!confirm(`„${p.firstName} ${p.lastName}" endgültig löschen?${kids ? `\n\nDas verbundene Kind wird ebenfalls gelöscht: ${kids}` : ''}\n\nDies kann nicht rückgängig gemacht werden.`)) return;
    setMsg('');
    const res = await fetch(`/api/users/${p.id}?type=parent`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg(`✅ Gelöscht${d.deletedChildren ? ` (inkl. ${d.deletedChildren} Kind/er)` : ''}.`); load(); }
    else setMsg(`❌ ${d.error || 'Löschen fehlgeschlagen'}`);
  };

  const openEdit = (p: any) => {
    setEditing({ ...p, type: tab });
    setEditForm({
      name: p.name || '', email: p.email || '', role: p.role || 'BETREUER', locationId: p.locationId || '',
      firstName: p.firstName || '', lastName: p.lastName || '', phone: p.phone || '', photoUrl: p.photoUrl || null,
    });
    setMsg('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true); setMsg('');
    try {
      const payload = editing.type === 'staff'
        ? { type: 'staff', name: editForm.name, email: editForm.email, role: editForm.role, locationId: editForm.locationId || null, photoUrl: editForm.photoUrl }
        : { type: 'parent', firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, phone: editForm.phone, photoUrl: editForm.photoUrl };
      const res = await fetch(`/api/users/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg('✅ Gespeichert.');
        setEditing(null); setEditForm(null);
        load();
      } else {
        setMsg(`❌ ${d.error || 'Speichern fehlgeschlagen'}`);
      }
    } finally { setSavingEdit(false); }
  };

  if (!canManage) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <p className="text-lg font-medium text-secondary-900">Kein Zugriff</p>
        <p className="page-subtitle">Nur Admin und Leitung können Benutzer verwalten.</p>
      </div>
    );
  }
  if (loading) return <div className="text-center py-8 text-secondary-500">Laden…</div>;

  const initials = (a: string, b = '') => `${(a || '?').charAt(0)}${b.charAt(0)}`.toUpperCase();
  const Avatar = ({ src, label, size = 'md' }: { src?: string | null; label: string; size?: 'md' | 'lg' }) => (
    <div className={`${size === 'lg' ? 'w-20 h-20 text-2xl' : 'avatar avatar-md'} rounded-full overflow-hidden bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : label}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="page-title">Benutzer</h1>
        </div>
        {!showForm && tab === 'staff' && (
          <button onClick={() => { setForm((f: any) => ({ ...f, type: 'staff', photoUrl: null })); setShowForm(true); }} className="btn btn-primary">+ Personal hinzufügen</button>
        )}
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {/* Tabs */}
      <div className="inline-flex rounded-xl bg-secondary-100 p-1">
        <button onClick={() => setTab('staff')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'staff' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>Personal ({staff.length})</button>
        <button onClick={() => setTab('parent')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'parent' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>Eltern ({parents.length})</button>
      </div>

      {/* Anlege-Formular — nur Personal. Eltern werden über das Anlegen eines Kindes eingeladen. */}
      {showForm && (
        <form onSubmit={create} className="card p-6 sm:p-8 space-y-4">
          <p className="text-sm text-secondary-500">Eltern werden automatisch beim Anlegen eines Kindes per E-Mail eingeladen und erscheinen danach hier.</p>

          {/* Pflicht-Profilfoto */}
          <div>
            <label className="label label-required">Profilfoto</label>
            <PhotoField value={form.photoUrl} onChange={(v) => setForm({ ...form, photoUrl: v })}
              initials={form.type === 'staff' ? initials(form.name) : initials(form.firstName, form.lastName)} />
          </div>

          {form.type === 'staff' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label label-required">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Anna Müller" required /></div>
              <div><label className="label label-required">E-Mail</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><label className="label label-required">Rolle</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="BETREUER">Betreuer</option>
                  <option value="KITA_LEITER">Leitung</option>
                  {role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              <div><label className="label">Standort</label>
                <select className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                  <option value="">— Kein Standort —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label label-required">Vorname</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div><label className="label label-required">Nachname</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
              <div><label className="label label-required">E-Mail</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><label className="label">Telefon</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
          )}
          <p className="help-text">Die Person erhält automatisch eine E-Mail, um ihr Passwort selbst festzulegen.</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Abbrechen</button>
            <button type="submit" disabled={submitting} className="btn btn-primary px-6">{submitting ? 'Wird angelegt…' : 'Anlegen & einladen'}</button>
          </div>
        </form>
      )}

      {/* Liste — anklickbare Karten */}
      {(() => {
        const PersonCard = ({ p, archived = false }: { p: any; archived?: boolean }) => {
          const name = tab === 'staff' ? p.name : `${p.firstName} ${p.lastName}`;
          const ini = tab === 'staff' ? initials(p.name) : initials(p.firstName, p.lastName);
          return (
            <div className={`card p-4 flex items-center gap-3 ${archived ? 'opacity-70' : ''}`}>
              <button onClick={() => openEdit(p)} className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition" title="Bearbeiten">
                <Avatar src={p.photoUrl} label={ini} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-secondary-900 truncate">{name}</p>
                    {tab === 'staff'
                      ? <span className={`chip ${ROLE_CHIP[p.role] || 'chip-neutral'}`}>{ROLE_LABEL[p.role] || p.role}</span>
                      : <span className="chip chip-neutral">Eltern</span>}
                    {archived && <span className="chip chip-warning">Archiviert</span>}
                  </div>
                  <p className="text-sm text-secondary-500 truncate">{p.email}</p>
                  {tab === 'staff' && p.location && <p className="text-xs text-secondary-400">📍 {p.location.name}</p>}
                  {tab === 'parent' && p.children?.length > 0 && (
                    <p className="text-xs text-secondary-400">Kinder: {p.children.map((c: any) => c.firstName).join(', ')}</p>
                  )}
                </div>
              </button>
              <div className="flex flex-col gap-1.5 shrink-0">
                {!archived && <button onClick={() => openEdit(p)} className="btn btn-secondary btn-sm" title="Bearbeiten">✏️ Bearbeiten</button>}
                {!archived && (
                  <button onClick={() => sendReset(p.email)} disabled={busyReset === p.email} className="btn btn-secondary btn-sm" title="Einladungs-/Passwort-Mail senden">
                    {busyReset === p.email ? '…' : '✉️ Einladung'}
                  </button>
                )}
                {!archived && (
                  <button onClick={() => copyInviteLink(p)} disabled={busyLink === p.id} className="btn btn-secondary btn-sm" title="Einladungs-Link kopieren (Fallback, falls die E-Mail nicht ankommt)">
                    {busyLink === p.id ? '…' : '🔗 Link'}
                  </button>
                )}
                {tab === 'parent' && !archived && (
                  <button onClick={() => archiveParent(p, true)} className="btn btn-secondary btn-sm" title="Archivieren">🗄️ Archivieren</button>
                )}
                {tab === 'parent' && archived && (
                  <>
                    <button onClick={() => archiveParent(p, false)} className="btn btn-secondary btn-sm" title="Aus Archiv holen">↩ Wiederherstellen</button>
                    <button onClick={() => deleteParent(p)} className="btn btn-sm text-red-600 hover:bg-red-50" title="Endgültig löschen">🗑️ Löschen</button>
                  </>
                )}
              </div>
            </div>
          );
        };

        if (tab === 'staff') {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map((p: any) => <PersonCard key={p.id} p={p} />)}
              {staff.length === 0 && <p className="text-secondary-500">Keine Einträge.</p>}
            </div>
          );
        }

        const active = parents.filter((p: any) => !p.archivedAt);
        const archivedList = parents.filter((p: any) => p.archivedAt);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.map((p: any) => <PersonCard key={p.id} p={p} />)}
              {active.length === 0 && <p className="text-secondary-500">Keine aktiven Eltern.</p>}
            </div>
            {archivedList.length > 0 && (
              <div>
                <p className="eyebrow mb-3">🗄️ Archiv ({archivedList.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivedList.map((p: any) => <PersonCard key={p.id} p={p} archived />)}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Bearbeiten-Modal */}
      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveEdit} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-elevated">
            <h2 className="text-xl font-bold text-secondary-900">{editing.type === 'staff' ? 'Personal bearbeiten' : 'Elternteil bearbeiten'}</h2>

            <div>
              <label className="label">Profilfoto</label>
              <PhotoField value={editForm.photoUrl} onChange={(v) => setEditForm({ ...editForm, photoUrl: v })}
                initials={editing.type === 'staff' ? initials(editForm.name) : initials(editForm.firstName, editForm.lastName)} />
            </div>

            {editing.type === 'staff' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label label-required">Name</label><input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
                <div><label className="label label-required">E-Mail</label><input type="email" className="input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required /></div>
                <div><label className="label">Rolle</label>
                  <select className="input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} disabled={role !== 'ADMIN'}>
                    <option value="BETREUER">Betreuer</option>
                    <option value="KITA_LEITER">Leitung</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {role !== 'ADMIN' && <p className="help-text">Nur Admins können Rollen ändern.</p>}
                </div>
                <div><label className="label">Standort</label>
                  <select className="input" value={editForm.locationId} onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}>
                    <option value="">— Kein Standort —</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label label-required">Vorname</label><input className="input" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required /></div>
                <div><label className="label label-required">Nachname</label><input className="input" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required /></div>
                <div><label className="label label-required">E-Mail</label><input type="email" className="input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required /></div>
                <div><label className="label">Telefon</label><input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
            )}
            <p className="help-text">Das Passwort kann nicht hier geändert werden — nutze „Reset" für eine Passwort-Mail.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-secondary">Abbrechen</button>
              <button type="submit" disabled={savingEdit} className="btn btn-primary px-6">{savingEdit ? 'Speichert…' : '💾 Speichern'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
