'use client';

import { useState } from 'react';
import { MealDay } from './MealDay';

interface MealPlanData {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  notes?: string;
}

interface AllergenInfo {
  allergen: string;
  details: string;
}

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const COMMON_ALLERGENS = [
  'Milch',
  'Eier',
  'Erdnüsse',
  'Baumnüsse',
  'Fisch',
  'Krebstiere',
  'Soja',
  'Gluten',
  'Sesam',
];

export default function MealPlanManager({ kitaId }: { kitaId: string }) {
  const [meals, setMeals] = useState<MealPlanData[]>(
    DAYS.map(day => ({ day, breakfast: '', lunch: '', snack: '', notes: '' }))
  );
  const [allergenInfo, setAllergenInfo] = useState<AllergenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleMealChange = (index: number, field: string, value: string) => {
    const updated = [...meals];
    (updated[index] as any)[field] = value;
    setMeals(updated);
  };

  const addAllergen = () => {
    setAllergenInfo([...allergenInfo, { allergen: '', details: '' }]);
  };

  const removeAllergen = (index: number) => {
    setAllergenInfo(allergenInfo.filter((_, i) => i !== index));
  };

  const handleAllergenChange = (index: number, field: string, value: string) => {
    const updated = [...allergenInfo];
    (updated[index] as any)[field] = value;
    setAllergenInfo(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Calculate week dates (Monday to Sunday)
      const today = new Date();
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: monday.toISOString(),
          weekEnd: sunday.toISOString(),
          meals,
          allergenInfo: allergenInfo.length > 0 ? allergenInfo : null,
          fileName: `speiseplan-${monday.toISOString().split('T')[0]}.json`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload meal plan');
      }

      setMessageType('success');
      setMessage(
        `✅ Speiseplan für die Woche vom ${monday.toLocaleDateString(
          'de-CH'
        )} erfolgreich hochgeladen!`
      );

      // Reset form
      setMeals(DAYS.map(day => ({ day, breakfast: '', lunch: '', snack: '', notes: '' })));
      setAllergenInfo([]);
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error ? error.message : 'Fehler beim Hochladen des Speiseplans'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Message Alert */}
      {message && (
        <div className={messageType === 'success' ? 'alert alert-success' : 'alert alert-error'}>
          {message}
        </div>
      )}

      {/* Daily Meals */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Wochenplan</p>
            <h2 className="text-lg font-semibold text-secondary-900">📅 Montag – Freitag</h2>
          </div>
          <span className="chip chip-neutral">{meals.length} Tage</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {meals.map((meal, index) => (
            <MealDay
              key={index}
              day={meal.day}
              breakfast={meal.breakfast}
              lunch={meal.lunch}
              snack={meal.snack}
              notes={meal.notes}
              onChange={(field, value) => handleMealChange(index, field, value)}
            />
          ))}
        </div>
      </div>

      {/* Allergen Information */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <p className="eyebrow">Hinweise</p>
          <h2 className="text-lg font-semibold text-secondary-900">⚠️ Allergen-Informationen</h2>
          <p className="page-subtitle">Eltern sehen diese Angaben bei einem Allergen-Treffer.</p>
        </div>

        {allergenInfo.length > 0 && (
          <div className="mb-4 space-y-3">
            {allergenInfo.map((info, index) => (
              <div
                key={index}
                className="surface grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <label className="label">Allergen</label>
                  <select
                    value={info.allergen}
                    onChange={e => handleAllergenChange(index, 'allergen', e.target.value)}
                    className="input"
                  >
                    <option value="">-- Wählen --</option>
                    {COMMON_ALLERGENS.map(allergen => (
                      <option key={allergen} value={allergen}>
                        {allergen}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Details</label>
                  <input
                    type="text"
                    value={info.details}
                    onChange={e => handleAllergenChange(index, 'details', e.target.value)}
                    placeholder="z.B. 'Enthält Spuren von...'"
                    className="input"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeAllergen(index)}
                  className="btn btn-secondary text-red-700"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={addAllergen} className="btn btn-secondary">
          + Allergen hinzufügen
        </button>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg px-6">
          {isLoading ? '⏳ wird hochgeladen...' : '✅ Speiseplan hochladen'}
        </button>
      </div>
    </form>
  );
}
