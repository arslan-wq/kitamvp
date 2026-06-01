'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DailyReport {
  id: string;
  childId: string;
  date: string;
  meals: string[];
  extraBottles: number;
  extraBottleNotes?: string;
  sleepTime?: string;
  sleepDuration?: number;
  toiletVisits: number;
  diaperChanges: number;
  activities: string[];
  mood?: string;
  incidents: string[];
  notes?: string;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

export default function DailyReportsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch children
        const childRes = await fetch('/api/parent/children');
        const childData = await childRes.json();
        setChildren(childData);
        if (childData.length > 0) {
          setSelectedChildId(childData[0].id);
        }
      } catch (error) {
        console.error('Error fetching children:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  useEffect(() => {
    if (!selectedChildId) return;

    const fetchReports = async () => {
      try {
        const res = await fetch(`/api/children/${selectedChildId}/daily-reports`);
        if (!res.ok) {
          console.error('Failed to fetch reports:', res.status);
          setReports([]);
          return;
        }
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching daily reports:', error);
      }
    };

    fetchReports();
  }, [selectedChildId]);

  if (loading) return <div className="text-center py-8 text-secondary-500">Lädt...</div>;

  const selectedChild = children.find(c => c.id === selectedChildId);
  const childReports = reports.filter(r => r.childId === selectedChildId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Tagesberichte</h1>
        <p className="page-subtitle">Aktivitäten und Entwicklung Ihres Kindes</p>
      </div>

      {children.length > 0 ? (
        <>
          {/* Child Selector */}
          <div className="space-y-3">
            <p className="eyebrow">Kind auswählen</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {children.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center gap-3 text-left rounded-2xl border bg-white px-3 py-2.5 transition-all duration-150 ${
                    selectedChildId === child.id
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200 shadow-sm'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="avatar avatar-sm">
                    {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-secondary-900 truncate">
                    {child.firstName} {child.lastName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reports */}
          {childReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-1">Keine Tagesberichte</h3>
              <p className="text-secondary-500">Es sind noch keine Tagesberichte für {selectedChild?.firstName} verfügbar</p>
            </div>
          ) : (
            <>
              {/* KPI-Zeile */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                  <p className="stat-value">{childReports.length}</p>
                  <p className="stat-label">Berichte</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value">{childReports.reduce((sum, r) => sum + (r.meals?.length || 0), 0)}</p>
                  <p className="stat-label">Mahlzeiten</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value">{childReports.reduce((sum, r) => sum + (r.activities?.length || 0), 0)}</p>
                  <p className="stat-label">Aktivitäten</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value">{childReports.reduce((sum, r) => sum + (r.incidents?.length || 0), 0)}</p>
                  <p className="stat-label">Vorfälle</p>
                </div>
              </div>

              {/* Tages-Feed */}
              <div className="space-y-5">
                {childReports.map(report => (
                  <div key={report.id} className="card p-6 md:p-8">
                    {/* Report Date */}
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                      <span className="text-base">📅</span>
                      <h3 className="text-base font-bold text-secondary-900">
                        {new Date(report.date).toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                    </div>

                    {/* Report Content Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                      {/* Meals */}
                      {report.meals && report.meals.length > 0 && (
                        <div className="surface p-4">
                          <p className="eyebrow mb-2">🍽️ Mahlzeiten</p>
                          <ul className="text-sm text-secondary-700 space-y-1">
                            {report.meals.map((meal, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary-600 mt-0.5">•</span>
                                <span>{meal}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sleep */}
                      {report.sleepDuration && (
                        <div className="surface p-4">
                          <p className="eyebrow mb-2">😴 Schlaf</p>
                          <p className="text-sm text-secondary-700 font-semibold">
                            {report.sleepDuration} Minuten
                            {report.sleepTime && <span className="text-secondary-500"> • {report.sleepTime}</span>}
                          </p>
                        </div>
                      )}

                      {/* Hygiene */}
                      {(report.toiletVisits > 0 || report.diaperChanges > 0) && (
                        <div className="surface p-4">
                          <p className="eyebrow mb-2">🚽 Hygiene</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="chip chip-neutral">WC: {report.toiletVisits}</span>
                            <span className="chip chip-neutral">Windeln: {report.diaperChanges}</span>
                          </div>
                        </div>
                      )}

                      {/* Bottles */}
                      {report.extraBottles > 0 && (
                        <div className="surface p-4">
                          <p className="eyebrow mb-2">🍼 Flaschen</p>
                          <p className="text-sm text-secondary-700 font-semibold">
                            {report.extraBottles}
                            {report.extraBottleNotes && <span className="text-secondary-500"> • {report.extraBottleNotes}</span>}
                          </p>
                        </div>
                      )}

                      {/* Mood */}
                      {report.mood && (
                        <div className="surface p-4">
                          <p className="eyebrow mb-2">😊 Stimmung</p>
                          <span className="chip chip-primary">{report.mood}</span>
                        </div>
                      )}

                      {/* Activities */}
                      {report.activities && report.activities.length > 0 && (
                        <div className="surface p-4">
                          <p className="eyebrow mb-2">🎨 Aktivitäten</p>
                          <ul className="text-sm text-secondary-700 space-y-1">
                            {report.activities.map((activity, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary-600 mt-0.5">•</span>
                                <span>{activity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Incidents */}
                    {report.incidents && report.incidents.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                          <span className="text-base">⚠️</span> Vorfälle
                        </p>
                        <ul className="text-sm text-secondary-700 space-y-1 pl-1">
                          {report.incidents.map((incident, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-yellow-600 mt-0.5">•</span>
                              <span>{incident}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* General Notes */}
                    {report.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                          <span>📝</span> Notizen
                        </p>
                        <p className="text-sm text-secondary-700 leading-relaxed">{report.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-1">Keine Kinder zugeordnet</h3>
          <p className="text-secondary-500">Sie können hier Tagesberichte einsehen, sobald ein Kind verknüpft wurde</p>
        </div>
      )}
    </div>
  );
}
