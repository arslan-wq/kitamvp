'use client';

import { useState } from 'react';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}

interface DailyReportFormProps {
  children: Child[];
}

interface Meal {
  type: string;
  consumed: boolean;
  notes: string;
}

interface Activity {
  name: string;
  notes: string;
}

interface Incident {
  type: string;
  description: string;
  treatment: string;
}

export default function DailyReportForm({ children }: DailyReportFormProps) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Meals
  const [meals, setMeals] = useState<Meal[]>([
    { type: 'breakfast', consumed: false, notes: '' },
    { type: 'lunch', consumed: false, notes: '' },
    { type: 'snack', consumed: false, notes: '' },
  ]);

  // Sleep
  const [sleepTime, setSleepTime] = useState('');
  const [sleepDuration, setSleepDuration] = useState('');

  // Toileting
  const [toiletVisits, setToiletVisits] = useState('0');
  const [diaperChanges, setDiaperChanges] = useState('0');

  // Bottles
  const [extraBottles, setExtraBottles] = useState('0');
  const [extraBottleNotes, setExtraBottleNotes] = useState('');

  // Activities & Mood
  const [activities, setActivities] = useState<Activity[]>([{ name: '', notes: '' }]);
  const [mood, setMood] = useState('');

  // Health
  const [incidents, setIncidents] = useState<Incident[]>([{ type: '', description: '', treatment: '' }]);
  const [medications, setMedications] = useState<string[]>(['']);

  // General Notes
  const [notes, setNotes] = useState('');

  const handleMealChange = (index: number, field: keyof Meal, value: any) => {
    const updated = [...meals];
    (updated[index] as any)[field] = value;
    setMeals(updated);
  };

  const addActivity = () => {
    setActivities([...activities, { name: '', notes: '' }]);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleActivityChange = (index: number, field: string, value: string) => {
    const updated = [...activities];
    (updated[index] as any)[field] = value;
    setActivities(updated);
  };

  const addIncident = () => {
    setIncidents([...incidents, { type: '', description: '', treatment: '' }]);
  };

  const removeIncident = (index: number) => {
    setIncidents(incidents.filter((_, i) => i !== index));
  };

  const handleIncidentChange = (index: number, field: string, value: string) => {
    const updated = [...incidents];
    (updated[index] as any)[field] = value;
    setIncidents(updated);
  };

  const addMedication = () => {
    setMedications([...medications, '']);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index: number, value: string) => {
    const updated = [...medications];
    updated[index] = value;
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/daily-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          date,
          meals: meals.filter(m => m.type),
          extraBottles: parseInt(extraBottles) || 0,
          extraBottleNotes: extraBottleNotes || null,
          sleepTime: sleepTime || null,
          sleepDuration: sleepDuration ? parseInt(sleepDuration) : null,
          toiletVisits: parseInt(toiletVisits) || 0,
          diaperChanges: parseInt(diaperChanges) || 0,
          activities: activities.filter(a => a.name),
          mood: mood || null,
          incidents: incidents.filter(i => i.type),
          medications: medications.filter(m => m.trim()),
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save daily report');
      }

      setMessageType('success');
      setMessage(`✅ Tagesbericht für ${children.find(c => c.id === selectedChildId)?.firstName} erfolgreich gespeichert!`);

      // Reset form
      setMeals([
        { type: 'breakfast', consumed: false, notes: '' },
        { type: 'lunch', consumed: false, notes: '' },
        { type: 'snack', consumed: false, notes: '' },
      ]);
      setSleepTime('');
      setSleepDuration('');
      setToiletVisits('0');
      setDiaperChanges('0');
      setExtraBottles('0');
      setExtraBottleNotes('');
      setActivities([{ name: '', notes: '' }]);
      setMood('');
      setIncidents([{ type: '', description: '', treatment: '' }]);
      setMedications(['']);
      setNotes('');
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Fehler beim Speichern des Tagesberichts');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pflichtfeld-Legende */}
      <p className="text-sm text-secondary-500">
        Mit <span className="text-error font-semibold">*</span> markierte Felder sind Pflicht.
      </p>

      {/* Message Alert */}
      {message && (
        <div className={messageType === 'success' ? 'alert alert-success' : 'alert alert-error'}>
          {message}
        </div>
      )}

      {/* Child & Date Selection */}
      <div className="card p-6 sm:p-8">
        <p className="eyebrow mb-4">Bericht für</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label label-required">👶 Kind wählen</label>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="input"
              required
            >
              <option value="">-- Wählen --</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label label-required">📅 Datum</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="card p-6 sm:p-8">
        <h2 className="eyebrow mb-4">🍽️ Mahlzeiten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meals.map((meal, index) => (
            <div key={index} className="surface p-4">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meal.consumed}
                  onChange={e => handleMealChange(index, 'consumed', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-semibold text-secondary-900">
                  {meal.type === 'breakfast' ? '🥣 Frühstück' : meal.type === 'lunch' ? '🍽️ Mittagessen' : '🍎 Snack'}
                </span>
              </label>
              <input
                type="text"
                value={meal.notes}
                onChange={e => handleMealChange(index, 'notes', e.target.value)}
                placeholder="Details (z.B. 'Gut gegessen')"
                className="input text-sm"
              />
            </div>
          ))}

          <div className="surface p-4 sm:col-span-2 lg:col-span-3">
            <label className="label">🍼 Extra Flaschen</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="number"
                value={extraBottles}
                onChange={e => setExtraBottles(e.target.value)}
                min="0"
                className="input"
              />
              <input
                type="text"
                value={extraBottleNotes}
                onChange={e => setExtraBottleNotes(e.target.value)}
                placeholder="Notizen zu den Flaschen"
                className="input text-sm sm:col-span-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sleep & Toileting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleep & Rest */}
        <div className="card p-6 sm:p-8">
          <h2 className="eyebrow mb-4">😴 Schlaf</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Zeit (HH:MM)</label>
              <input
                type="time"
                value={sleepTime}
                onChange={e => setSleepTime(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Dauer (Minuten)</label>
              <input
                type="number"
                value={sleepDuration}
                onChange={e => setSleepDuration(e.target.value)}
                min="0"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Toileting */}
        <div className="card p-6 sm:p-8">
          <h2 className="eyebrow mb-4">🚽 Toilette & Wickeln</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">WC-Besuche</label>
              <input
                type="number"
                value={toiletVisits}
                onChange={e => setToiletVisits(e.target.value)}
                min="0"
                className="input"
              />
            </div>
            <div>
              <label className="label">Windelwechsel</label>
              <input
                type="number"
                value={diaperChanges}
                onChange={e => setDiaperChanges(e.target.value)}
                min="0"
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activities & Mood */}
      <div className="card p-6 sm:p-8">
        <h2 className="eyebrow mb-4">🎨 Aktivitäten & Stimmung</h2>

        <div className="space-y-4">
          <div className="sm:max-w-xs">
            <label className="label">Stimmung</label>
            <select
              value={mood}
              onChange={e => setMood(e.target.value)}
              className="input"
            >
              <option value="">-- Wählen --</option>
              <option value="Glücklich">😊 Glücklich</option>
              <option value="Zufrieden">😌 Zufrieden</option>
              <option value="Müde">😴 Müde</option>
              <option value="Mürrisch">😠 Mürrisch</option>
            </select>
          </div>

          {activities.map((activity, index) => (
            <div key={index} className="surface p-4 flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={activity.name}
                  onChange={e => handleActivityChange(index, 'name', e.target.value)}
                  placeholder="Aktivität (z.B. 'Spielplatz', 'Malen')"
                  className="input text-sm"
                />
                <input
                  type="text"
                  value={activity.notes}
                  onChange={e => handleActivityChange(index, 'notes', e.target.value)}
                  placeholder="Notizen"
                  className="input text-sm"
                />
              </div>
              {activities.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeActivity(index)}
                  className="btn-icon text-error hover:bg-red-50 shrink-0"
                  aria-label="Aktivität entfernen"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addActivity}
            className="btn btn-secondary"
          >
            + Aktivität hinzufügen
          </button>
        </div>
      </div>

      {/* Health & Incidents */}
      <div className="card p-6 sm:p-8">
        <h2 className="eyebrow mb-4">⚕️ Gesundheit & Vorfälle</h2>

        <div className="space-y-4">
          {incidents.map((incident, index) => (
            <div key={index} className="surface p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={incident.type}
                  onChange={e => handleIncidentChange(index, 'type', e.target.value)}
                  placeholder="Vorfall (z.B. 'Sturz', 'Kratzer')"
                  className="input text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <textarea
                    value={incident.description}
                    onChange={e => handleIncidentChange(index, 'description', e.target.value)}
                    placeholder="Beschreibung"
                    rows={2}
                    className="input text-sm"
                  />
                  <textarea
                    value={incident.treatment}
                    onChange={e => handleIncidentChange(index, 'treatment', e.target.value)}
                    placeholder="Behandlung/Massnahmen"
                    rows={2}
                    className="input text-sm"
                  />
                </div>
              </div>
              {incidents.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIncident(index)}
                  className="btn btn-secondary mt-3 text-error"
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addIncident}
            className="btn btn-secondary"
          >
            + Vorfall hinzufügen
          </button>

          <div className="border-t border-gray-200 pt-5">
            <label className="label">💊 Verabreichte Medikamente</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {medications.map((med, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={med}
                    onChange={e => handleMedicationChange(index, e.target.value)}
                    placeholder="Medikament (z.B. 'Ibuprofen 100mg')"
                    className="input text-sm flex-1"
                  />
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="btn-icon text-error hover:bg-red-50 shrink-0"
                      aria-label="Medikament entfernen"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMedication}
              className="btn btn-secondary mt-3"
            >
              + Medikament hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* General Notes */}
      <div className="card p-6 sm:p-8">
        <label className="label">📝 Allgemeine Notizen</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Weitere Informationen für die Eltern..."
          rows={4}
          className="input"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-lg px-8 min-w-[220px] transition-colors disabled:opacity-100"
        >
          {isLoading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
              wird gespeichert...
            </>
          ) : (
            '✅ Tagesbericht speichern'
          )}
        </button>
      </div>
    </form>
  );
}
