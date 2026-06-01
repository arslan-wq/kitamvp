'use client';

import { useEffect, useState } from 'react';

interface DailyReport {
  id: string;
  date: string;
  meals: string;
  extraBottles: number;
  extraBottleNotes: string | null;
  sleepTime: string | null;
  sleepDuration: number | null;
  toiletVisits: number;
  diaperChanges: number;
  activities: string;
  mood: string | null;
  incidents: string;
  medications: string[];
  notes: string | null;
  child: {
    firstName: string;
    lastName: string;
  };
}

interface DailyReportViewerProps {
  childId: string;
  childName: string;
}

export default function DailyReportViewer({ childId, childName }: DailyReportViewerProps) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/daily-reports?childId=${childId}&startDate=${selectedDate}&endDate=${selectedDate}`);
        if (!response.ok) throw new Error('Failed to fetch daily reports');

        const data = await response.json();
        setReports(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Tagesberichte');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [childId, selectedDate]);

  const report = reports[0];

  const parseMeals = (mealsJson: string) => {
    try {
      return JSON.parse(mealsJson);
    } catch {
      return [];
    }
  };

  const parseActivities = (activitiesJson: string) => {
    try {
      return JSON.parse(activitiesJson);
    } catch {
      return [];
    }
  };

  const parseIncidents = (incidentsJson: string) => {
    try {
      return JSON.parse(incidentsJson);
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-900 mb-2">Fehler beim Laden</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2">📋 Noch kein Tagesbericht</h3>
        <p className="text-blue-700">
          Für diesen Tag gibt es noch keinen Tagesbericht. Die Betreuer werden einen hinzufügen, wenn Sie verfügbar sind.
        </p>
      </div>
    );
  }

  const meals = parseMeals(report.meals);
  const activities = parseActivities(report.activities);
  const incidents = parseIncidents(report.incidents);

  return (
    <div className="space-y-8">
      {/* Date Picker */}
      <div className="bg-white rounded-2xl shadow-soft p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">📅 Datum auswählen</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Meals */}
      <div className="bg-white rounded-2xl shadow-soft p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🍽️ Mahlzeiten</h2>
        <div className="space-y-4">
          {meals.map((meal: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">
                  {meal.type === 'breakfast' ? '🥣' : meal.type === 'lunch' ? '🍽️' : '🍎'}
                </span>
                <span className="font-semibold text-gray-900 capitalize">
                  {meal.type === 'breakfast' ? 'Frühstück' : meal.type === 'lunch' ? 'Mittagessen' : 'Snack'}
                </span>
                <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${
                  meal.consumed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {meal.consumed ? '✅ Gegessen' : '⏸️ Nicht gegessen'}
                </span>
              </div>
              {meal.notes && <p className="text-gray-700">{meal.notes}</p>}
            </div>
          ))}

          {report.extraBottles > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <p className="font-semibold text-gray-900">🍼 {report.extraBottles} extra Flasche(n)</p>
              {report.extraBottleNotes && <p className="text-gray-700 mt-1">{report.extraBottleNotes}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Sleep */}
      {(report.sleepTime || report.sleepDuration) && (
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">😴 Schlaf</h2>
          <div className="grid grid-cols-2 gap-6">
            {report.sleepTime && (
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Schlafenszeit</p>
                <p className="text-2xl font-bold text-gray-900">{report.sleepTime}</p>
              </div>
            )}
            {report.sleepDuration && (
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Schlafdauer</p>
                <p className="text-2xl font-bold text-gray-900">{report.sleepDuration} min</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toileting */}
      <div className="bg-white rounded-2xl shadow-soft p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🚽 Toilette & Wickeln</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">WC-Besuche</p>
            <p className="text-3xl font-bold text-gray-900">{report.toiletVisits}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Windelwechsel</p>
            <p className="text-3xl font-bold text-gray-900">{report.diaperChanges}</p>
          </div>
        </div>
      </div>

      {/* Activities & Mood */}
      {(activities.length > 0 || report.mood) && (
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎨 Aktivitäten & Stimmung</h2>

          {report.mood && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-gray-600">Stimmung</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {report.mood === 'Glücklich' ? '😊' : report.mood === 'Zufrieden' ? '😌' : report.mood === 'Müde' ? '😴' : '😠'} {report.mood}
              </p>
            </div>
          )}

          {activities.length > 0 && (
            <div className="space-y-3">
              {activities.map((activity: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{activity.name}</p>
                  {activity.notes && <p className="text-sm text-gray-700 mt-1">{activity.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Health & Incidents */}
      {(incidents.length > 0 || report.medications.length > 0) && (
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚕️ Gesundheit & Vorfälle</h2>

          {incidents.length > 0 && (
            <div className="space-y-4 mb-6">
              {incidents.map((incident: any, index: number) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <p className="font-semibold text-red-900 mb-2">⚠️ {incident.type}</p>
                  {incident.description && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">Beschreibung:</p>
                      <p className="text-gray-900">{incident.description}</p>
                    </div>
                  )}
                  {incident.treatment && (
                    <div>
                      <p className="text-sm text-gray-600">Behandlung:</p>
                      <p className="text-gray-900">{incident.treatment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {report.medications.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">💊 Verabreichte Medikamente</p>
              <ul className="space-y-1">
                {report.medications.map((med, index) => (
                  <li key={index} className="text-gray-900">• {med}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* General Notes */}
      {report.notes && (
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Notizen</h2>
          <p className="text-gray-700 leading-relaxed">{report.notes}</p>
        </div>
      )}
    </div>
  );
}
