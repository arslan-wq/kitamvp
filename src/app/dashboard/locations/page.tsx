'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Location {
  id: string;
  name: string;
  capacity: number;
  ageGroup: string;
  staff: string[];
  users?: Array<{ id: string; name: string }>;
  children?: Array<{ id: string; firstName: string; lastName: string; photoUrl?: string | null }>;
  childrenCount?: number;
}

export default function LocationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canManage = ['ADMIN', 'KITA_LEITER'].includes((session?.user as any)?.role);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    ageGroup: '',
    staff: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/locations');
        const data = await res.json();
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchLocations();
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', capacity: '', ageGroup: '', staff: '' });
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', capacity: '', ageGroup: '', staff: '' });
    setShowForm(true);
  };

  const openEdit = (l: Location) => {
    setEditingId(l.id);
    setFormData({
      name: l.name,
      capacity: String(l.capacity ?? ''),
      ageGroup: l.ageGroup || '',
      staff: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.capacity) return;

    setSubmitting(true);
    try {
      const locationData = {
        name: formData.name,
        capacity: parseInt(formData.capacity) || 0,
        ageGroup: formData.ageGroup || 'Gemischt',
        staff: formData.staff ? formData.staff.split(',').map(s => s.trim()) : [],
      };

      const res = await fetch(
        editingId ? `/api/locations/${editingId}` : '/api/locations',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData),
        }
      );

      if (res.ok) {
        const saved = await res.json();
        setLocations(prev =>
          editingId ? prev.map(l => (l.id === editingId ? saved : l)) : [...prev, saved]
        );
        closeForm();
      } else {
        alert(editingId ? 'Fehler beim Bearbeiten des Standorts' : 'Fehler beim Erstellen des Standorts');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Fehler beim Speichern des Standorts');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLocation = async (l: Location) => {
    const count = childCountOf(l);
    const msg = count > 0
      ? `Standort "${l.name}" löschen? ${count} Kind(er) werden von diesem Standort gelöst (nicht gelöscht).`
      : `Standort "${l.name}" wirklich löschen?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/locations/${l.id}`, { method: 'DELETE' });
      if (res.ok) setLocations(prev => prev.filter(x => x.id !== l.id));
      else alert('Fehler beim Löschen des Standorts');
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Fehler beim Löschen des Standorts');
    }
  };

  const childCountOf = (l: Location) => l.children?.length ?? l.childrenCount ?? 0;
  const getOccupancyPercentage = (l: Location) =>
    l.capacity ? Math.round((childCountOf(l) / l.capacity) * 100) : 0;

  const barColor = (p: number) =>
    p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-orange-500' : p >= 60 ? 'bg-yellow-500' : 'bg-green-500';
  const badgeColor = (p: number) =>
    p >= 100 ? 'bg-red-100 text-red-700' : p >= 80 ? 'bg-orange-100 text-orange-700'
    : p >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  if (loading) return <div className="text-center py-8">Lädt…</div>;

  // Übersichtswerte
  const totalCapacity = locations.reduce((s, l) => s + (l.capacity || 0), 0);
  const totalChildren = locations.reduce((s, l) => s + childCountOf(l), 0);
  const totalStaff = locations.reduce((s, l) => s + (l.users?.length ?? 0), 0);
  const overallOccupancy = totalCapacity ? Math.round((totalChildren / totalCapacity) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Kopf: Titel + Aktion */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">📍 Standorte & Gruppen</h1>
        {!showForm && canManage && (
          <button onClick={openCreate} className="btn btn-primary">
            + Neuer Standort
          </button>
        )}
      </div>

      {/* Übersichts-Statistiken */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-3xl font-bold text-primary-600">{locations.length}</p>
          <p className="text-sm text-secondary-500 mt-1">Standorte</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-secondary-900">{totalChildren}<span className="text-lg text-secondary-400"> / {totalCapacity}</span></p>
          <p className="text-sm text-secondary-500 mt-1">Kinder zugeordnet</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-accent-600">{totalStaff}</p>
          <p className="text-sm text-secondary-500 mt-1">Personal</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-secondary-900">{overallOccupancy}%</p>
          <p className="text-sm text-secondary-500 mt-1">Auslastung gesamt</p>
        </div>
      </div>

      {/* Formular (einklappbar) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-secondary-900 mb-5">{editingId ? 'Standort bearbeiten' : 'Neuer Standort'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label label-required">Standortname</label>
              <input
                type="text" name="name" value={formData.name} onChange={handleChange}
                className="input" placeholder="z.B. Hauptgebäude – Sonnenstube" required
              />
            </div>
            <div>
              <label className="label label-required">Kapazität</label>
              <input
                type="number" name="capacity" value={formData.capacity} onChange={handleChange}
                className="input" min="1" placeholder="z.B. 15" required
              />
            </div>
            <div>
              <label className="label">Altersgruppe</label>
              <input
                type="text" name="ageGroup" value={formData.ageGroup} onChange={handleChange}
                className="input" placeholder="z.B. 2–4 Jahre"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Betreuungspersonen <span className="text-gray-400 font-normal">(komma-getrennt)</span></label>
              <input
                type="text" name="staff" value={formData.staff} onChange={handleChange}
                className="input" placeholder="z.B. Anna Müller, Peter Schmidt"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={closeForm} className="btn btn-secondary">
              Abbrechen
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary px-6">
              {submitting ? 'Wird gespeichert…' : editingId ? '💾 Änderungen speichern' : 'Standort erstellen'}
            </button>
          </div>
        </form>
      )}

      {/* Standort-Karten */}
      {locations.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📍</div>
          <p className="text-lg text-secondary-500 mb-4">Noch keine Standorte erstellt</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              + Ersten Standort anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map(location => {
            const p = getOccupancyPercentage(location);
            const count = childCountOf(location);
            return (
              <div key={location.id} className="card p-6 flex flex-col">
                {/* Kopf */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{location.name}</h3>
                    <p className="text-sm text-gray-500">{location.ageGroup}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor(p)}`}>
                      {p}%
                    </span>
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(location)} title="Bearbeiten"
                          className="btn-icon w-8 h-8 text-secondary-400 hover:bg-primary-50 hover:text-primary-600">✏️</button>
                        <button onClick={() => deleteLocation(location)} title="Löschen"
                          className="btn-icon w-8 h-8 text-secondary-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Belegung */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-gray-500">Belegung</span>
                    <span className="text-sm font-semibold text-secondary-900">{count} / {location.capacity}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all ${barColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                </div>

                {/* Kinder als Foto-Avatare */}
                {location.children && location.children.length > 0 && (
                  <div className="mb-3">
                    <p className="eyebrow mb-2">Kinder</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {location.children.slice(0, 10).map(child => (
                        <div
                          key={child.id}
                          title={`${child.firstName} ${child.lastName}`}
                          className="w-9 h-9 rounded-full overflow-hidden bg-primary-100 text-primary-700 text-[11px] font-bold flex items-center justify-center ring-2 ring-white shrink-0"
                        >
                          {child.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={child.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            `${child.firstName.charAt(0)}${child.lastName.charAt(0)}`.toUpperCase()
                          )}
                        </div>
                      ))}
                      {location.children.length > 10 && (
                        <span className="text-xs font-semibold text-secondary-500 ml-1">
                          +{location.children.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal als Chips */}
                {location.users && location.users.length > 0 && (
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Personal</p>
                    <div className="flex flex-wrap gap-1.5">
                      {location.users.map(user => (
                        <span key={user.id} className="text-xs bg-accent-50 text-accent-700 rounded-lg px-2 py-1">
                          👤 {user.name}
                        </span>
                      ))}
                    </div>
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
