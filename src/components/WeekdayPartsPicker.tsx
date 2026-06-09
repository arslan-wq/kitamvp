'use client';

// T16: pro Wochentag (Mo–Fr) die Tagesteile Vormittag / Mittagessen / Nachmittag wählen.
// value: { [weekday:number]: string[] }  (weekday 1=Mo … 5=Fr)

export const PART_KEYS = ['VORMITTAG', 'MITTAGESSEN', 'NACHMITTAG'] as const;
export const PARTS = [
  { k: 'VORMITTAG', l: 'Vormittag' },
  { k: 'MITTAGESSEN', l: 'Mittagessen' },
  { k: 'NACHMITTAG', l: 'Nachmittag' },
];
const DAYS = [
  { v: 1, l: 'Montag' }, { v: 2, l: 'Dienstag' }, { v: 3, l: 'Mittwoch' },
  { v: 4, l: 'Donnerstag' }, { v: 5, l: 'Freitag' },
];

export type DayParts = Record<number, string[]>;

// Wochentage mit mind. einem Tagesteil → Int[] (für die „erwartet"-Logik)
export function dayPartsToWeekdays(dp: DayParts | null | undefined): number[] {
  if (!dp) return [];
  return Object.keys(dp).map(Number).filter(d => (dp[d] || []).length > 0);
}
// Label der Tagesteile eines bestimmten Wochentags (z.B. „Vormittag + Mittagessen")
export function dayPartsLabel(dp: DayParts | null | undefined, weekday: number): string {
  const parts = dp?.[weekday] || [];
  return PARTS.filter(p => parts.includes(p.k)).map(p => p.l).join(' + ');
}

export default function WeekdayPartsPicker({ value, onChange }: { value: DayParts; onChange: (v: DayParts) => void }) {
  const toggle = (day: number, part: string) => {
    const cur = value[day] || [];
    const next = cur.includes(part) ? cur.filter(p => p !== part) : [...cur, part];
    const updated: DayParts = { ...value, [day]: next };
    if (next.length === 0) delete updated[day];
    onChange(updated);
  };
  return (
    <div className="space-y-2">
      {DAYS.map(d => (
        <div key={d.v} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 surface rounded-xl">
          <span className="w-28 font-medium text-sm text-secondary-900 shrink-0">{d.l}</span>
          <div className="flex flex-wrap gap-2">
            {PARTS.map(p => {
              const active = (value[d.v] || []).includes(p.k);
              return (
                <button key={p.k} type="button" onClick={() => toggle(d.v, p.k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${active
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-200 bg-white text-secondary-500 hover:border-primary-300'}`}>
                  {active ? '✓ ' : ''}{p.l}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
