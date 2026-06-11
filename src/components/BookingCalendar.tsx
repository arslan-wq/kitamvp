'use client';

import { useMemo, useState } from 'react';

// Markierung je Tag (YYYY-MM-DD)
export interface DayMark {
  booked?: boolean;     // bestätigte Buchung/Anwesenheit
  pending?: boolean;    // offene Anfrage
  extra?: boolean;      // Zusatztag (⭐)
  count?: number;       // Anzahl Kinder (Personal-Ansicht)
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function BookingCalendar({
  marks,
  onDayClick,
  initialMonth,
  selected,
}: {
  marks: Record<string, DayMark>;
  onDayClick?: (dateStr: string) => void;
  initialMonth?: { year: number; month: number }; // month 0-basiert
  selected?: string | null;
}) {
  const today = useMemo(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  }, []);
  const [view, setView] = useState(initialMonth || { year: today.y, month: today.m });

  const todayKey = toKey(today.y, today.m, today.d);

  const cells = useMemo(() => {
    const { year, month } = view;
    const first = new Date(year, month, 1);
    // Wochenstart Montag: getDay() So=0..Sa=6 → Offset
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [view]);

  const prev = () => setView(v => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView(v => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const goToday = () => setView({ year: today.y, month: today.m });

  return (
    <div className="card p-4 sm:p-5">
      {/* Kopf: Monat + Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prev} className="btn-icon w-9 h-9 text-secondary-500 hover:bg-primary-50 hover:text-primary-700" aria-label="Vorheriger Monat">‹</button>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-secondary-900 text-base sm:text-lg">{MONTHS[view.month]} {view.year}</h3>
          <button type="button" onClick={goToday} className="chip chip-neutral hover:bg-primary-100 transition">Heute</button>
        </div>
        <button type="button" onClick={next} className="btn-icon w-9 h-9 text-secondary-500 hover:bg-primary-50 hover:text-primary-700" aria-label="Nächster Monat">›</button>
      </div>

      {/* Wochentage */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WD.map(w => (
          <div key={w} className="text-center text-xs font-semibold text-secondary-400 py-1">{w}</div>
        ))}
      </div>

      {/* Tage */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = toKey(view.year, view.month, d);
          const mark = marks[key];
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const weekend = (i % 7) >= 5;

          let tone = 'bg-white hover:bg-primary-50 border-secondary-100 text-secondary-700';
          if (mark?.booked) tone = 'bg-primary-100 hover:bg-primary-200 border-primary-200 text-primary-800 font-semibold';
          else if (mark?.pending) tone = 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800';
          else if (weekend) tone = 'bg-secondary-50/60 hover:bg-primary-50 border-secondary-100 text-secondary-400';

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick?.(key)}
              className={`relative aspect-square rounded-xl border text-sm flex flex-col items-center justify-center transition ${tone} ${isSelected ? 'ring-2 ring-primary-500' : ''} ${isToday ? 'outline outline-2 outline-offset-[-2px] outline-primary-400' : ''}`}
            >
              <span>{d}</span>
              {/* Marker-Punkte / Stern */}
              <span className="absolute bottom-1 flex items-center gap-0.5 leading-none">
                {mark?.extra && <span className="text-[10px]" title="Zusatztag">⭐</span>}
                {mark?.booked && !mark?.extra && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                {mark?.pending && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </span>
              {typeof mark?.count === 'number' && mark.count > 0 && (
                <span className="absolute top-1 right-1 text-[9px] font-bold text-primary-600">{mark.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-secondary-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-100 border border-primary-200" /> Gebucht</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Angefragt</span>
        <span className="flex items-center gap-1.5">⭐ Zusatztag</span>
      </div>
    </div>
  );
}

// Hilfsfunktion: konkrete Tage einer wiederkehrenden Buchung im sichtbaren Bereich expandieren
export function expandBookingDays(
  booking: { startDate: string; endDate: string; weekdays: number[] },
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const out: string[] = [];
  const s = new Date(booking.startDate.slice(0, 10));
  const e = new Date(booking.endDate.slice(0, 10));
  const from = s > rangeStart ? s : rangeStart;
  const to = e < rangeEnd ? e : rangeEnd;
  const cur = new Date(from);
  while (cur <= to) {
    if (booking.weekdays.includes(cur.getDay())) {
      out.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
