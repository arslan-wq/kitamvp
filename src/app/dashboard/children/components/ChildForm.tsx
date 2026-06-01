'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ChildFormProps {
  initialData?: {
    firstName: string;
    lastName: string;
    birthDate: string;
    parentEmail?: string;
    locationId?: string;
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
              : { ...formData, locationId: formData.locationId || undefined }
          ),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      await response.json();
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
          {/* Live-Vorschau-Kopf: zeigt Identität des Kindes auf einen Blick */}
          <div className="flex items-center gap-4 px-6 sm:px-8 py-5 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-100">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-xl font-bold text-primary-600 shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-secondary-900 truncate">
                {formData.firstName || formData.lastName
                  ? `${formData.firstName} ${formData.lastName}`.trim()
                  : 'Neues Kind'}
              </p>
              <p className="text-sm text-secondary-500">
                {formData.birthDate
                  ? new Date(formData.birthDate).toLocaleDateString('de-CH')
                  : 'Stammdaten erfassen'}
              </p>
            </div>
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
