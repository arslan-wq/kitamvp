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
const fmtDay = (d: Date) => d.toLocaleDateString('de-CH');
const esc = (s: string) => (s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' } as any)[c]);

// Meals aus einem gespeicherten Plan robust normalisieren
function parseMeals(raw: any): MealPlanData[] {
  let m: any[] = [];
  try { m = typeof raw === 'string' ? JSON.parse(raw) : (raw || []); } catch { m = []; }
  return DAYS.map((day) => { const f = (m || []).find((x: any) => x.day === day) || {}; return { day, breakfast: f.breakfast || '', lunch: f.lunch || '', snack: f.snack || '', notes: f.notes || '' }; });
}
function parseAllergens(raw: any): AllergenInfo[] {
  try { return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []; } catch { return []; }
}

export default function MealPlanManager({ kitaId, canEdit = true }: { kitaId: string; canEdit?: boolean }) {
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

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/meal-plans');
      setPlans(res.ok ? await res.json() : []);
    } catch { /* still */ }
  }, []);
  useEffect(() => { loadPlans(); }, [loadPlans]);

  const loadWeek = useCallback(async (ws: Date) => {
    try {
      const res = await fetch(`/api/meal-plans?weekStart=${ws.toISOString()}`);
      const data = res.ok ? await res.json() : [];
      const plan = Array.isArray(data) ? data.find((p: any) => new Date(p.weekStart).toDateString() === ws.toDateString()) : null;
      if (plan) {
        setLoadedId(plan.id);
        setMeals(parseMeals(plan.meals));
        setAllergenInfo(parseAllergens(plan.allergenInfo));
      } else { setLoadedId(null); setMeals(emptyMeals()); setAllergenInfo([]); }
    } catch { /* still */ }
  }, []);
  useEffect(() => { loadWeek(mondayOf(weekDate)); }, [weekDate, loadWeek]);

  const dateToInput = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  const handleMealChange = (index: number, field: string, value: string) => {
    const updated = [...meals]; (updated[index] as any)[field] = value; setMeals(updated);
  };
  const addAllergen = () => setAllergenInfo([...allergenInfo, { allergen: '', details: '' }]);
  const removeAllergen = (i: number) => setAllergenInfo(allergenInfo.filter((_, x) => x !== i));
  const handleAllergenChange = (i: number, field: string, value: string) => {
    const updated = [...allergenInfo]; (updated[i] as any)[field] = value; setAllergenInfo(updated);
  };

  // Beliebige Mahlzeiten in eine Zielwoche speichern (für Editor-Save + Duplizieren)
  const saveMealsFor = async (monday: Date, mealsArg: MealPlanData[], allergenArg: AllergenInfo[]) => {
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    const res = await fetch('/api/meal-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: monday.toISOString(), weekEnd: sunday.toISOString(),
        meals: mealsArg, allergenInfo: allergenArg.length > 0 ? allergenArg : null,
        fileName: `speiseplan-${monday.toISOString().split('T')[0]}.json`,
      }),
    });
    if (!res.ok) throw new Error('Speichern fehlgeschlagen');
    return monday;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setMessage('');
    try {
      const m = await saveMealsFor(mondayOf(weekDate), meals, allergenInfo);
      setMessageType('success');
      setMessage(`✅ Menüplan für die Woche vom ${fmtDay(m)} gespeichert.`);
      await loadPlans(); await loadWeek(m);
    } catch (err) {
      setMessageType('error'); setMessage(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally { setIsLoading(false); }
  };

  const deletePlanById = async (id: string) => {
    if (!confirm('Menüplan dieser Woche wirklich löschen?')) return;
    setIsLoading(true); setMessage('');
    try {
      const res = await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (loadedId === id) { setLoadedId(null); setMeals(emptyMeals()); setAllergenInfo([]); }
        setMessageType('success'); setMessage('🗑️ Menüplan gelöscht.');
        await loadPlans();
      } else { setMessageType('error'); setMessage('Löschen fehlgeschlagen'); }
    } finally { setIsLoading(false); }
  };

  // Editor-Duplizieren (aktuelle Einträge → frei gewählte Zielwoche)
  const duplicate = async () => {
    if (!dupDate) { setMessageType('error'); setMessage('Bitte ein Datum der Zielwoche wählen.'); return; }
    setIsLoading(true); setMessage('');
    try {
      const target = mondayOf(dupDate);
      await saveMealsFor(target, meals, allergenInfo);
      setMessageType('success');
      setMessage(`✅ Menüplan auf die Woche vom ${fmtDay(target)} dupliziert.`);
      await loadPlans();
    } catch (err) {
      setMessageType('error'); setMessage(err instanceof Error ? err.message : 'Duplizieren fehlgeschlagen');
    } finally { setIsLoading(false); }
  };

  // Aus der Liste: diese Woche in die FOLGEWOCHE duplizieren
  const duplicatePlanToNextWeek = async (plan: any) => {
    const src = new Date(plan.weekStart);
    const target = mondayOf(dateToInput(plan.weekStart)); // sicher Montag
    target.setDate(target.getDate() + 7);
    if (!confirm(`Menüplan der Woche ${fmtDay(src)} in die Folgewoche (ab ${fmtDay(target)}) kopieren?`)) return;
    setIsLoading(true); setMessage('');
    try {
      await saveMealsFor(target, parseMeals(plan.meals), parseAllergens(plan.allergenInfo));
      setMessageType('success'); setMessage(`✅ In die Woche vom ${fmtDay(target)} dupliziert.`);
      await loadPlans();
    } catch (err) {
      setMessageType('error'); setMessage(err instanceof Error ? err.message : 'Duplizieren fehlgeschlagen');
    } finally { setIsLoading(false); }
  };

  // PDF: druckbare Wochenübersicht öffnen → „Als PDF speichern"
  const printWeek = (monday: Date, mealsArg: MealPlanData[], allergenArg: AllergenInfo[]) => {
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 4);
    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) { setMessageType('error'); setMessage('Pop-up blockiert — bitte erlauben, um das PDF zu öffnen.'); return; }
    const rows = mealsArg.map(m => `<tr>
      <th>${esc(m.day)}</th>
      <td>${esc(m.breakfast)}</td>
      <td>${esc(m.lunch)}</td>
      <td>${esc(m.snack)}</td>
      <td>${esc(m.notes || '')}</td></tr>`).join('');
    const allerg = allergenArg.length
      ? `<h3>Allergen-Hinweise</h3><ul>${allergenArg.map(a => `<li><strong>${esc(a.allergen)}</strong>${a.details ? ': ' + esc(a.details) : ''}</li>`).join('')}</ul>`
      : '';
    w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Menüplan ${fmtDay(monday)}</title>
      <style>
      *{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f}
      body{margin:32px}
      .head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:3px solid #6b8f71;padding-bottom:10px;margin-bottom:16px}
      .head img{height:40px;width:auto}
      h1{font-size:20px;margin:0}
      .sub{color:#6e6e73;font-size:13px;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #d2d2d7;padding:8px 10px;text-align:left;font-size:13px;vertical-align:top}
      thead th{background:#eef3ef}
      tbody th{background:#f7f9f7;width:110px}
      h3{margin-top:20px;font-size:15px}
      ul{margin:6px 0;padding-left:18px;font-size:13px}
      @media print{img{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>
      <div class="head">
        <div><h1>🍽️ Menüplan</h1><div class="sub">Woche ${fmtDay(monday)} – ${fmtDay(sunday)}</div></div>
        <img src="/brand/kitaluna-wordmark.svg" alt="KitaLuna" onerror="this.style.display='none'"/>
      </div>
      <table>
        <thead><tr><th>Tag</th><th>🥣 Frühstück</th><th>🍽️ Mittagessen</th><th>🍎 Snack</th><th>Anmerkungen</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${allerg}
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  const weekMonday = mondayOf(weekDate);
  const weekFriday = new Date(weekMonday); weekFriday.setDate(weekFriday.getDate() + 4);
  const hasContent = meals.some(m => m.breakfast || m.lunch || m.snack || m.notes);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && <div className={messageType === 'success' ? 'alert alert-success' : 'alert alert-error'}>{message}</div>}

      {/* Wochenauswahl (+ Duplizieren nur für Editor) */}
      <div className={`card p-6 grid grid-cols-1 gap-4 ${canEdit ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label className="label">Woche {canEdit ? '(beliebiges Datum)' : 'ansehen'}</label>
          <input type="date" className="input" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
          <p className="help-text">Mo {fmtDay(weekMonday)} – Fr {fmtDay(weekFriday)}{!canEdit && !loadedId ? ' · kein Plan erfasst' : ''}</p>
        </div>
        {canEdit && (
          <div>
            <label className="label">Auf Zielwoche duplizieren</label>
            <div className="flex gap-2">
              <input type="date" className="input" value={dupDate} onChange={(e) => setDupDate(e.target.value)} />
              <button type="button" onClick={duplicate} disabled={isLoading} className="btn btn-secondary whitespace-nowrap">⧉ Duplizieren</button>
            </div>
            <p className="help-text">Kopiert die aktuellen Einträge in die Zielwoche.</p>
          </div>
        )}
      </div>

      {/* Wochenplan */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow">Wochenplan</p>
            <h2 className="text-lg font-semibold text-secondary-900">📅 Montag – Freitag</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => printWeek(weekMonday, meals, allergenInfo)} disabled={!hasContent}
              className="btn btn-secondary btn-sm" title={hasContent ? 'Diese Woche als PDF' : 'Kein Inhalt zum Drucken'}>📄 PDF</button>
            <span className="chip chip-neutral">{meals.length} Tage</span>
          </div>
        </div>
        {!canEdit && !hasContent ? (
          <div className="empty-state"><div className="empty-state-icon">🍽️</div><p className="text-secondary-500">Für diese Woche ist noch kein Menüplan erfasst.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {meals.map((meal, index) => (
              <MealDay key={index} day={meal.day} breakfast={meal.breakfast} lunch={meal.lunch} snack={meal.snack} notes={meal.notes}
                readOnly={!canEdit}
                onChange={(field, value) => handleMealChange(index, field, value)} />
            ))}
          </div>
        )}
      </div>

      {/* Allergene */}
      {(canEdit || allergenInfo.length > 0) && (
        <div className="card p-6 sm:p-8">
          <div className="mb-6">
            <p className="eyebrow">Hinweise</p>
            <h2 className="text-lg font-semibold text-secondary-900">⚠️ Allergen-Informationen</h2>
            <p className="page-subtitle">Eltern sehen diese Angaben bei einem Allergen-Treffer.</p>
          </div>
          {!canEdit ? (
            <ul className="space-y-1.5">
              {allergenInfo.map((info, i) => (
                <li key={i} className="text-sm text-secondary-700"><strong>{info.allergen}</strong>{info.details ? `: ${info.details}` : ''}</li>
              ))}
            </ul>
          ) : (<>
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
          </>)}
        </div>
      )}

      {/* Speichern/Löschen — nur Editor */}
      {canEdit && (
        <div className="flex justify-end gap-3">
          {loadedId && (
            <button type="button" onClick={() => deletePlanById(loadedId)} disabled={isLoading} className="btn btn-secondary text-red-700">🗑️ Diese Woche löschen</button>
          )}
          <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg px-6">{isLoading ? '⏳ speichert…' : (loadedId ? '💾 Änderungen speichern' : '✅ Menüplan speichern')}</button>
        </div>
      )}

      {/* Geplante Wochen — Übersicht + Aktionen */}
      <div className="card p-6">
        <p className="eyebrow mb-3">Geplante Wochen</p>
        {plans.length === 0 ? (
          <p className="text-sm text-secondary-400">
            {canEdit ? 'Noch keine Menüpläne erfasst. Wähle oben eine Woche und speichere.' : 'Noch keine Menüpläne erfasst.'}
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => {
              const ws = new Date(p.weekStart);
              const we = new Date(ws); we.setDate(we.getDate() + 4);
              const active = loadedId === p.id;
              return (
                <div key={p.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl ${active ? 'bg-primary-50 ring-1 ring-primary-200' : 'surface'}`}>
                  <span className="text-sm font-medium text-secondary-900">
                    Woche {fmtDay(ws)} – {fmtDay(we)}
                  </span>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <button type="button" onClick={() => printWeek(mondayOf(dateToInput(p.weekStart)), parseMeals(p.meals), parseAllergens(p.allergenInfo))}
                      className="btn btn-secondary btn-sm" title="Als PDF">📄 PDF</button>
                    <button type="button" onClick={() => setWeekDate(dateToInput(p.weekStart))} className="btn btn-secondary btn-sm">
                      {canEdit ? '✏️ Bearbeiten' : '👁 Ansehen'}
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => duplicatePlanToNextWeek(p)} disabled={isLoading} className="btn btn-secondary btn-sm" title="In die Folgewoche kopieren">⧉ Duplizieren</button>
                    )}
                    {canEdit && (
                      <button type="button" onClick={() => deletePlanById(p.id)} className="btn btn-sm text-red-600 hover:bg-red-50" title="Löschen">🗑️</button>
                    )}
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
