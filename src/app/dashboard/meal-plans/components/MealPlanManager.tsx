'use client';

import { useState, useEffect, useCallback } from 'react';
import { MealDay } from './MealDay';

interface MealPlanData { day: string; breakfast: string; lunch: string; snack: string; notes?: string; }
interface AllergenInfo { allergen: string; details: string; }

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const COMMON_ALLERGENS = ['Milch', 'Eier', 'Erdnüsse', 'Baumnüsse', 'Fisch', 'Krebstiere', 'Soja', 'Gluten', 'Sesam'];

const emptyMeals = () => DAYS.map(day => ({ day, breakfast: '', lunch: '', snack: '', notes: '' }));
// Montag der Woche eines Datums (lokal)
function mondayOf(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff); date.setHours(0, 0, 0, 0);
  return date;
}
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function MealPlanManager({ kitaId }: { kitaId: string }) {
  void kitaId;
  const [weekDate, setWeekDate] = useState<string>(todayStr());
  const [dupDate, setDupDate] = useState<string>('');
  const [meals, setMeals] = useState<MealPlanData[]>(emptyMeals());
  const [allergenInfo, setAllergenInfo] = useState<AllergenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

  // Übersicht: aktuelle + künftige Wochen
  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/meal-plans');
      setPlans(res.ok ? await res.json() : []);
    } catch { /* still */ }
  }, []);
  useEffect(() => { loadPlans(); }, [loadPlans]);

  // Bestehenden Plan der gewählten Woche laden
  const loadWeek = useCallback(async (ws: Date) => {
    try {
      const res = await fetch(`/api/meal-plans?weekStart=${ws.toISOString()}`);
      const data = res.ok ? await res.json() : [];
      const plan = Array.isArray(data) ? data.find((p: any) => new Date(p.weekStart).toDateString() === ws.toDateString()) : null;
      if (plan) {
        setLoadedId(plan.id);
        try {
          const m = JSON.parse(plan.meals);
          setMeals(DAYS.map((day) => { const f = m.find((x: any) => x.day === day) || {}; return { day, breakfast: f.breakfast || '', lunch: f.lunch || '', snack: f.snack || '', notes: f.notes || '' }; }));
        } catch { setMeals(emptyMeals()); }
        try { setAllergenInfo(plan.allergenInfo ? JSON.parse(plan.allergenInfo) : []); } catch { setAllergenInfo([]); }
      } else { setLoadedId(null); setMeals(emptyMeals()); setAllergenInfo([]); }
    } catch { /* still */ }
  }, []);
  useEffect(() => { loadWeek(mondayOf(weekDate)); }, [weekDate, loadWeek]);

  const deletePlan = async () => {
    if (!loadedId) return;
    if (!confirm('Menüplan dieser Woche wirklich löschen?')) return;
    setIsLoading(true); setMessage('');
    try {
      const res = await fetch(`/api/meal-plans/${loadedId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessageType('success'); setMessage('🗑️ Menüplan gelöscht.');
        setLoadedId(null); setMeals(emptyMeals()); setAllergenInfo([]);
        await loadPlans();
      } else { setMessageType('error'); setMessage('Löschen fehlgeschlagen'); }
    } finally { setIsLoading(false); }
  };

  const dateToInput = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  const handleMealChange = (index: number, field: string, value: string) => {
    const updated = [...meals]; (updated[index] as any)[field] = value; setMeals(updated);
  };
  const addAllergen = () => setAllergenInfo([...allergenInfo, { allergen: '', details: '' }]);
  const removeAllergen = (i: number) => setAllergenInfo(allergenInfo.filter((_, x) => x !== i));
  const handleAllergenChange = (i: number, field: string, value: string) => {
    const updated = [...allergenInfo]; (updated[i] as any)[field] = value; setAllergenInfo(updated);
  };

  const saveFor = async (monday: Date) => {
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    const res = await fetch('/api/meal-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: monday.toISOString(), weekEnd: sunday.toISOString(),
        meals, allergenInfo: allergenInfo.length > 0 ? allergenInfo : null,
        fileName: `speiseplan-${monday.toISOString().split('T')[0]}.json`,
      }),
    });
    if (!res.ok) throw new Error('Speichern fehlgeschlagen');
    return monday;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setMessage('');
    try {
      const m = await saveFor(mondayOf(weekDate));
      setMessageType('success');
      setMessage(`✅ Menüplan für die Woche vom ${m.toLocaleDateString('de-CH')} gespeichert.`);
      await loadPlans(); await loadWeek(m);
    } catch (err) {
      setMessageType('error'); setMessage(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally { setIsLoading(false); }
  };

  const duplicate = async () => {
    if (!dupDate) { setMessageType('error'); setMessage('Bitte ein Datum der Zielwoche wählen.'); return; }
    setIsLoading(true); setMessage('');
    try {
      const target = mondayOf(dupDate);
      await saveFor(target);
      setMessageType('success');
      setMessage(`✅ Menüplan auf die Woche vom ${target.toLocaleDateString('de-CH')} dupliziert.`);
      await loadPlans();
    } catch (err) {
      setMessageType('error'); setMessage(err instanceof Error ? err.message : 'Duplizieren fehlgeschlagen');
    } finally { setIsLoading(false); }
  };

  const weekMonday = mondayOf(weekDate);
  const weekSunday = new Date(weekMonday); weekSunday.setDate(weekSunday.getDate() + 4);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && <div className={messageType === 'success' ? 'alert alert-success' : 'alert alert-error'}>{message}</div>}

      {/* Wochenauswahl + Duplizieren */}
      <div className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Woche (beliebiges Datum)</label>
          <input type="date" className="input" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
          <p className="help-text">Mo {weekMonday.toLocaleDateString('de-CH')} – Fr {weekSunday.toLocaleDateString('de-CH')}</p>
        </div>
        <div>
          <label className="label">Auf Zielwoche duplizieren</label>
          <div className="flex gap-2">
            <input type="date" className="input" value={dupDate} onChange={(e) => setDupDate(e.target.value)} />
            <button type="button" onClick={duplicate} disabled={isLoading} className="btn btn-secondary whitespace-nowrap">⧉ Duplizieren</button>
          </div>
          <p className="help-text">Kopiert die aktuellen Einträge in die Zielwoche.</p>
        </div>
      </div>

      {/* Wochenplan */}
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
            <MealDay key={index} day={meal.day} breakfast={meal.breakfast} lunch={meal.lunch} snack={meal.snack} notes={meal.notes}
              onChange={(field, value) => handleMealChange(index, field, value)} />
          ))}
        </div>
      </div>

      {/* Allergene */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <p className="eyebrow">Hinweise</p>
          <h2 className="text-lg font-semibold text-secondary-900">⚠️ Allergen-Informationen</h2>
          <p className="page-subtitle">Eltern sehen diese Angaben bei einem Allergen-Treffer.</p>
        </div>
        {allergenInfo.length > 0 && (
          <div className="mb-4 space-y-3">
            {allergenInfo.map((info, index) => (
              <div key={index} className="surface grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className="label">Allergen</label>
                  <select value={info.allergen} onChange={e => handleAllergenChange(index, 'allergen', e.target.value)} className="input">
                    <option value="">-- Wählen --</option>
                    {COMMON_ALLERGENS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Details</label>
                  <input type="text" value={info.details} onChange={e => handleAllergenChange(index, 'details', e.target.value)} placeholder="z.B. 'Enthält Spuren von...'" className="input" />
                </div>
                <button type="button" onClick={() => removeAllergen(index)} className="btn btn-secondary text-red-700">Entfernen</button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addAllergen} className="btn btn-secondary">+ Allergen hinzufügen</button>
      </div>

      <div className="flex justify-end gap-3">
        {loadedId && (
          <button type="button" onClick={deletePlan} disabled={isLoading} className="btn btn-secondary text-red-700">🗑️ Diese Woche löschen</button>
        )}
        <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg px-6">{isLoading ? '⏳ speichert…' : (loadedId ? '💾 Änderungen speichern' : '✅ Menüplan speichern')}</button>
      </div>

      {/* Geplante Wochen — Übersicht (2–3 Monate vorausplanen) */}
      <div className="card p-6">
        <p className="eyebrow mb-3">Geplante Wochen</p>
        {plans.length === 0 ? (
          <p className="text-sm text-secondary-400">Noch keine Menüpläne erfasst. Wähle oben eine Woche und speichere.</p>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => {
              const ws = new Date(p.weekStart);
              const we = new Date(ws); we.setDate(we.getDate() + 4);
              const active = loadedId === p.id;
              return (
                <div key={p.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl ${active ? 'bg-primary-50 ring-1 ring-primary-200' : 'surface'}`}>
                  <span className="text-sm font-medium text-secondary-900">
                    Woche {ws.toLocaleDateString('de-CH')} – {we.toLocaleDateString('de-CH')}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => setWeekDate(dateToInput(p.weekStart))} className="btn btn-secondary btn-sm">✏️ Bearbeiten</button>
                    <button type="button" onClick={async () => {
                      if (!confirm('Diesen Menüplan löschen?')) return;
                      const res = await fetch(`/api/meal-plans/${p.id}`, { method: 'DELETE' });
                      if (res.ok) { if (loadedId === p.id) { setLoadedId(null); setMeals(emptyMeals()); setAllergenInfo([]); } await loadPlans(); }
                    }} className="btn btn-sm text-red-600 hover:bg-red-50">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </form>
  );
}
