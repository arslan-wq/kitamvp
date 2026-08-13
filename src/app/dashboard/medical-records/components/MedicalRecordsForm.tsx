'use client';

import { useState } from 'react';
import { Child } from '@/lib/types';

interface MedicalRecordsFormProps {
  children: Child[];
  kitaId: string;
}

interface Vaccination {
  vaccineName: string;
  vaccineType?: string;
  vaccinationDate: string;
  nextDueDate?: string;
  givenBy?: string;
  location?: string;
  batchNumber?: string;
  notes?: string;
}

interface HealthEntry {
  eventType: string;
  condition: string;
  date: string;
  resolvedDate?: string;
  treatment?: string;
  doctorName?: string;
  doctorNotes?: string;
  parentNotes?: string;
  severity?: string;
  hospitalAdmitted: boolean;
  followUpNeeded: boolean;
  followUpDate?: string;
}

const EVENT_TYPES = [
  'Illness',
  'Injury',
  'Allergy Reaction',
  'Surgery',
  'Hospital Visit',
  'Dental',
  'Vaccination',
  'Other'
];

const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];

export default function MedicalRecordsForm({ children, kitaId }: MedicalRecordsFormProps) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Doctor information
  const [primaryDoctor, setPrimaryDoctor] = useState('');
  const [primaryDoctorPhone, setPrimaryDoctorPhone] = useState('');
  const [primaryDoctorEmail, setPrimaryDoctorEmail] = useState('');
  const [primaryDoctorSpecialty, setPrimaryDoctorSpecialty] = useState('');

  const [pediatricianName, setPediatricianName] = useState('');
  const [pediatricianPhone, setPediatricianPhone] = useState('');
  const [pediatricianEmail, setPediatricianEmail] = useState('');

  const [emergencyDoctor, setEmergencyDoctor] = useState('');
  const [emergencyDoctorPhone, setEmergencyDoctorPhone] = useState('');

  // Health info
  const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Vaccinations
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);

  // Health history
  const [healthHistory, setHealthHistory] = useState<HealthEntry[]>([]);

  const addVaccination = () => {
    setVaccinations([
      ...vaccinations,
      {
        vaccineName: '',
        vaccineType: '',
        vaccinationDate: '',
        nextDueDate: '',
        givenBy: '',
        location: '',
        batchNumber: '',
        notes: ''
      }
    ]);
  };

  const removeVaccination = (index: number) => {
    setVaccinations(vaccinations.filter((_, i) => i !== index));
  };

  const updateVaccination = (index: number, field: keyof Vaccination, value: string) => {
    const updated = [...vaccinations];
    updated[index] = { ...updated[index], [field]: value };
    setVaccinations(updated);
  };

  const addHealthEntry = () => {
    setHealthHistory([
      ...healthHistory,
      {
        eventType: '',
        condition: '',
        date: '',
        resolvedDate: '',
        treatment: '',
        doctorName: '',
        doctorNotes: '',
        parentNotes: '',
        severity: '',
        hospitalAdmitted: false,
        followUpNeeded: false,
        followUpDate: ''
      }
    ]);
  };

  const removeHealthEntry = (index: number) => {
    setHealthHistory(healthHistory.filter((_, i) => i !== index));
  };

  const updateHealthEntry = (index: number, field: keyof HealthEntry, value: string | boolean) => {
    const updated = [...healthHistory];
    updated[index] = { ...updated[index], [field]: value };
    setHealthHistory(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (!selectedChildId) {
        setErrorMessage('Bitte wählen Sie ein Kind aus');
        return;
      }

      // Update medical record with doctor info
      const medicalResponse = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          kitaId,
          primaryDoctor: primaryDoctor || undefined,
          primaryDoctorPhone: primaryDoctorPhone || undefined,
          primaryDoctorEmail: primaryDoctorEmail || undefined,
          primaryDoctorSpecialty: primaryDoctorSpecialty || undefined,
          pediatricianName: pediatricianName || undefined,
          pediatricianPhone: pediatricianPhone || undefined,
          pediatricianEmail: pediatricianEmail || undefined,
          emergencyDoctor: emergencyDoctor || undefined,
          emergencyDoctorPhone: emergencyDoctorPhone || undefined,
          bloodType: bloodType || undefined,
          height: height ? parseFloat(height) : undefined,
          weight: weight ? parseFloat(weight) : undefined
        })
      });

      if (!medicalResponse.ok) {
        throw new Error('Failed to update medical record');
      }

      // Add vaccinations
      for (const vaccination of vaccinations.filter(v => v.vaccineName)) {
        const vaccResponse = await fetch('/api/medical-records/vaccinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: selectedChildId,
            kitaId,
            ...vaccination
          })
        });

        if (!vaccResponse.ok) {
          throw new Error('Failed to add vaccination');
        }
      }

      // Add health history entries
      for (const entry of healthHistory.filter(e => e.condition)) {
        const historyResponse = await fetch('/api/medical-records/health-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: selectedChildId,
            kitaId,
            ...entry
          })
        });

        if (!historyResponse.ok) {
          throw new Error('Failed to add health history entry');
        }
      }

      setSuccessMessage('Medizinische Informationen erfolgreich gespeichert');

      // Reset form
      setPrimaryDoctor('');
      setPrimaryDoctorPhone('');
      setPrimaryDoctorEmail('');
      setPrimaryDoctorSpecialty('');
      setPediatricianName('');
      setPediatricianPhone('');
      setPediatricianEmail('');
      setEmergencyDoctor('');
      setEmergencyDoctorPhone('');
      setBloodType('');
      setHeight('');
      setWeight('');
      setVaccinations([]);
      setHealthHistory([]);

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error saving medical records:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Child Selection */}
      <div className="card p-6">
        <p className="eyebrow mb-3">👶 Kind wählen</p>
        <select
          value={selectedChildId}
          onChange={e => setSelectedChildId(e.target.value)}
          className="select"
          required
        >
          <option value="">-- Kind auswählen --</option>
          {children.map(child => (
            <option key={child.id} value={child.id}>
              {child.firstName} {child.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Doctor Information */}
      <div className="card p-6 sm:p-8">
        <h3 className="text-lg font-bold text-secondary-900 mb-5">👨‍⚕️ Ärztliche Informationen</h3>

        <div className="space-y-4">
          {/* Primary Doctor */}
          <div className="surface p-4 border-l-4 border-primary-500">
            <div className="mb-3"><span className="chip chip-primary">Hausarzt / Kinderarzt</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={primaryDoctor}
                  onChange={e => setPrimaryDoctor(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Spezialisierung</label>
                <input
                  type="text"
                  placeholder="Spezialisierung"
                  value={primaryDoctorSpecialty}
                  onChange={e => setPrimaryDoctorSpecialty(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={primaryDoctorPhone}
                  onChange={e => setPrimaryDoctorPhone(e.target.value.replace(/[^0-9+\s()-]/g, ''))}
                  className="input"
                  pattern="\+?[0-9\s()-]{6,20}"
                  title="Nur Ziffern, Leerzeichen, +, - und Klammern erlaubt (mind. 6 Ziffern)"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={primaryDoctorEmail}
                  onChange={e => setPrimaryDoctorEmail(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Pediatrician */}
          <div className="surface p-4 border-l-4 border-accent-500">
            <div className="mb-3"><span className="chip chip-accent">Pädiatrischer Spezialist</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={pediatricianName}
                  onChange={e => setPediatricianName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={pediatricianPhone}
                  onChange={e => setPediatricianPhone(e.target.value.replace(/[^0-9+\s()-]/g, ''))}
                  className="input"
                  pattern="\+?[0-9\s()-]{6,20}"
                  title="Nur Ziffern, Leerzeichen, +, - und Klammern erlaubt (mind. 6 Ziffern)"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={pediatricianEmail}
                  onChange={e => setPediatricianEmail(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Emergency Doctor */}
          <div className="surface p-4 border-l-4 border-error">
            <div className="mb-3"><span className="chip chip-error">Notfallarzt</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={emergencyDoctor}
                  onChange={e => setEmergencyDoctor(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={emergencyDoctorPhone}
                  onChange={e => setEmergencyDoctorPhone(e.target.value.replace(/[^0-9+\s()-]/g, ''))}
                  className="input"
                  pattern="\+?[0-9\s()-]{6,20}"
                  title="Nur Ziffern, Leerzeichen, +, - und Klammern erlaubt (mind. 6 Ziffern)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Information */}
      <div className="card p-6 sm:p-8">
        <h3 className="text-lg font-bold text-secondary-900 mb-5">🏥 Gesundheitliche Informationen</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Blutgruppe</label>
            <select
              value={bloodType}
              onChange={e => setBloodType(e.target.value)}
              className="select"
            >
              <option value="">-- Auswählen --</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
          <div>
            <label className="label">Größe (cm)</label>
            <input
              type="number"
              placeholder="z.B. 100"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Gewicht (kg)</label>
            <input
              type="number"
              placeholder="z.B. 15.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              step="0.1"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Vaccinations */}
      <div className="card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h3 className="text-lg font-bold text-secondary-900">💉 Impfungen</h3>
          <button
            type="button"
            onClick={addVaccination}
            className="btn btn-secondary btn-sm"
          >
            + Impfung hinzufügen
          </button>
        </div>

        <div className="space-y-4">
          {vaccinations.map((vac, idx) => (
            <div key={idx} className="surface p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Impfstoff</label>
                  <input
                    type="text"
                    placeholder="z.B. MMR"
                    value={vac.vaccineName}
                    onChange={e => updateVaccination(idx, 'vaccineName', e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Impfstofftyp</label>
                  <input
                    type="text"
                    placeholder="z.B. Live attenuated"
                    value={vac.vaccineType || ''}
                    onChange={e => updateVaccination(idx, 'vaccineType', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Impfdatum</label>
                  <input
                    type="date"
                    placeholder="Impfdatum"
                    value={vac.vaccinationDate}
                    onChange={e => updateVaccination(idx, 'vaccinationDate', e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Nächste Impfung fällig</label>
                  <input
                    type="date"
                    placeholder="Nächste Impfung fällig"
                    value={vac.nextDueDate || ''}
                    onChange={e => updateVaccination(idx, 'nextDueDate', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Verabreicht durch</label>
                  <input
                    type="text"
                    placeholder="Verabreicht durch"
                    value={vac.givenBy || ''}
                    onChange={e => updateVaccination(idx, 'givenBy', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Ort</label>
                  <input
                    type="text"
                    placeholder="Ort"
                    value={vac.location || ''}
                    onChange={e => updateVaccination(idx, 'location', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Chargennummer</label>
                  <input
                    type="text"
                    placeholder="Chargennummer"
                    value={vac.batchNumber || ''}
                    onChange={e => updateVaccination(idx, 'batchNumber', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Bemerkungen</label>
                  <textarea
                    placeholder="Bemerkungen"
                    value={vac.notes || ''}
                    onChange={e => updateVaccination(idx, 'notes', e.target.value)}
                    className="textarea"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeVaccination(idx)}
                  className="btn btn-ghost btn-sm text-error"
                >
                  Entfernen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health History */}
      <div className="card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h3 className="text-lg font-bold text-secondary-900">📋 Gesundheitsverlauf</h3>
          <button
            type="button"
            onClick={addHealthEntry}
            className="btn btn-secondary btn-sm"
          >
            + Eintrag hinzufügen
          </button>
        </div>

        <div className="space-y-4">
          {healthHistory.map((entry, idx) => (
            <div key={idx} className="surface p-4">
              {/* Schweregrad-Anzeige */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {entry.severity === 'Mild' && <span className="chip chip-success">🟢 Schweregrad: Mild</span>}
                {entry.severity === 'Moderate' && <span className="chip chip-warning">🟡 Schweregrad: Moderate</span>}
                {entry.severity === 'Severe' && <span className="chip chip-error">🔴 Schweregrad: Severe</span>}
                {entry.hospitalAdmitted && <span className="chip chip-error">🏥 Krankenhaus</span>}
                {entry.followUpNeeded && <span className="chip chip-primary">🔁 Nachuntersuchung</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Ereignistyp</label>
                  <select
                    value={entry.eventType}
                    onChange={e => updateHealthEntry(idx, 'eventType', e.target.value)}
                    className="select"
                    required
                  >
                    <option value="">-- Ereignistyp auswählen --</option>
                    {EVENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Erkrankung/Zustand</label>
                  <input
                    type="text"
                    placeholder="Erkrankung/Zustand"
                    value={entry.condition}
                    onChange={e => updateHealthEntry(idx, 'condition', e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Datum</label>
                  <input
                    type="date"
                    placeholder="Datum"
                    value={entry.date}
                    onChange={e => updateHealthEntry(idx, 'date', e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Lösungsdatum</label>
                  <input
                    type="date"
                    placeholder="Lösungsdatum"
                    value={entry.resolvedDate || ''}
                    onChange={e => updateHealthEntry(idx, 'resolvedDate', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Schweregrad</label>
                  <select
                    value={entry.severity || ''}
                    onChange={e => updateHealthEntry(idx, 'severity', e.target.value)}
                    className="select"
                  >
                    <option value="">-- Schweregrad --</option>
                    {SEVERITY_OPTIONS.map(sev => (
                      <option key={sev} value={sev}>{sev}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Behandlung</label>
                  <input
                    type="text"
                    placeholder="Behandlung"
                    value={entry.treatment || ''}
                    onChange={e => updateHealthEntry(idx, 'treatment', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Arztname</label>
                  <input
                    type="text"
                    placeholder="Arztname"
                    value={entry.doctorName || ''}
                    onChange={e => updateHealthEntry(idx, 'doctorName', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Ärztliche Notizen</label>
                  <textarea
                    placeholder="Ärztliche Notizen"
                    value={entry.doctorNotes || ''}
                    onChange={e => updateHealthEntry(idx, 'doctorNotes', e.target.value)}
                    className="textarea"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Eltern-Notizen</label>
                  <textarea
                    placeholder="Eltern-Notizen"
                    value={entry.parentNotes || ''}
                    onChange={e => updateHealthEntry(idx, 'parentNotes', e.target.value)}
                    className="textarea"
                    rows={2}
                  />
                </div>
                <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={entry.hospitalAdmitted}
                    onChange={e => updateHealthEntry(idx, 'hospitalAdmitted', e.target.checked)}
                    className="w-4 h-4 accent-primary-600"
                  />
                  <span className="text-sm font-medium text-secondary-700">Krankenhausaufenthalt</span>
                </label>
                <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={entry.followUpNeeded}
                    onChange={e => updateHealthEntry(idx, 'followUpNeeded', e.target.checked)}
                    className="w-4 h-4 accent-primary-600"
                  />
                  <span className="text-sm font-medium text-secondary-700">Nachuntersuchung erforderlich</span>
                </label>
                {entry.followUpNeeded && (
                  <div className="sm:col-span-2">
                    <label className="label">Nachuntersuchungsdatum</label>
                    <input
                      type="date"
                      placeholder="Nachuntersuchungsdatum"
                      value={entry.followUpDate || ''}
                      onChange={e => updateHealthEntry(idx, 'followUpDate', e.target.value)}
                      className="input"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeHealthEntry(idx)}
                  className="btn btn-ghost btn-sm text-error"
                >
                  Entfernen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success">
          ✅ {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error">
          ❌ {errorMessage}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg px-6"
        >
          {loading ? 'Wird gespeichert...' : '💾 Medizinische Informationen speichern'}
        </button>
      </div>
    </form>
  );
}
