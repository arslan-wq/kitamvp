'use client';

import { useEffect, useRef, useState } from 'react';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  className?: string;
}

// Monatswahl per Klick (Jahr-Navigation + Monatsraster), Texteingabe bleibt weiterhin möglich.
export default function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [viewYear, setViewYear] = useState(() => Number(value.split('-')[0]) || new Date().getFullYear());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const isValid = MONTH_RE.test(draft);
  const [selY, selM] = MONTH_RE.test(value) ? value.split('-').map(Number) : [null, null];

  const openPicker = () => {
    setViewYear(Number(value.split('-')[0]) || new Date().getFullYear());
    setOpen(true);
  };

  const pickMonth = (m: number) => {
    const next = `${viewYear}-${String(m).padStart(2, '0')}`;
    onChange(next);
    setOpen(false);
  };

  const commitDraft = () => {
    if (MONTH_RE.test(draft)) onChange(draft);
    else setDraft(value);
  };

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <input
        type="text"
        inputMode="numeric"
        className="input max-w-[8.5rem]"
        value={draft}
        placeholder="JJJJ-MM"
        maxLength={7}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={openPicker}
        onBlur={commitDraft}
        onKeyDown={(e) => { if (e.key === 'Enter') commitDraft(); }}
      />
      {!isValid && <p className="text-xs text-red-600 mt-1">Ungültiger Monat (Format JJJJ-MM)</p>}

      {open && (
        <div className="absolute z-20 mt-1 w-56 rounded-lg border border-secondary-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="btn btn-secondary px-2 py-1" onClick={() => setViewYear((y) => y - 1)} aria-label="Vorheriges Jahr">◀</button>
            <span className="font-semibold text-secondary-900">{viewYear}</span>
            <button type="button" className="btn btn-secondary px-2 py-1" onClick={() => setViewYear((y) => y + 1)} aria-label="Nächstes Jahr">▶</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {MONTH_NAMES.map((label, i) => {
              const m = i + 1;
              const isSelected = selY === viewYear && selM === m;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pickMonth(m)}
                  className={`text-sm rounded-md px-2 py-1.5 ${isSelected ? 'bg-primary-600 text-white' : 'hover:bg-secondary-100 text-secondary-700'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
