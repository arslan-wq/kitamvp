// T3: Belegungs-Prozent & Rechnungsbetrag aus „gewünschten Betreuungstagen".
//
// Tages-Prozent aus den Tagesteilen (Vormittag/Mittagessen/Nachmittag):
//   Vormittag                = 50 %
//   Vormittag + Mittagessen  = 70 %
//   Vormittag + Mittag + NM  = 100 %
//   Mittagessen ALLEIN       = 14 %  (Sonderfall)
// Daraus additive Gewichte: VM 50, MI 20, NM 30 (ganzer Tag = 100 %).
// Nicht ausdrücklich genannte Kombinationen (z. B. nur Nachmittag = 30 %,
// Vormittag+Nachmittag = 80 %, Mittag+Nachmittag = 50 %) ergeben sich additiv
// und können bei Bedarf hier angepasst werden.
//
// Wochen-Belegung% = (100/500) × Summe der Tages-% = Summe ÷ 5.

export type DesiredCareDays = Record<string | number, string[]>;

export const PART_WEIGHTS: Record<string, number> = {
  VORMITTAG: 50,
  MITTAGESSEN: 20,
  NACHMITTAG: 30,
};

export function dayPercent(parts: string[] | undefined | null): number {
  if (!parts || parts.length === 0) return 0;
  // Sonderfall: nur Mittagessen
  if (parts.length === 1 && parts[0] === 'MITTAGESSEN') return 14;
  let p = 0;
  for (const k of parts) p += PART_WEIGHTS[k] || 0;
  return Math.min(100, p);
}

// Wochen-Belegung in Prozent (0–100), gerundet auf eine Nachkommastelle.
export function weekOccupancyPercent(dcd: DesiredCareDays | null | undefined): number {
  if (!dcd) return 0;
  let sum = 0;
  for (let d = 1; d <= 5; d++) sum += dayPercent(dcd[d] ?? dcd[String(d)]);
  return Math.round((sum / 5) * 10) / 10;
}

// Standort-Gruppe für die Tarifwahl
export function locationGroup(locationName?: string | null): 'AESCH' | 'BASELSTADT' | null {
  if (!locationName) return null;
  if (/aesch/i.test(locationName)) return 'AESCH';
  if (/johan|breite/i.test(locationName)) return 'BASELSTADT';
  return null;
}

// 100%-Monatstarife (CHF) nach Standort & Alter
export const FULL_RATES = {
  AESCH: { under18: 2600, over18: 2400 },
  BASELSTADT: { under18: 3970, over18: 3020 },
} as const;

export function ageInMonths(birthDate: string | Date, ref: Date = new Date()): number {
  const b = new Date(birthDate);
  return (ref.getFullYear() - b.getFullYear()) * 12 + (ref.getMonth() - b.getMonth()) - (ref.getDate() < b.getDate() ? 1 : 0);
}

// 100%-Tarif für ein Kind (Standort + Alter). null, wenn Standort unbekannt.
export function fullMonthRate(locationName: string | null | undefined, birthDate: string | Date, ref?: Date): number | null {
  const grp = locationGroup(locationName);
  if (!grp) return null;
  const under18 = ageInMonths(birthDate, ref) < 18;
  return FULL_RATES[grp][under18 ? 'under18' : 'over18'];
}

// Monatsbetrag = Tarif × Belegung%. null, wenn Standort unbekannt.
export function monthlyAmount(
  occupancyPercent: number,
  locationName: string | null | undefined,
  birthDate: string | Date,
  ref?: Date,
): number | null {
  const rate = fullMonthRate(locationName, birthDate, ref);
  if (rate == null) return null;
  return Math.round((rate * occupancyPercent) / 100);
}
