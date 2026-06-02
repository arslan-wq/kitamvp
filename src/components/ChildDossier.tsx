'use client';

import { useState } from 'react';
import ChildTimeline from './ChildTimeline';

const STATUS_DE: Record<string, string> = {
  ACTIVE: 'Aktiv', PENDING: 'Ausstehend', EXPIRED: 'Abgelaufen', TERMINATED: 'Beendet', CANCELLED: 'Storniert',
};

function fmtDate(s?: string | null) {
  return s ? new Date(s).toLocaleDateString('de-CH') : '—';
}
function calcAge(birth: string) {
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

interface Props {
  child: any;
  /** '/api/activities' (Personal) oder '/api/parent/activities' (Eltern) */
  activitiesBase: string;
  /** true = darf medizinisches Dossier / Allergien / Stammdaten bearbeiten (Personal ODER Eltern) */
  editable?: boolean;
  /** true = Personal — schaltet personal-only Features frei (z.B. Einladung senden) */
  isStaff?: boolean;
  /** E-Mail des aktuellen Betrachters (für Eltern: eigenen Kontakt bearbeiten) */
  viewerEmail?: string | null;
}

const toCsv = (a?: string[]) => (Array.isArray(a) ? a.join(', ') : '');
const fromCsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
const dateInput = (s?: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : '');

export default function ChildDossier({ child, activitiesBase, editable = false, isStaff = false, viewerEmail = null }: Props) {
  const [mr, setMr] = useState<any>(child.medicalRecord);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState<any>({});

  const [vaccinations, setVaccinations] = useState<any[]>(child.medicalRecord?.vaccinations || []);
  const [history, setHistory] = useState<any[]>(child.medicalRecord?.healthHistory || []);
  const [allergies, setAllergies] = useState<any[]>(child.allergies || []);
  const [vaccForm, setVaccForm] = useState<any>(null); // null = geschlossen
  const [histForm, setHistForm] = useState<any>(null);
  const [allergyForm, setAllergyForm] = useState<any>(null);
  const [subSaving, setSubSaving] = useState(false);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);

  // Stammdaten bearbeiten
  const [core, setCore] = useState({ firstName: child.firstName, lastName: child.lastName, birthDate: child.birthDate });
  const [coreEdit, setCoreEdit] = useState(false);
  const [coreForm, setCoreForm] = useState<any>({});
  const saveCore = async () => {
    setSubSaving(true);
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: coreForm.firstName, lastName: coreForm.lastName, birthDate: coreForm.birthDate }),
      });
      if (res.ok) { setCore({ ...core, ...coreForm }); setCoreEdit(false); }
      else setSaveError('Stammdaten konnten nicht gespeichert werden.');
    } finally { setSubSaving(false); }
  };

  // Notfallkontakte (Eltern) bearbeiten
  const [parentsState, setParentsState] = useState<any[]>(child.parents || []);
  const [contactForm, setContactForm] = useState<any>(null); // {id, firstName, lastName, phone}
  const saveContact = async () => {
    if (!contactForm) return;
    setSubSaving(true);
    try {
      const res = await fetch(`/api/parents/${contactForm.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: contactForm.firstName, lastName: contactForm.lastName, phone: contactForm.phone }),
      });
      if (res.ok) {
        const upd = await res.json();
        setParentsState(ps => ps.map(p => p.id === upd.id ? { ...p, ...upd } : p));
        setContactForm(null);
      } else setSaveError('Kontakt konnte nicht gespeichert werden.');
    } finally { setSubSaving(false); }
  };

  const openEdit = () => {
    setForm({
      bloodType: mr?.bloodType || '',
      height: mr?.height ?? '',
      weight: mr?.weight ?? '',
      lastCheckupDate: dateInput(mr?.lastCheckupDate),
      nextCheckupDate: dateInput(mr?.nextCheckupDate),
      pediatricianName: mr?.pediatricianName || '',
      pediatricianPhone: mr?.pediatricianPhone || '',
      primaryDoctor: mr?.primaryDoctor || '',
      primaryDoctorPhone: mr?.primaryDoctorPhone || '',
      primaryDoctorSpecialty: mr?.primaryDoctorSpecialty || '',
      emergencyDoctor: mr?.emergencyDoctor || '',
      emergencyDoctorPhone: mr?.emergencyDoctorPhone || '',
      conditions: toCsv(mr?.conditions),
      medications: toCsv(mr?.medications),
      emergencyInfo: mr?.emergencyInfo || '',
    });
    setSaveError('');
    setEditing(true);
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const saveMedical = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload: any = {
        childId: child.id,
        kitaId: child.kitaId,
        bloodType: form.bloodType || null,
        height: form.height === '' ? null : Number(form.height),
        weight: form.weight === '' ? null : Number(form.weight),
        lastCheckupDate: form.lastCheckupDate ? new Date(form.lastCheckupDate).toISOString() : null,
        nextCheckupDate: form.nextCheckupDate ? new Date(form.nextCheckupDate).toISOString() : null,
        pediatricianName: form.pediatricianName || null,
        pediatricianPhone: form.pediatricianPhone || null,
        primaryDoctor: form.primaryDoctor || null,
        primaryDoctorPhone: form.primaryDoctorPhone || null,
        primaryDoctorSpecialty: form.primaryDoctorSpecialty || null,
        emergencyDoctor: form.emergencyDoctor || null,
        emergencyDoctorPhone: form.emergencyDoctorPhone || null,
        conditions: fromCsv(form.conditions),
        medications: fromCsv(form.medications),
        emergencyInfo: form.emergencyInfo || null,
      };
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSaveError('Speichern fehlgeschlagen.');
      } else {
        const updated = await res.json();
        setMr(updated);
        if (Array.isArray(updated.vaccinations)) setVaccinations(updated.vaccinations);
        if (Array.isArray(updated.healthHistory)) setHistory(updated.healthHistory);
        setEditing(false);
      }
    } catch {
      setSaveError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const addVaccination = async () => {
    if (!vaccForm?.vaccineName || !vaccForm?.vaccinationDate) {
      setSaveError('Impfung: Name und Datum sind erforderlich.');
      return;
    }
    setSubSaving(true);
    try {
      const res = await fetch('/api/medical-records/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          kitaId: child.kitaId,
          vaccineName: vaccForm.vaccineName,
          vaccinationDate: new Date(vaccForm.vaccinationDate).toISOString(),
          nextDueDate: vaccForm.nextDueDate ? new Date(vaccForm.nextDueDate).toISOString() : undefined,
          givenBy: vaccForm.givenBy || undefined,
        }),
      });
      if (res.ok) {
        const v = await res.json();
        setVaccinations(p => [v, ...p]);
        setVaccForm(null);
        setSaveError('');
      } else setSaveError('Impfung konnte nicht gespeichert werden.');
    } finally {
      setSubSaving(false);
    }
  };

  const addHistory = async () => {
    if (!histForm?.condition || !histForm?.eventType || !histForm?.date) {
      setSaveError('Krankengeschichte: Ereignis, Bezeichnung und Datum sind erforderlich.');
      return;
    }
    setSubSaving(true);
    try {
      const res = await fetch('/api/medical-records/health-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          kitaId: child.kitaId,
          eventType: histForm.eventType,
          condition: histForm.condition,
          date: new Date(histForm.date).toISOString(),
          severity: histForm.severity || undefined,
          treatment: histForm.treatment || undefined,
          doctorName: histForm.doctorName || undefined,
          hospitalAdmitted: !!histForm.hospitalAdmitted,
        }),
      });
      if (res.ok) {
        const h = await res.json();
        setHistory(p => [h, ...p]);
        setHistForm(null);
        setSaveError('');
      } else setSaveError('Eintrag konnte nicht gespeichert werden.');
    } finally {
      setSubSaving(false);
    }
  };

  const addAllergy = async () => {
    if (!allergyForm?.allergen) {
      setSaveError('Allergen ist erforderlich.');
      return;
    }
    setSubSaving(true);
    try {
      const res = await fetch('/api/allergies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          allergen: allergyForm.allergen,
          severity: allergyForm.severity || 'MODERATE',
          notes: allergyForm.notes || undefined,
        }),
      });
      if (res.ok) {
        const a = await res.json();
        setAllergies(p => [...p, a]);
        setAllergyForm(null);
        setSaveError('');
      } else setSaveError('Allergie konnte nicht gespeichert werden.');
    } finally {
      setSubSaving(false);
    }
  };

  const removeAllergy = async (id: string) => {
    if (!confirm('Diese Allergie entfernen?')) return;
    const res = await fetch(`/api/allergies/${id}`, { method: 'DELETE' });
    if (res.ok) setAllergies(p => p.filter(a => a.id !== id));
  };

  const resendInvite = async (email: string) => {
    setInvitingEmail(email);
    try {
      const res = await fetch(`/api/children/${child.id}/resend-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentEmail: email }),
      });
      if (res.ok) alert(`✅ Einladung an ${email} gesendet.`);
      else alert('❌ Einladung konnte nicht gesendet werden.');
    } catch {
      alert('❌ Einladung konnte nicht gesendet werden.');
    } finally {
      setInvitingEmail(null);
    }
  };

  const documents: any[] = child.documents || [];
  const contracts: any[] = child.contracts || [];
  const attendance: any[] = child.attendance || [];

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div className="surface p-3">
      <p className="text-xs text-secondary-400">{label}</p>
      <p className="font-semibold text-secondary-900 mt-0.5 break-words">{value || '—'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stammdaten */}
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="eyebrow">👤 Stammdaten</p>
          {editable && !coreEdit && (
            <button onClick={() => { setCoreForm({ firstName: core.firstName, lastName: core.lastName, birthDate: dateInput(core.birthDate) }); setCoreEdit(true); }} className="btn btn-secondary btn-sm">✏️ Bearbeiten</button>
          )}
        </div>
        {coreEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="label">Vorname</label><input className="input" value={coreForm.firstName} onChange={e => setCoreForm({ ...coreForm, firstName: e.target.value })} /></div>
            <div><label className="label">Nachname</label><input className="input" value={coreForm.lastName} onChange={e => setCoreForm({ ...coreForm, lastName: e.target.value })} /></div>
            <div><label className="label">Geburtsdatum</label><input type="date" className="input" value={coreForm.birthDate} onChange={e => setCoreForm({ ...coreForm, birthDate: e.target.value })} /></div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <button onClick={() => setCoreEdit(false)} className="btn btn-secondary btn-sm" disabled={subSaving}>Abbrechen</button>
              <button onClick={saveCore} className="btn btn-primary btn-sm" disabled={subSaving}>{subSaving ? '…' : 'Speichern'}</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Name" value={`${core.firstName} ${core.lastName}`} />
            <Field label="Geburtsdatum" value={fmtDate(core.birthDate)} />
            <Field label="Alter" value={`${calcAge(core.birthDate)} Jahre`} />
            <Field label="Standort" value={child.location?.name} />
          </div>
        )}
      </section>

      {/* Eltern & Kontakte */}
      <section className="card p-6 sm:p-8">
        <p className="eyebrow mb-4">👪 Eltern & Notfallkontakte</p>
        {parentsState.length === 0 ? (
          <p className="text-sm text-secondary-500">Keine Kontakte hinterlegt.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parentsState.map((p) => {
              const canEditContact = editable && (isStaff || viewerEmail === p.email);
              const isEditingThis = contactForm?.id === p.id;
              return (
                <div key={p.id} className="surface p-4 flex flex-col gap-2">
                  {isEditingThis ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" value={contactForm.firstName} onChange={e => setContactForm({ ...contactForm, firstName: e.target.value })} placeholder="Vorname" />
                        <input className="input" value={contactForm.lastName} onChange={e => setContactForm({ ...contactForm, lastName: e.target.value })} placeholder="Nachname" />
                      </div>
                      <input className="input" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="📞 Telefon" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setContactForm(null)} className="btn btn-secondary btn-sm" disabled={subSaving}>Abbrechen</button>
                        <button onClick={saveContact} className="btn btn-primary btn-sm" disabled={subSaving}>{subSaving ? '…' : 'Speichern'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-secondary-900">{p.firstName} {p.lastName}</p>
                        <p className="text-sm text-secondary-600 break-words">✉️ {p.email}</p>
                        {p.phone && <p className="text-sm text-secondary-600">📞 {p.phone}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canEditContact && (
                          <button onClick={() => setContactForm({ id: p.id, firstName: p.firstName, lastName: p.lastName, phone: p.phone || '' })} className="btn btn-secondary btn-sm">✏️ Kontakt bearbeiten</button>
                        )}
                        {isStaff && (
                          <button onClick={() => resendInvite(p.email)} disabled={invitingEmail === p.email} className="btn btn-secondary btn-sm">
                            {invitingEmail === p.email ? 'Sendet…' : '✉️ Einladung senden'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Medizinisches Dossier */}
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="eyebrow">🏥 Medizinisches Dossier</p>
          {editable && !editing && (
            <button onClick={openEdit} className="btn btn-secondary btn-sm">✏️ Bearbeiten</button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            {saveError && <div className="alert alert-error">{saveError}</div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="label">Blutgruppe</label><input className="input" value={form.bloodType} onChange={e => set('bloodType', e.target.value)} placeholder="z.B. A+" /></div>
              <div><label className="label">Größe (cm)</label><input type="number" className="input" value={form.height} onChange={e => set('height', e.target.value)} /></div>
              <div><label className="label">Gewicht (kg)</label><input type="number" className="input" value={form.weight} onChange={e => set('weight', e.target.value)} /></div>
              <div><label className="label">Letzte Unters.</label><input type="date" className="input" value={form.lastCheckupDate} onChange={e => set('lastCheckupDate', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="label">Kinderarzt</label><input className="input" value={form.pediatricianName} onChange={e => set('pediatricianName', e.target.value)} /></div>
              <div><label className="label">Kinderarzt Tel.</label><input className="input" value={form.pediatricianPhone} onChange={e => set('pediatricianPhone', e.target.value)} /></div>
              <div><label className="label">Nächste Unters.</label><input type="date" className="input" value={form.nextCheckupDate} onChange={e => set('nextCheckupDate', e.target.value)} /></div>
              <div><label className="label">Hausarzt</label><input className="input" value={form.primaryDoctor} onChange={e => set('primaryDoctor', e.target.value)} /></div>
              <div><label className="label">Hausarzt Tel.</label><input className="input" value={form.primaryDoctorPhone} onChange={e => set('primaryDoctorPhone', e.target.value)} /></div>
              <div><label className="label">Fachrichtung</label><input className="input" value={form.primaryDoctorSpecialty} onChange={e => set('primaryDoctorSpecialty', e.target.value)} /></div>
              <div><label className="label">Notfall-Arzt</label><input className="input" value={form.emergencyDoctor} onChange={e => set('emergencyDoctor', e.target.value)} /></div>
              <div><label className="label">Notfall-Arzt Tel.</label><input className="input" value={form.emergencyDoctorPhone} onChange={e => set('emergencyDoctorPhone', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Chronische Bedingungen <span className="text-gray-400 font-normal">(Komma-getrennt)</span></label><input className="input" value={form.conditions} onChange={e => set('conditions', e.target.value)} placeholder="z.B. Asthma, Neurodermitis" /></div>
              <div><label className="label">Medikamente <span className="text-gray-400 font-normal">(Komma-getrennt)</span></label><input className="input" value={form.medications} onChange={e => set('medications', e.target.value)} /></div>
            </div>
            <div><label className="label">Notfall-Hinweis</label><textarea className="input" rows={2} value={form.emergencyInfo} onChange={e => set('emergencyInfo', e.target.value)} /></div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(false)} className="btn btn-secondary" disabled={saving}>Abbrechen</button>
              <button onClick={saveMedical} className="btn btn-primary px-6" disabled={saving}>{saving ? 'Speichert…' : '💾 Speichern'}</button>
            </div>
          </div>
        ) : !mr ? (
          <p className="text-sm text-secondary-500">Keine medizinischen Angaben hinterlegt.</p>
        ) : (
          <div className="space-y-5">
            {/* Vitalwerte */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Blutgruppe" value={mr.bloodType} />
              <Field label="Größe" value={mr.height ? `${mr.height} cm` : null} />
              <Field label="Gewicht" value={mr.weight ? `${mr.weight} kg` : null} />
              <Field label="Letzte Untersuchung" value={fmtDate(mr.lastCheckupDate)} />
            </div>

            {/* Ärzte */}
            {(mr.primaryDoctor || mr.pediatricianName || mr.emergencyDoctor) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ärzte</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {mr.pediatricianName && (
                    <div className="surface p-3">
                      <p className="text-xs text-secondary-400">Kinderarzt</p>
                      <p className="font-semibold text-secondary-900">{mr.pediatricianName}</p>
                      {mr.pediatricianPhone && <p className="text-sm text-secondary-600">📞 {mr.pediatricianPhone}</p>}
                    </div>
                  )}
                  {mr.primaryDoctor && (
                    <div className="surface p-3">
                      <p className="text-xs text-secondary-400">Hausarzt {mr.primaryDoctorSpecialty ? `· ${mr.primaryDoctorSpecialty}` : ''}</p>
                      <p className="font-semibold text-secondary-900">{mr.primaryDoctor}</p>
                      {mr.primaryDoctorPhone && <p className="text-sm text-secondary-600">📞 {mr.primaryDoctorPhone}</p>}
                    </div>
                  )}
                  {mr.emergencyDoctor && (
                    <div className="surface p-3">
                      <p className="text-xs text-secondary-400">Notfall-Arzt</p>
                      <p className="font-semibold text-secondary-900">{mr.emergencyDoctor}</p>
                      {mr.emergencyDoctorPhone && <p className="text-sm text-secondary-600">📞 {mr.emergencyDoctorPhone}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bedingungen / Medikamente */}
            {(mr.conditions?.length > 0 || mr.medications?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mr.conditions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Chronische Bedingungen</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mr.conditions.map((c: string, i: number) => <span key={i} className="chip chip-warning">{c}</span>)}
                    </div>
                  </div>
                )}
                {mr.medications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Medikamente</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mr.medications.map((m: string, i: number) => <span key={i} className="chip chip-neutral">{m}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mr.emergencyInfo && (
              <div className="alert alert-warning">
                <span className="font-semibold">Notfall-Hinweis:</span> {mr.emergencyInfo}
              </div>
            )}

            {/* Impfungen */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">💉 Impfungen</p>
                {editable && !vaccForm && (
                  <button onClick={() => setVaccForm({ vaccineName: '', vaccinationDate: '', nextDueDate: '', givenBy: '' })}
                    className="btn btn-secondary btn-sm">+ Impfung</button>
                )}
              </div>
              {editable && vaccForm && (
                <div className="surface p-3 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><label className="label">Impfung</label><input className="input" placeholder="z.B. MMR" value={vaccForm.vaccineName} onChange={e => setVaccForm({ ...vaccForm, vaccineName: e.target.value })} /></div>
                  <div><label className="label">Datum</label><input type="date" className="input" value={vaccForm.vaccinationDate} onChange={e => setVaccForm({ ...vaccForm, vaccinationDate: e.target.value })} /></div>
                  <div><label className="label">Nächste fällig</label><input type="date" className="input" value={vaccForm.nextDueDate} onChange={e => setVaccForm({ ...vaccForm, nextDueDate: e.target.value })} /></div>
                  <div><label className="label">Geimpft von</label><input className="input" value={vaccForm.givenBy} onChange={e => setVaccForm({ ...vaccForm, givenBy: e.target.value })} /></div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button onClick={() => setVaccForm(null)} className="btn btn-secondary btn-sm" disabled={subSaving}>Abbrechen</button>
                    <button onClick={addVaccination} className="btn btn-primary btn-sm" disabled={subSaving}>{subSaving ? '…' : 'Speichern'}</button>
                  </div>
                </div>
              )}
              {vaccinations.length === 0 ? (
                <p className="text-sm text-secondary-500">Keine Impfungen erfasst.</p>
              ) : (
                <div className="space-y-2">
                  {vaccinations.map((v) => (
                    <div key={v.id} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-secondary-900">{v.vaccineName}</p>
                        <p className="text-xs text-secondary-500">Geimpft am {fmtDate(v.vaccinationDate)}{v.givenBy ? ` · ${v.givenBy}` : ''}</p>
                      </div>
                      {v.nextDueDate && <span className="chip chip-primary">Nächste: {fmtDate(v.nextDueDate)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Krankengeschichte */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">📜 Krankengeschichte</p>
                {editable && !histForm && (
                  <button onClick={() => setHistForm({ eventType: 'Krankheit', condition: '', date: '', severity: '', doctorName: '', treatment: '', hospitalAdmitted: false })}
                    className="btn btn-secondary btn-sm">+ Eintrag</button>
                )}
              </div>
              {editable && histForm && (
                <div className="surface p-3 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><label className="label">Ereignis</label>
                    <select className="input" value={histForm.eventType} onChange={e => setHistForm({ ...histForm, eventType: e.target.value })}>
                      {['Krankheit', 'Verletzung', 'Allergie-Reaktion', 'Operation', 'Krankenhaus', 'Sonstiges'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Bezeichnung</label><input className="input" placeholder="z.B. Windpocken" value={histForm.condition} onChange={e => setHistForm({ ...histForm, condition: e.target.value })} /></div>
                  <div><label className="label">Datum</label><input type="date" className="input" value={histForm.date} onChange={e => setHistForm({ ...histForm, date: e.target.value })} /></div>
                  <div><label className="label">Schweregrad</label>
                    <select className="input" value={histForm.severity} onChange={e => setHistForm({ ...histForm, severity: e.target.value })}>
                      <option value="">—</option>{['Mild', 'Moderate', 'Severe'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Arzt</label><input className="input" value={histForm.doctorName} onChange={e => setHistForm({ ...histForm, doctorName: e.target.value })} /></div>
                  <div><label className="label">Behandlung</label><input className="input" value={histForm.treatment} onChange={e => setHistForm({ ...histForm, treatment: e.target.value })} /></div>
                  <label className="flex items-center gap-2 text-sm text-secondary-700 sm:col-span-2">
                    <input type="checkbox" checked={histForm.hospitalAdmitted} onChange={e => setHistForm({ ...histForm, hospitalAdmitted: e.target.checked })} />
                    Krankenhausaufenthalt
                  </label>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button onClick={() => setHistForm(null)} className="btn btn-secondary btn-sm" disabled={subSaving}>Abbrechen</button>
                    <button onClick={addHistory} className="btn btn-primary btn-sm" disabled={subSaving}>{subSaving ? '…' : 'Speichern'}</button>
                  </div>
                </div>
              )}
              {history.length === 0 ? (
                <p className="text-sm text-secondary-500">Keine Einträge.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="surface p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-secondary-900">{h.condition} <span className="text-xs font-normal text-secondary-400">({h.eventType})</span></p>
                        <div className="flex gap-1.5">
                          {h.severity && <span className="chip chip-warning">{h.severity}</span>}
                          {h.hospitalAdmitted && <span className="chip chip-error">Krankenhaus</span>}
                          {h.followUpNeeded && <span className="chip chip-primary">Nachsorge</span>}
                        </div>
                      </div>
                      <p className="text-xs text-secondary-500 mt-0.5">{fmtDate(h.date)}{h.resolvedDate ? ` – ${fmtDate(h.resolvedDate)}` : ''}{h.doctorName ? ` · ${h.doctorName}` : ''}</p>
                      {h.treatment && <p className="text-sm text-secondary-600 mt-1">{h.treatment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Allergien */}
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="eyebrow">🚨 Allergien</p>
          {editable && !allergyForm && (
            <button onClick={() => setAllergyForm({ allergen: '', severity: 'MODERATE', notes: '' })}
              className="btn btn-secondary btn-sm">+ Allergie</button>
          )}
        </div>

        {editable && allergyForm && (
          <div className="surface p-3 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label className="label">Allergen</label><input className="input" placeholder="z.B. Erdnüsse" value={allergyForm.allergen} onChange={e => setAllergyForm({ ...allergyForm, allergen: e.target.value })} /></div>
            <div><label className="label">Schweregrad</label>
              <select className="input" value={allergyForm.severity} onChange={e => setAllergyForm({ ...allergyForm, severity: e.target.value })}>
                <option value="MILD">Mild</option>
                <option value="MODERATE">Mittel</option>
                <option value="SEVERE">Schwer</option>
              </select>
            </div>
            <div><label className="label">Notiz</label><input className="input" value={allergyForm.notes} onChange={e => setAllergyForm({ ...allergyForm, notes: e.target.value })} /></div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <button onClick={() => setAllergyForm(null)} className="btn btn-secondary btn-sm" disabled={subSaving}>Abbrechen</button>
              <button onClick={addAllergy} className="btn btn-primary btn-sm" disabled={subSaving}>{subSaving ? '…' : 'Speichern'}</button>
            </div>
          </div>
        )}

        {allergies.length === 0 ? (
          <p className="text-sm text-secondary-500">Keine Allergien erfasst.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allergies.map((a) => (
              <div key={a.id} className="surface p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-secondary-900">{a.allergen}</span>
                  {a.notes && <p className="text-xs text-secondary-500 truncate">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="chip chip-error capitalize">{a.severity}</span>
                  {editable && (
                    <button onClick={() => removeAllergy(a.id)} title="Entfernen"
                      className="btn-icon w-7 h-7 text-secondary-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Verträge */}
      {contracts.length > 0 && (
        <section className="card p-6 sm:p-8">
          <p className="eyebrow mb-4">📄 Verträge</p>
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-secondary-900">{fmtDate(c.startDate)} – {c.endDate ? fmtDate(c.endDate) : 'unbefristet'}</p>
                  <p className="text-xs text-secondary-500">{c.hoursPerWeek} Std/Woche · CHF {c.monthlyRate}/Monat</p>
                </div>
                <span className="chip chip-neutral">{STATUS_DE[c.status] || c.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dokumente */}
      {documents.length > 0 && (
        <section className="card p-6 sm:p-8">
          <p className="eyebrow mb-4">🖼️ Dokumente & Fotos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {documents.map((d) => (
              <a key={d.id} href={d.storageUrl} target="_blank" rel="noopener noreferrer"
                className="surface p-3 flex items-center gap-2 hover:bg-gray-100 transition">
                <span className="text-lg">📎</span>
                <span className="text-sm text-secondary-700 truncate">{d.fileName}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Anwesenheit (letzte) */}
      {attendance.length > 0 && (
        <section className="card p-6 sm:p-8">
          <p className="eyebrow mb-4">🕐 Anwesenheit (zuletzt)</p>
          <div className="space-y-1.5">
            {attendance.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm surface p-2.5">
                <span className="font-medium text-secondary-900">{fmtDate(a.date)}</span>
                <span className="text-secondary-500">
                  {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {' – '}
                  {a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Belegungsplanung · Tagesberichte · Aktivitäten */}
      <ChildTimeline childId={child.id} activitiesBase={activitiesBase} />
    </div>
  );
}
