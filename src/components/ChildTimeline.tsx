'use client';

import { useEffect, useState } from 'react';
import ReportDetailModal from '@/components/ReportDetailModal';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const ACTIVITY_META: Record<string, { icon: string; name: string }> = {
  EATING: { icon: '🍽️', name: 'Essen' },
  DRINKING: { icon: '🥤', name: 'Trinken' },
  CHANGING_DIAPER: { icon: '🧷', name: 'Wickeln' },
  SLEEPING: { icon: '😴', name: 'Schlafen' },
  ACTIVITY: { icon: '🎨', name: 'Beschäftigung' },
  DISCUSSION: { icon: '💬', name: 'Besprechung' },
  NOTE: { icon: '📝', name: 'Bemerkung' },
  HEALTH_ISSUE: { icon: '🏥', name: 'Autsch' },
  TRIP: { icon: '🚌', name: 'Ausflug' },
  ABSENT: { icon: '❌', name: 'Abwesend' },
  HOLIDAY: { icon: '🎉', name: 'Ferien' },
  DRAWING: { icon: '🖍️', name: 'Zeichnen' },
};

const DAY_TYPE_LABELS: Record<string, string> = {
  FULL_DAY: 'Ganztags',
  MORNING_WITH_MEAL: 'Vormittag + Essen',
  MORNING_NO_MEAL: 'Vormittag',
  AFTERNOON_WITH_MEAL: 'Nachmittag + Essen',
  AFTERNOON_NO_MEAL: 'Nachmittag',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Ausstehend', cls: 'chip-warning' },
  APPROVED: { label: 'Akzeptiert', cls: 'chip-success' },
  REJECTED: { label: 'Abgelehnt', cls: 'chip-error' },
};

interface Props {
  childId: string;
  /** Aktivitäten-Endpunkt: '/api/activities' (Personal) oder '/api/parent/activities' (Eltern) */
  activitiesBase: string;
}

export default function ChildTimeline({ childId, activitiesBase }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDetail, setReportDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      const safe = async (url: string) => {
        try {
          const r = await fetch(url);
          return r.ok ? await r.json() : [];
        } catch {
          return [];
        }
      };
      const [acts, reps, books] = await Promise.all([
        safe(`${activitiesBase}?childId=${childId}`),
        safe(`/api/daily-reports?childId=${childId}`),
        safe(`/api/bookings`),
      ]);
      setActivities(Array.isArray(acts) ? acts : []);
      setReports(Array.isArray(reps) ? reps : []);
      setBookings((Array.isArray(books) ? books : []).filter((b: any) => b.childId === childId));
      setLoading(false);
    })();
  }, [childId, activitiesBase]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('de-CH');
  const fmtTime = (s: string) =>
    new Date(s).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });

  // T1: Bericht-Tage = Tage mit Bericht ODER mit eingebuchten Aktivitäten
  const actCountByDate: Record<string, number> = {};
  for (const a of activities) { const k = new Date(a.timestamp).toDateString(); actCountByDate[k] = (actCountByDate[k] || 0) + 1; }
  const reportDays = (() => {
    const byDate = new Map<string, any>();
    for (const r of reports) byDate.set(new Date(r.date).toDateString(), r);
    for (const a of activities) {
      const k = new Date(a.timestamp).toDateString();
      if (!byDate.has(k)) byDate.set(k, { id: 'syn-' + k, childId, date: a.timestamp, synthetic: true });
    }
    return Array.from(byDate.values()).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
  })();

  if (loading) {
    return <div className="text-center py-6 text-secondary-500">Lädt Verlauf…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Belegungsplanung */}
      <section className="card p-6 sm:p-8">
        <p className="eyebrow mb-4">📅 Belegungsplanung</p>
        {bookings.length === 0 ? (
          <p className="text-sm text-secondary-500">Keine Buchungen vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const st = STATUS_META[b.status] ?? STATUS_META.PENDING;
              return (
                <div key={b.id} className="surface p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary-900">
                      {fmtDate(b.startDate)} – {fmtDate(b.endDate)}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {(b.weekdays || []).map((w: number) => WEEKDAYS[w]).join(', ')} · {DAY_TYPE_LABELS[b.dayType] || b.dayType}
                    </p>
                  </div>
                  <span className={`chip ${st.cls} shrink-0`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tagesberichte */}
      <section className="card p-6 sm:p-8">
        <p className="eyebrow mb-4">📋 Tagesberichte</p>
        {reportDays.length === 0 ? (
          <p className="text-sm text-secondary-500">Noch keine Tagesberichte.</p>
        ) : (
          <div className="space-y-2">
            {reportDays.slice(0, 14).map((r) => {
              const actCount = actCountByDate[new Date(r.date).toDateString()] || 0;
              return (
                <button type="button" key={r.id} onClick={() => setReportDetail(r)} className="surface p-3 w-full text-left hover:ring-1 hover:ring-primary-200 transition" title="Bericht ansehen">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-secondary-900">{fmtDate(r.date)}{r.synthetic && <span className="text-xs font-normal text-secondary-400"> · nur Aktivitäten</span>}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {r.mood && <span className="chip chip-primary">Stimmung: {r.mood}</span>}
                      {Array.isArray(r.meals) && r.meals.length > 0 && <span className="chip chip-neutral">{r.meals.length} Mahlzeiten</span>}
                      {typeof r.sleepDuration === 'number' && r.sleepDuration > 0 && <span className="chip chip-neutral">Schlaf {r.sleepDuration} Min</span>}
                      {Array.isArray(r.incidents) && r.incidents.length > 0 && <span className="chip chip-warning">{r.incidents.length} Vorfall/-fälle</span>}
                      {actCount > 0 && <span className="chip chip-accent">📊 {actCount} Aktivität{actCount > 1 ? 'en' : ''}</span>}
                    </div>
                  </div>
                  {r.notes && <p className="text-sm text-secondary-600 mt-1">{r.notes}</p>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Aktivitäten */}
      <section className="card p-6 sm:p-8">
        <p className="eyebrow mb-4">📊 Aktivitäten</p>
        {activities.length === 0 ? (
          <p className="text-sm text-secondary-500">Noch keine Aktivitäten protokolliert.</p>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 15).map((a) => {
              const m = ACTIVITY_META[a.type] ?? { icon: '•', name: a.type };
              return (
                <div key={a.id} className="flex items-center gap-3 p-2.5 surface">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white text-lg shrink-0">{m.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-secondary-900">{m.name}</p>
                      <span className="text-xs text-secondary-400">
                        {fmtDate(a.timestamp)} · {fmtTime(a.timestamp)}
                      </span>
                    </div>
                    {a.details && <p className="text-sm text-secondary-600 truncate">{a.details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reportDetail && (
        <ReportDetailModal
          report={reportDetail}
          activitiesBase={activitiesBase}
          preloadedActivities={activities}
          editable={activitiesBase === '/api/activities'}
          onClose={() => setReportDetail(null)}
        />
      )}
    </div>
  );
}
