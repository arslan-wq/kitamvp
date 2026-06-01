'use client';

interface MealDayProps {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  notes?: string;
  onChange: (field: string, value: string) => void;
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🥣',
  lunch: '🍽️',
  snack: '🍎',
};

export function MealDay({ day, breakfast, lunch, snack, notes, onChange }: MealDayProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary-300">
      <h3 className="mb-3 text-sm font-bold text-secondary-900">{day}</h3>

      <div className="flex flex-1 flex-col gap-3">
        {/* Breakfast */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-secondary-500">
            <span>{MEAL_EMOJIS.breakfast}</span>
            Frühstück
          </label>
          <input
            type="text"
            value={breakfast}
            onChange={e => onChange('breakfast', e.target.value)}
            placeholder="z.B. Porridge, Obst"
            className="input"
          />
        </div>

        {/* Lunch */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-secondary-500">
            <span>{MEAL_EMOJIS.lunch}</span>
            Mittagessen
          </label>
          <input
            type="text"
            value={lunch}
            onChange={e => onChange('lunch', e.target.value)}
            placeholder="z.B. Pasta, Brokkoli"
            className="input"
          />
        </div>

        {/* Snack */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-secondary-500">
            <span>{MEAL_EMOJIS.snack}</span>
            Snack
          </label>
          <input
            type="text"
            value={snack}
            onChange={e => onChange('snack', e.target.value)}
            placeholder="z.B. Joghurt, Nüsse"
            className="input"
          />
        </div>

        {/* Notes */}
        <div className="mt-auto">
          <label className="mb-1.5 block text-xs font-semibold text-secondary-500">
            Anmerkungen
          </label>
          <input
            type="text"
            value={notes || ''}
            onChange={e => onChange('notes', e.target.value)}
            placeholder="z.B. Bio, Vegetarisch"
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
