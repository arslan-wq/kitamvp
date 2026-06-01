'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

interface ExtraDay {
  id: string;
  childId: string;
  date: string;
  status: string;
  notes?: string;
}

export default function ExtraDaysPage() {
  const { status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [extraDays, setExtraDays] = useState<ExtraDay[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [newDate, setNewDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchData = async () => {
      try {
        const childRes = await fetch('/api/parent/children');
        const childData = await childRes.json();
        setChildren(childData);
        if (childData.length > 0) {
          setSelectedChildId(childData[0].id);
        }

        const extraRes = await fetch('/api/extra-days');
        const extraData = await extraRes.json();
        setExtraDays(extraData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const handleAddExtraDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !selectedChildId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/extra-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          date: new Date(newDate),
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        const newExtraDay = await res.json();
        setExtraDays([...extraDays, newExtraDay]);
        setNewDate('');
        setNotes('');
        alert('Zusatztag erfolgreich angefordert!');
      } else {
        alert('Fehler beim Hinzufügen des Zusatztags');
      }
    } catch (error) {
      console.error('Error adding extra day:', error);
      alert('Fehler beim Hinzufügen des Zusatztags');
    } finally {
      setSubmitting(false);
    }
  };

  const childExtraDays = extraDays.filter(e => e.childId === selectedChildId);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-secondary-500">
        Lädt…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">📅 Zusatztage buchen</h1>
          <p className="page-subtitle">Einzelne Betreuungstage flexibel anfragen</p>
        </div>
        {children.length > 0 && (
          <div className="w-full sm:w-auto sm:min-w-[16rem]">
            <label className="eyebrow mb-1.5 block">Kind</label>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="select"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {children.length > 0 ? (
        <>
          {/* KPI-Zeile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="stat-value">{childExtraDays.length}</p>
              <p className="stat-label">Angefragt</p>
            </div>
            <div className="stat-card">
              <p className="stat-value">
                {childExtraDays.filter(d => d.status === 'APPROVED').length}
              </p>
              <p className="stat-label">Genehmigt</p>
            </div>
            <div className="stat-card">
              <p className="stat-value">
                {childExtraDays.filter(d => d.status === 'REQUESTED').length}
              </p>
              <p className="stat-label">Offen</p>
            </div>
            <div className="stat-card">
              <p className="stat-value">
                {childExtraDays.filter(d => d.status === 'REJECTED').length}
              </p>
              <p className="stat-label">Abgelehnt</p>
            </div>
          </div>

          {/* Buchungsformular */}
          <form onSubmit={handleAddExtraDay} className="card p-6 sm:p-8 space-y-6">
            {/* Held: Betreuungs-Optionen als Auswahlkacheln */}
            <div>
              <p className="eyebrow mb-3">Betreuungsumfang</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="tile tile-active">
                  <span className="text-2xl">🌞</span>
                  <span className="text-sm font-semibold text-secondary-900">Ganztags</span>
                  <span className="text-xs text-secondary-500">mit Essen</span>
                </div>
                <div className="tile">
                  <span className="text-2xl">🌅</span>
                  <span className="text-sm font-semibold text-secondary-900">Vormittag</span>
                  <span className="text-xs text-secondary-500">mit Essen</span>
                </div>
                <div className="tile">
                  <span className="text-2xl">☕</span>
                  <span className="text-sm font-semibold text-secondary-900">Vormittag</span>
                  <span className="text-xs text-secondary-500">ohne Essen</span>
                </div>
                <div className="tile">
                  <span className="text-2xl">🌇</span>
                  <span className="text-sm font-semibold text-secondary-900">Nachmittag</span>
                  <span className="text-xs text-secondary-500">mit Essen</span>
                </div>
                <div className="tile">
                  <span className="text-2xl">🍵</span>
                  <span className="text-sm font-semibold text-secondary-900">Nachmittag</span>
                  <span className="text-xs text-secondary-500">ohne Essen</span>
                </div>
              </div>
            </div>

            {/* Datum + Notizen kompakt nebeneinander */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label label-required">Datum</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Notizen</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="textarea"
                  rows={1}
                  placeholder="Grund für den Zusatztag (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={submitting} className="btn btn-primary px-6">
                Zusatztag anfordern
              </Button>
            </div>
          </form>

          {/* Liste */}
          <div className="space-y-3">
            <p className="eyebrow">Deine Anfragen</p>
            {childExtraDays.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🗓️</div>
                <p className="text-secondary-500">Noch keine Zusatztage angefordert.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {childExtraDays.map(day => (
                  <div key={day.id} className="card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-secondary-900">
                        {new Date(day.date).toLocaleDateString('de-DE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                      {day.notes && (
                        <p className="text-sm text-secondary-500 mt-1 truncate-2">{day.notes}</p>
                      )}
                    </div>
                    <span
                      className={`chip ${
                        day.status === 'APPROVED'
                          ? 'chip-success'
                          : day.status === 'REJECTED'
                            ? 'chip-error'
                            : 'chip-warning'
                      }`}
                    >
                      {day.status === 'REQUESTED'
                        ? 'Angefordert'
                        : day.status === 'APPROVED'
                          ? 'Genehmigt'
                          : 'Abgelehnt'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <p className="text-secondary-500">Keine Kinder zugeordnet.</p>
        </div>
      )}
    </div>
  );
}
