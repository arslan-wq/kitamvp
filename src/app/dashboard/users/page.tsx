'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

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

  const [form, setForm] = useState<any>({ type: 'staff', email: '', name: '', role: 'BETREUER', locationId: '', firstName: '', lastName: '', phone: '' });

  const load = async () => {
    const [uRes, lRes] = await Promise.all([fetch('/api/users'), fetch('/api/locations')]);
    if (uRes.ok) { const d = await uRes.json(); setStaff(d.staff || []); setParents(d.parents || []); }
    if (lRes.ok) setLocations(await lRes.json());
    setLoading(false);
  };
  useEffect(() => { if (canManage) load(); else setLoading(false); }, [canManage]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg('');
    try {
      const payload = form.type === 'staff'
        ? { type: 'staff', email: form.email, name: form.name, role: form.role, locationId: form.locationId || undefined }
        : { type: 'parent', email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined };
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`✅ Angelegt — eine E-Mail zum Passwort-Festlegen wurde an ${form.email} gesendet.`);
        setShowForm(false);
        setForm({ type: form.type, email: '', name: '', role: 'BETREUER', locationId: '', firstName: '', lastName: '', phone: '' });
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
      setMsg(res.ok ? `✅ Passwort-Reset-Mail an ${email} gesendet.` : '❌ Konnte Reset-Mail nicht senden.');
    } finally { setBusyReset(null); }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="page-title">Benutzer</h1>
        </div>
        {!showForm && (
          <button onClick={() => { setForm((f: any) => ({ ...f, type: tab })); setShowForm(true); }} className="btn btn-primary">+ Person hinzufügen</button>
        )}
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {/* Tabs */}
      <div className="inline-flex rounded-xl bg-secondary-100 p-1">
        <button onClick={() => setTab('staff')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'staff' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>Personal ({staff.length})</button>
        <button onClick={() => setTab('parent')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'parent' ? 'bg-white shadow-sm text-secondary-900' : 'text-secondary-500'}`}>Eltern ({parents.length})</button>
      </div>

      {/* Anlege-Formular */}
      {showForm && (
        <form onSubmit={create} className="card p-6 sm:p-8 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm((f: any) => ({ ...f, type: 'staff' }))} className={`btn btn-sm ${form.type === 'staff' ? 'btn-primary' : 'btn-secondary'}`}>Personal</button>
            <button type="button" onClick={() => setForm((f: any) => ({ ...f, type: 'parent' }))} className={`btn btn-sm ${form.type === 'parent' ? 'btn-primary' : 'btn-secondary'}`}>Elternteil</button>
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

      {/* Liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(tab === 'staff' ? staff : parents).map((p: any) => {
          const name = tab === 'staff' ? p.name : `${p.firstName} ${p.lastName}`;
          return (
            <div key={p.id} className="card p-4 flex items-center gap-3">
              <div className="avatar avatar-md">{tab === 'staff' ? initials(p.name) : initials(p.firstName, p.lastName)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-secondary-900 truncate">{name}</p>
                  {tab === 'staff' ? (
                    <span className={`chip ${ROLE_CHIP[p.role] || 'chip-neutral'}`}>{ROLE_LABEL[p.role] || p.role}</span>
                  ) : (
                    <span className="chip chip-neutral">Eltern</span>
                  )}
                </div>
                <p className="text-sm text-secondary-500 truncate">{p.email}</p>
                {tab === 'staff' && p.location && <p className="text-xs text-secondary-400">📍 {p.location.name}</p>}
                {tab === 'parent' && p.children?.length > 0 && (
                  <p className="text-xs text-secondary-400">Kinder: {p.children.map((c: any) => c.firstName).join(', ')}</p>
                )}
              </div>
              <button onClick={() => sendReset(p.email)} disabled={busyReset === p.email} className="btn btn-secondary btn-sm shrink-0" title="Passwort-Reset-Mail senden">
                {busyReset === p.email ? '…' : '🔑 Reset'}
              </button>
            </div>
          );
        })}
        {(tab === 'staff' ? staff : parents).length === 0 && (
          <p className="text-secondary-500">Keine Einträge.</p>
        )}
      </div>
    </div>
  );
}
