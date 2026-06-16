'use client';

interface MealDayProps {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  notes?: string;
  onChange: (field: string, value: string) => void;
  readOnly?: boolean;
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🥣',
  lunch: '🍽️',
  snack: '🍎',
};

const FIELDS: { key: 'breakfast' | 'lunch' | 'snack'; label: string; placeholder: string }[] = [
  { key: 'breakfast', label: 'Frühstück', placeholder: 'z.B. Porridge, Obst' },
  { key: 'lunch', label: 'Mittagessen', placeholder: 'z.B. Pasta, Brokkoli' },
  { key: 'snack', label: 'Snack', placeholder: 'z.B. Joghurt, Nüsse' },
];

export function MealDay({ day, breakfast, lunch, snack, notes, onChange, readOnly = false }: MealDayProps) {
  const values: Record<string, string> = { breakfast, lunch, snack, notes: notes || '' };

  const renderValue = (v: string) => (
    <p className="text-sm text-secondary-800 min-h-[1.25rem]">{v || <span className="text-secondary-300">—</span>}</p>
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary-300">
      <h3 className="mb-3 text-sm font-bold text-secondary-900">{day}</h3>

      <div className="flex flex-1 flex-col gap-3">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-secondary-500">
              <span>{MEAL_EMOJIS[f.key]}</span>
              {f.label}
            </label>
            {readOnly ? renderValue(values[f.key]) : (
              <input
                type="text"
                value={values[f.key]}
                onChange={e => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="input"
              />
            )}
          </div>
        ))}

        {/* Notes */}
        <div className="mt-auto">
          <label className="mb-1.5 block text-xs font-semibold text-secondary-500">Anmerkungen</label>
          {readOnly ? renderValue(values.notes) : (
            <input
              type="text"
              value={notes || ''}
              onChange={e => onChange('notes', e.target.value)}
              placeholder="z.B. Bio, Vegetarisch"
              className="input"
            />
          )}
        </div>
      </div>
    </div>
  );
}
