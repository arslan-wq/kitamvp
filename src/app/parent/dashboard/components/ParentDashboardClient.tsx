'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import MealPlanViewer from '../../components/MealPlanViewer';
import DailyReportViewer from '../../components/DailyReportViewer';
import MedicalRecordsViewer from '../../components/MedicalRecordsViewer';
import InboxViewer from '../../components/InboxViewer';
import NotificationSettings from './NotificationSettings';

const ACTIVITY_EMOJIS: Record<string, string> = {
  EATING: '🍽️',
  DRINKING: '🥤',
  CHANGING_DIAPER: '🧷',
  SLEEPING: '😴',
  ACTIVITY: '🎨',
  DISCUSSION: '💬',
  NOTE: '📝',
  HEALTH_ISSUE: '🏥',
  TRIP: '🚌',
  ABSENT: '❌',
  HOLIDAY: '🎉',
  DRAWING: '🖍️',
};

const ACTIVITY_LABELS: Record<string, string> = {
  EATING: 'Essen',
  DRINKING: 'Trinken',
  CHANGING_DIAPER: 'Wickeln',
  SLEEPING: 'Schlafen',
  ACTIVITY: 'Beschäftigung',
  DISCUSSION: 'Besprechung',
  NOTE: 'Bemerkung',
  HEALTH_ISSUE: 'Autsch (Fieber/Krank)',
  TRIP: 'Ausflug',
  ABSENT: 'Abwesend',
  HOLIDAY: 'Ferien',
  DRAWING: 'Zeichnen/Foto',
};

interface Activity {
  id: string;
  type: string;
  timestamp: string;
  details?: string;
  notes?: string;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  kitaId: string;
  allergies: Array<{
    allergen: string;
    severity: string;
  }>;
  activities: Activity[];
}

interface ParentDashboardClientProps {
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    children: Child[];
  };
}

export default function ParentDashboardClient({ parent }: ParentDashboardClientProps) {
  const [selectedChildId, setSelectedChildId] = useState(parent.children[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedChild = parent.children.find(c => c.id === selectedChildId);

  // Filter activities by selected date
  const todayActivities = selectedChild?.activities.filter(activity => {
    const actDate = new Date(activity.timestamp).toISOString().split('T')[0];
    return actDate === selectedDate;
  }) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Willkommen, {parent.firstName}</h1>
          <p className="page-subtitle">Übersicht der Aktivitäten Ihres Kindes</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/parent' })}
          className="btn btn-secondary"
        >
          Abmelden
        </button>
      </div>

      {/* Child Selector — als Kacheln, falls mehrere Kinder */}
      {parent.children.length > 1 && (
        <div>
          <p className="eyebrow mb-3">Kind wählen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parent.children.map(child => {
              const initials = `${child.firstName[0] ?? ''}${child.lastName[0] ?? ''}`.toUpperCase();
              const isActive = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-all duration-150 ${
                    isActive
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="avatar avatar-md">{initials}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-secondary-900 truncate">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-secondary-500">Profil ansehen</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedChild && (
        <>
          {/* Child Info Card */}
          <div className="card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="avatar avatar-lg">
                {`${selectedChild.firstName[0] ?? ''}${selectedChild.lastName[0] ?? ''}`.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-secondary-900 leading-tight">
                  {selectedChild.firstName} {selectedChild.lastName}
                </h2>
                <p className="text-sm text-secondary-500 mt-1">
                  Geburtstag: {new Date(selectedChild.birthDate).toLocaleDateString('de-CH')}
                </p>
              </div>
            </div>

            {selectedChild.allergies.length > 0 && (
              <div className="surface p-4 mt-6">
                <p className="eyebrow mb-2">Allergien</p>
                <div className="flex flex-wrap gap-2">
                  {selectedChild.allergies.map(allergy => (
                    <span key={allergy.allergen} className="chip chip-warning">
                      {allergy.allergen} · {allergy.severity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Selector */}
          <div className="card p-6">
            <label className="label">Datum</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>

          {/* Activities Timeline */}
          <div className="card p-6 sm:p-8">
            <h3 className="text-xl font-bold text-secondary-900 mb-6">
              Aktivitäten für {new Date(selectedDate).toLocaleDateString('de-CH')}
            </h3>

            {todayActivities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="page-subtitle">
                  Keine Aktivitäten für diesen Tag protokolliert.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayActivities.map(activity => {
                  const emoji = ACTIVITY_EMOJIS[activity.type] || '📋';
                  const label = ACTIVITY_LABELS[activity.type] || activity.type;
                  const time = new Date(activity.timestamp).toLocaleTimeString('de-CH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 surface border border-gray-100 hover:border-primary-300 transition-colors"
                    >
                      <div className="text-2xl flex-shrink-0">{emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-secondary-900">{label}</p>
                          <span className="chip chip-neutral">{time}</span>
                        </div>

                        {activity.details && (
                          <p className="text-sm text-secondary-700 mt-3 bg-white rounded-lg border border-gray-100 p-2">
                            <span className="font-medium">Details:</span> {activity.details}
                          </p>
                        )}

                        {activity.notes && (
                          <p className="text-sm text-secondary-700 mt-2 bg-white rounded-lg border border-gray-100 p-2 italic">
                            <span className="font-medium not-italic">Notiz:</span> {activity.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notification Settings */}
          <div className="card p-6 sm:p-8">
            <h3 className="text-xl font-bold text-secondary-900 mb-6">Benachrichtigungen</h3>
            <NotificationSettings />
          </div>

          {/* Meal Plan Viewer */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-secondary-900">Wochenplan</h3>
            <MealPlanViewer childAllergies={selectedChild.allergies} />
          </div>

          {/* Daily Report Viewer */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-secondary-900">Tagesberichte</h3>
            <DailyReportViewer
              childId={selectedChild.id}
              childName={`${selectedChild.firstName} ${selectedChild.lastName}`}
            />
          </div>

          {/* Medical Records Viewer */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-secondary-900">Medizinische Informationen</h3>
            <MedicalRecordsViewer
              childId={selectedChild.id}
              childName={`${selectedChild.firstName} ${selectedChild.lastName}`}
              kitaId={selectedChild.kitaId}
            />
          </div>

          {/* Inbox Viewer */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-secondary-900">Pinnwand & Ankündigungen</h3>
            <InboxViewer kitaId={selectedChild.kitaId} />
          </div>
        </>
      )}
    </div>
  );
}
