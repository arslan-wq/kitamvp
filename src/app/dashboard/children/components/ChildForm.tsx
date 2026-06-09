'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChildPhotoEditor from '@/components/ChildPhotoEditor';
import { resizeToSquare } from '@/lib/image';

interface ChildFormProps {
  initialData?: {
    firstName: string;
    lastName: string;
    birthDate: string;
    parentEmail?: string;
    locationId?: string;
    photoUrl?: string | null;
  };
  isEditing?: boolean;
  childId?: string;
}

interface LocationOption {
  id: string;
  name: string;
}

export default function ChildForm({ initialData, isEditing = false, childId }: ChildFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    birthDate: initialData?.birthDate || '',
    parentEmail: initialData?.parentEmail || '',
    locationId: initialData?.locationId || '',
  });
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photo, setPhoto] = useState<string | null>(initialData?.photoUrl || null);
  const photoRef = useRef<HTMLInputElement>(null);

  // T2: Belegung (Betreuungstage) direkt beim Anlegen — sofort akzeptiert
  const todayStr = new Date().toISOString().split('T')[0];
  const plus6m = (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; })();
  const DAY_TYPES: Record<string, string> = {
    FULL_DAY: 'Ganztags', MORNING_WITH_MEAL: 'Vormittag + Essen', MORNING_NO_MEAL: 'Vormittag',
    AFTERNOON_WITH_MEAL: 'Nachmittag + Essen', AFTERNOON_NO_MEAL: 'Nachmittag',
  };
  const [booking, setBooking] = useState({ weekdays: [] as number[], dayType: 'FULL_DAY', startDate: todayStr, endDate: plus6m });
  const toggleWeekday = (v: number) =>
    setBooking(b => ({ ...b, weekdays: b.weekdays.includes(v) ? b.weekdays.filter(x => x !== v) : [...b.weekdays, v] }));

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Bitte eine Bilddatei wählen'); return; }
    try { setPhoto(await resizeToSquare(f)); setError(''); } catch { setError('Bild konnte nicht verarbeitet werden'); }
  };

  useEffect(() => {
    fetch('/api/locations')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Pflicht-Profilfoto beim Anlegen
    if (!isEditing && !photo) {
      setError('Bitte ein Profilfoto hochladen.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        isEditing && childId ? `/api/children/${childId}` : '/api/children',
        {
          method: isEditing && childId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isEditing
              ? {
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  birthDate: formData.birthDate,
                  locationId: formData.locationId || null,
                }
              : { ...formData, locationId: formData.locationId || undefined, photoUrl: photo }
          ),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      const createdChild = await response.json();

      // T2: Belegung anlegen (nur beim Erstellen, wenn Wochentage gewählt) — sofort akzeptiert
      if (!isEditing && createdChild?.id && booking.weekdays.length > 0) {
        try {
          await fetch('/api/bookings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId: createdChild.id,
              startDate: booking.startDate,
              endDate: booking.endDate,
              weekdays: booking.weekdays,
              dayType: booking.dayType,
            }),
          });
        } catch { /* Belegung best-effort — Kind wurde bereits angelegt */ }
      }

      setSuccess(
        isEditing
          ? `Änderungen für "${formData.firstName}" gespeichert.`
          : `Kind "${formData.firstName}" erstellt! Einladungs-Email wurde an ${formData.parentEmail} versendet.`
      );

      setTimeout(() => {
        router.push('/dashboard/children');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Live-Initialen für die Vorschau
  const initials = `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase() || '👶';

  return (
    <div className="min-h-screen bg-secondary-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-3 inline-flex items-center gap-1"
          >
            ← Zurück
          </button>
          <h1 className="text-3xl font-bold text-secondary-900">
            {isEditing ? 'Kind bearbeiten' : 'Neues Kind hinzufügen'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="card overflow-hidden">
          {/* Kopf: im Bearbeiten-Modus Profilfoto verwalten, sonst Live-Vorschau */}
          <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-secondary-100">
            {isEditing && childId ? (
              <div>
                <p className="eyebrow mb-3">Profilfoto</p>
                <ChildPhotoEditor
                  childId={childId}
                  initialPhotoUrl={initialData?.photoUrl || null}
                  initials={initials}
                />
              </div>
            ) : (
              <div>
                <p className="eyebrow mb-3">Profilfoto <span className="text-red-500">*</span></p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white text-2xl font-bold text-primary-600 shadow-sm flex items-center justify-center shrink-0">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="Profilfoto" className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => photoRef.current?.click()} className="btn btn-secondary btn-sm">
                        {photo ? '📷 Foto ändern' : '📷 Foto hochladen'}
                      </button>
                      {photo && <button type="button" onClick={() => setPhoto(null)} className="btn btn-sm text-red-600 hover:bg-red-50">Entfernen</button>}
                    </div>
                    <p className="text-xs text-secondary-500">Pflichtfeld · wird automatisch verkleinert</p>
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="alert alert-error mb-6">
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className="alert alert-success mb-6">
                <p>{success}</p>
              </div>
            )}

            {/* Stammdaten: Vorname + Nachname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="firstName" className="label label-required">Vorname</label>
                <input
                  type="text" id="firstName" name="firstName"
                  value={formData.firstName} onChange={handleChange}
                  placeholder="z.B. Anna" className="input" required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label label-required">Nachname</label>
                <input
                  type="text" id="lastName" name="lastName"
                  value={formData.lastName} onChange={handleChange}
                  placeholder="z.B. Müller" className="input" required
                />
              </div>
            </div>

            {/* Geburtsdatum + Standort nebeneinander (Fläche genutzt) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="birthDate" className="label label-required">Geburtsdatum</label>
                <input
                  type="date" id="birthDate" name="birthDate"
                  value={formData.birthDate} onChange={handleChange}
                  className="input" required
                />
              </div>
              <div>
                <label htmlFor="locationId" className="label">📍 Standort</label>
                <select
                  id="locationId" name="locationId"
                  value={formData.locationId} onChange={handleChange}
                  className="input"
                >
                  <option value="">— Kein Standort —</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Eltern-Email hervorgehoben — nur beim Anlegen */}
            {!isEditing && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
                <label htmlFor="parentEmail" className="label label-required flex items-center gap-2">
                  ✉️ Email des Elternteils
                </label>
                <input
                  type="email" id="parentEmail" name="parentEmail"
                  value={formData.parentEmail} onChange={handleChange}
                  placeholder="parent@example.com"
                  className="input border-primary-300 focus:border-primary-500 focus:ring-primary-100"
                  required
                />
                <p className="help-text text-primary-700 mt-2">
                  Der Elternteil erhält eine Einladungs-Email mit Registrierungs-Link.
                </p>
              </div>
            )}

            {/* T2: Belegung (Betreuungstage) — sofort akzeptiert */}
            {!isEditing && (
              <div className="surface rounded-xl p-5">
                <p className="eyebrow mb-1">📅 Belegung (optional)</p>
                <p className="help-text mb-3">Betreuungstage direkt festlegen — wird sofort akzeptiert. Ohne Auswahl wird keine Belegung angelegt.</p>
                <div className="mb-4">
                  <label className="label">Wochentage</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[{ v: 1, l: 'Mo' }, { v: 2, l: 'Di' }, { v: 3, l: 'Mi' }, { v: 4, l: 'Do' }, { v: 5, l: 'Fr' }].map(d => {
                      const active = booking.weekdays.includes(d.v);
                      return (
                        <button key={d.v} type="button" onClick={() => toggleWeekday(d.v)}
                          className={`w-11 h-11 rounded-lg border text-sm font-semibold transition-all ${active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200' : 'border-gray-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                          {d.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Betreuungsart</label>
                    <select className="input" value={booking.dayType} onChange={e => setBooking(b => ({ ...b, dayType: e.target.value }))}>
                      {Object.entries(DAY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Von</label><input type="date" className="input" value={booking.startDate} onChange={e => setBooking(b => ({ ...b, startDate: e.target.value }))} /></div>
                  <div><label className="label">Bis</label><input type="date" className="input" value={booking.endDate} onChange={e => setBooking(b => ({ ...b, endDate: e.target.value }))} /></div>
                </div>
              </div>
            )}
          </div>

          {/* Aktionen */}
          <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100">
            <button type="button" onClick={() => router.back()} className="btn btn-secondary">
              Abbrechen
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg px-6">
              {loading ? 'Wird gespeichert…' : isEditing ? '💾 Speichern' : '✉️ Hinzufügen & Email senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
