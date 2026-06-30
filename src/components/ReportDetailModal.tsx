'use client';

import { useEffect, useState } from 'react';

// Geteiltes Bericht-Detail-Popup: zeigt die Bericht-Felder UND die an diesem
// Tag eingebuchten Aktivitäten (T-Berichte). Wird in der Berichte-Timeline,
// im Kind-Dossier und im Eltern-Portal verwendet.

const MEAL_LABEL: Record<string, string> = { breakfast: 'Frühstück', lunch: 'Mittagessen', snack: 'Snack', dinner: 'Abendessen' };
const MOOD_LABEL: Record<string, string> = { happy: '😊 Fröhlich', content: '🙂 Zufrieden', neutral: '😐 Neutral', tired: '😴 Müde', sad: '😢 Traurig', grumpy: '😠 Quengelig', sick: '🤒 Krank' };
const ACT_LABEL: Record<string, { l: string; i: string }> = {
  EATING: { l: 'Essen', i: '🍽️' }, DRINKING: { l: 'Trinken', i: '🥤' }, CHANGING_DIAPER: { l: 'Wickeln', i: '🧷' },
  SLEEPING: { l: 'Schlafen', i: '😴' }, ACTIVITY: { l: 'Beschäftigung', i: '🎨' }, DISCUSSION: { l: 'Besprechung', i: '💬' },
  NOTE: { l: 'Bemerkung', i: '📝' }, HEALTH_ISSUE: { l: 'Gesundheit', i: '🏥' }, TRIP: { l: 'Ausflug', i: '🚌' },
  ABSENT: { l: 'Abwesend', i: '❌' }, HOLIDAY: { l: 'Ferien', i: '🎉' }, DRAWING: { l: 'Zeichnen', i: '✏️' },
};
const parseArr = (a?: any[]) => (Array.isArray(a) ? a.map(x => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return { text: x }; } }) : []);
const sameDay = (a: string | Date, b: string | Date) => new Date(a).toDateString() === new Date(b).toDateString();
const fmtTime = (t: string) => new Date(t).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });

export default function ReportDetailModal({
  report,
  activitiesBase = '/api/activities',
  preloadedActivities,
  editable = false,
  onClose,
  onPrint,
  onEdit,
}: {
  report: any;
  activitiesBase?: string;
  preloadedActivities?: any[];
  editable?: boolean;
  onClose: () => void;
  onPrint?: () => void;
  onEdit?: () => void;
}) {
  const [acts, setActs] = useState<any[]>(() =>
    Array.isArray(preloadedActivities) ? preloadedActivities.filter(a => sameDay(a.timestamp, report.date)) : []
  );
  const [loading, setLoading] = useState(!preloadedActivities);

  useEffect(() => {
    if (preloadedActivities) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${activitiesBase}?childId=${report.childId}`);
        const data = res.ok ? await res.json() : [];
        if (active) setActs((Array.isArray(data) ? data : []).filter((a: any) => sameDay(a.timestamp, report.date)));
      } catch { /* still */ } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [report, activitiesBase, preloadedActivities]);

  const meals = parseArr(report.meals);
  const incidents = parseArr(report.incidents);
  const reportActs = parseArr(report.activities);

  const deleteActivity = async (id: string) => {
    if (!confirm('Diese Aktivität wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      if (res.ok) setActs(prev => prev.filter(a => a.id !== id));
    } catch { /* still */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-elevated">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="eyebrow">📋 Tagesbericht</p>
            <h2 className="text-lg font-bold text-secondary-900">{report.child?.firstName} {report.child?.lastName}</h2>
            <p className="text-xs text-secondary-500">{new Date(report.date).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="btn-icon w-8 h-8 text-secondary-400 hover:bg-secondary-100" title="Schliessen">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          {report.mood && <p><span className="text-secondary-400">Stimmung:</span> {MOOD_LABEL[report.mood] || report.mood}</p>}
          {meals.length > 0 && <p><span className="text-secondary-400">Mahlzeiten:</span> {meals.map((m: any) => MEAL_LABEL[m.type] || m.type).join(', ')}</p>}
          {report.sleepDuration > 0 && <p><span className="text-secondary-400">Schlaf:</span> {report.sleepDuration} Min</p>}
          {(report.toiletVisits > 0 || report.diaperChanges > 0) && <p><span className="text-secondary-400">Hygiene:</span> WC {report.toiletVisits || 0} · Windeln {report.diaperChanges || 0}</p>}
          {reportActs.length > 0 && <div><p className="text-secondary-400 mb-0.5">Notizen zu Aktivitäten</p><ul className="list-disc pl-5 text-secondary-800">{reportActs.map((a: any, i: number) => <li key={i}>{a.name || a.text || a.type}</li>)}</ul></div>}
          {incidents.length > 0 && <div><p className="text-yellow-700 font-medium mb-0.5">⚠️ Vorfälle</p><ul className="list-disc pl-5 text-secondary-800">{incidents.map((x: any, i: number) => <li key={i} className="whitespace-pre-wrap break-words">{x.description || x.text || x.type}</li>)}</ul></div>}
          {report.notes && <div><p className="text-secondary-400 mb-0.5">Notizen</p><p className="text-secondary-800 whitespace-pre-wrap break-words">{report.notes}</p></div>}

          {/* Eingebuchte Aktivitäten des Tages (T1) */}
          <div className="pt-2 border-t border-secondary-100">
            <p className="text-secondary-400 mb-1.5">📊 Eingebuchte Aktivitäten</p>
            {loading ? (
              <p className="text-secondary-400 text-xs">Laden…</p>
            ) : acts.length === 0 ? (
              <p className="text-secondary-400 text-xs">Keine Aktivitäten an diesem Tag.</p>
            ) : (
              <ul className="space-y-1.5">
                {acts.map((a: any) => {
                  const m = ACT_LABEL[a.type] || { l: a.type, i: '•' };
                  return (
                    <li key={a.id} className="flex items-start gap-2">
                      <span>{m.i}</span>
                      <span className="text-secondary-800 flex-1 min-w-0">
                        <span className="font-medium">{m.l}</span>
                        <span className="text-secondary-400"> · {fmtTime(a.timestamp)}</span>
                        {a.details ? <span className="block text-secondary-600">{a.details}</span> : null}
                      </span>
                      {editable && (
                        <button onClick={() => deleteActivity(a.id)} className="btn-icon w-6 h-6 text-secondary-400 hover:bg-red-50 hover:text-red-600 shrink-0" title="Aktivität löschen">🗑️</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          {onPrint && <button onClick={onPrint} className="btn btn-secondary btn-sm">🖨️ PDF</button>}
          {onEdit && <button onClick={onEdit} className="btn btn-secondary btn-sm">✏️ Bearbeiten</button>}
          <button onClick={onClose} className="btn btn-primary btn-sm px-5">Schliessen</button>
        </div>
      </div>
    </div>
  );
}
