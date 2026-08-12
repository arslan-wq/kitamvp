'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
}

const ACTIVITY_TYPES = [
  { id: 'EATING', name: 'Essen', icon: '🍽️' },
  { id: 'DRINKING', name: 'Trinken', icon: '🥤' },
  { id: 'CHANGING_DIAPER', name: 'Wickeln', icon: '🧷' },
  { id: 'SLEEPING', name: 'Schlafen', icon: '😴' },
  { id: 'ACTIVITY', name: 'Beschäftigung', icon: '🎨' },
  { id: 'DISCUSSION', name: 'Besprechung', icon: '💬' },
  { id: 'NOTE', name: 'Bemerkung', icon: '📝' },
  { id: 'HEALTH_ISSUE', name: 'Autsch', icon: '🏥' },
  { id: 'TRIP', name: 'Ausflug', icon: '🚌' },
  { id: 'ABSENT', name: 'Abwesend', icon: '❌' },
  { id: 'HOLIDAY', name: 'Ferien', icon: '🎉' },
  { id: 'DRAWING', name: 'Zeichnen', icon: '🖍️' },
];

export default function ActivityLogger() {
  const { data: session } = useSession();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Only staff (Admin, KiTA-Leiter, Betreuer) may edit/delete activities — not parents
  const userRole = (session?.user as any)?.role;
  const canManage = !!userRole && userRole !== 'PARENT';

  const [formData, setFormData] = useState({
    childId: '',
    type: 'EATING',
    timestamp: new Date().toISOString().slice(0, 16), // ISO format: YYYY-MM-DDTHH:mm
    details: '',
    notes: '',
  });

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/children');
        const data = await res.json();
        setChildren(data || []);
        if (data?.length > 0) {
          setFormData(prev => ({ ...prev, childId: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching children:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.childId) {
      alert('Bitte wählen Sie ein Kind aus');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: formData.childId,
          type: formData.type,
          timestamp: new Date(formData.timestamp),
          details: formData.details || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (res.ok) {
        alert('✅ Aktivität erfolgreich protokolliert!');
        // Reset form
        setFormData({
          childId: formData.childId,
          type: 'EATING',
          timestamp: new Date().toISOString().slice(0, 16),
          details: '',
          notes: '',
        });
        setRefreshKey(k => k + 1); // Liste neu laden
      } else {
        alert('❌ Fehler beim Protokollieren der Aktivität');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('❌ Fehler beim Protokollieren der Aktivität');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Lädt Kinder...</div>;
  }

  const selectedType = ACTIVITY_TYPES.find(t => t.id === formData.type);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        {/* Kompakte Meta-Zeile: Kind + Uhrzeit nebeneinander */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 mb-6 border-b border-gray-100">
          <div>
            <label htmlFor="childId" className="label label-required">
              👶 Kind
            </label>
            <select
              id="childId"
              name="childId"
              value={formData.childId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">-- wählen --</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timestamp" className="label label-required">
              ⏰ Uhrzeit
            </label>
            <input
              id="timestamp"
              type="datetime-local"
              name="timestamp"
              value={formData.timestamp}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
        </div>

        {/* Held: Aktivitätstyp als große Kachel-Auswahl */}
        <div className="mb-6">
          <label className="label">Was ist passiert?</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {ACTIVITY_TYPES.map(activity => {
              const active = formData.type === activity.id;
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({ ...prev, type: activity.id }))
                  }
                  className={`group flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border transition-all duration-150 ${
                    active
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200 shadow-sm scale-[1.03]'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50 hover:-translate-y-0.5'
                  }`}
                >
                  <span className={`text-3xl transition-transform duration-150 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {activity.icon}
                  </span>
                  <span className={`text-xs font-medium ${active ? 'text-primary-900' : 'text-secondary-600'}`}>
                    {activity.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details + Notizen nebeneinander (begrenzte Breite) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="details" className="label">
              📝 Details <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="details"
              type="text"
              name="details"
              value={formData.details}
              onChange={handleChange}
              placeholder="z.B. 200ml Milch, 30 Min Schlaf"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="notes" className="label">
              💭 Notiz <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="notes"
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Zusätzliche Anmerkung…"
              className="input"
            />
          </div>
        </div>

        {/* Abschluss: Zusammenfassung links, prominenter Button rechts */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-secondary-500 hidden sm:block">
            {selectedType && (
              <>
                <span className="mr-1">{selectedType.icon}</span>
                <span className="font-medium text-secondary-700">{selectedType.name}</span>
                {' wird protokolliert'}
              </>
            )}
          </p>
          <button
            type="submit"
            disabled={submitting || !formData.childId}
            className="btn btn-primary btn-lg px-8 min-w-[160px] transition-colors disabled:opacity-100"
          >
            {submitting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
                Speichert…
              </>
            ) : (
              '✅ Speichern'
            )}
          </button>
        </div>
      </form>

      {/* Recent Activities */}
      <RecentActivities
        childId={formData.childId}
        child={children.find(c => c.id === formData.childId)}
        refreshKey={refreshKey}
        canManage={canManage}
      />
    </div>
  );
}

function RecentActivities({
  childId,
  child,
  refreshKey,
  canManage,
}: {
  childId: string;
  child?: Child;
  refreshKey: number;
  canManage: boolean;
}) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ type: '', timestamp: '', details: '', notes: '' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchActivities = async () => {
    if (!childId) return;
    try {
      const res = await fetch(`/api/activities?childId=${childId}`);
      const data = await res.json();
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, refreshKey]);

  const startEdit = (activity: any) => {
    setEditingId(activity.id);
    setEditData({
      type: activity.type,
      timestamp: new Date(activity.timestamp).toISOString().slice(0, 16),
      details: activity.details || '',
      notes: activity.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editData.type,
          timestamp: new Date(editData.timestamp),
          details: editData.details || null,
          notes: editData.notes || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchActivities();
      } else {
        alert('❌ Fehler beim Speichern der Änderung');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      alert('❌ Fehler beim Speichern der Änderung');
    } finally {
      setBusyId(null);
    }
  };

  const deleteActivity = async (id: string) => {
    if (!confirm('Soll diese Aktivität wirklich gelöscht werden?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchActivities();
      } else {
        alert('❌ Fehler beim Löschen der Aktivität');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('❌ Fehler beim Löschen der Aktivität');
    } finally {
      setBusyId(null);
    }
  };

  if (!childId) {
    return null;
  }

  if (loading) {
    return <div className="text-center py-8">Lädt Aktivitäten...</div>;
  }

  return (
    <div className="card p-8">
      <div className="flex items-center gap-3 mb-6">
        {child && (
          <div className="avatar avatar-md overflow-hidden">
            {child.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={child.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              `${child.firstName.charAt(0)}${child.lastName.charAt(0)}`.toUpperCase()
            )}
          </div>
        )}
        <h2 className="text-2xl font-bold text-secondary-900">
          📊 Aktivitätsprotokoll{child ? ` · ${child.firstName} ${child.lastName}` : ''}
        </h2>
      </div>

      {activities.length === 0 ? (
        <p className="text-secondary-500 text-center py-8">Noch keine Aktivitäten für dieses Kind</p>
      ) : (
        <div className="space-y-3">
          {activities.map(activity => {
            const actType = ACTIVITY_TYPES.find(t => t.id === activity.type);
            const isEditing = editingId === activity.id;
            const isBusy = busyId === activity.id;

            if (isEditing) {
              return (
                <div
                  key={activity.id}
                  className="p-4 bg-primary-50 rounded-xl border-2 border-primary-300 space-y-3"
                >
                  <div>
                    <label className="label">📋 Aktivitätstyp</label>
                    <select
                      value={editData.type}
                      onChange={e => setEditData(prev => ({ ...prev, type: e.target.value }))}
                      className="input"
                    >
                      {ACTIVITY_TYPES.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">⏰ Uhrzeit</label>
                    <input
                      type="datetime-local"
                      value={editData.timestamp}
                      onChange={e => setEditData(prev => ({ ...prev, timestamp: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">📝 Details</label>
                    <input
                      type="text"
                      value={editData.details}
                      onChange={e => setEditData(prev => ({ ...prev, details: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">💭 Notizen</label>
                    <textarea
                      value={editData.notes}
                      onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(activity.id)}
                      disabled={isBusy}
                      className="btn btn-primary min-w-[110px] transition-colors disabled:opacity-100"
                    >
                      {isBusy ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
                          Speichert...
                        </>
                      ) : (
                        '💾 Speichern'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isBusy}
                      className="btn btn-secondary"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={activity.id}
                className="group flex items-center gap-4 p-3 pr-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary-50 text-2xl shrink-0">
                  {actType?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-secondary-900">{actType?.name}</p>
                    <span className="text-xs font-medium text-secondary-500 bg-gray-100 rounded-full px-2 py-0.5">
                      {new Date(activity.timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {activity.details && (
                    <p className="text-sm text-secondary-600 mt-0.5 truncate">📝 {activity.details}</p>
                  )}
                  {activity.notes && (
                    <p className="text-sm text-secondary-500 mt-0.5 italic truncate">💭 {activity.notes}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEdit(activity)}
                      disabled={isBusy}
                      className="btn-icon text-secondary-500 hover:bg-primary-50 hover:text-primary-600"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteActivity(activity.id)}
                      disabled={isBusy}
                      className="btn-icon text-secondary-500 hover:bg-red-50 hover:text-red-600"
                      title="Löschen"
                    >
                      {isBusy ? '⏳' : '🗑️'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
