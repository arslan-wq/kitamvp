'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

interface Contract {
  id: string;
  childId: string;
  startDate: string;
  endDate?: string;
  monthlyRate: number;
  hoursPerWeek: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'TERMINATED';
  specialTerms?: string;
}

export default function ContractsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    monthlyRate: '',
    hoursPerWeek: '',
    specialTerms: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchData = async () => {
      try {
        const childRes = await fetch('/api/children');
        const childData = await childRes.json();
        setChildren(childData || []);
        if (childData?.length > 0) {
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

    const fetchContracts = async () => {
      try {
        const res = await fetch(`/api/children/${selectedChildId}/contracts`);
        const data = await res.json();
        setContracts(data || []);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      }
    };

    fetchContracts();
  }, [selectedChildId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId) return;

    setSubmitting(true);
    try {
      const contractData = {
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        monthlyRate: parseFloat(formData.monthlyRate) || 0,
        hoursPerWeek: parseInt(formData.hoursPerWeek) || 0,
        specialTerms: formData.specialTerms || undefined,
      };

      const res = await fetch(`/api/children/${selectedChildId}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });

      if (res.ok) {
        const newContract = await res.json();
        setContracts([...contracts, newContract]);
        setFormData({
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          monthlyRate: '',
          hoursPerWeek: '',
          specialTerms: '',
        });
        setShowForm(false);
        alert('Vertrag erstellt!');
      } else {
        alert('Fehler beim Erstellen des Vertrags');
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Fehler beim Erstellen des Vertrags');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'chip chip-success';
      case 'INACTIVE':
        return 'chip chip-neutral';
      case 'PENDING':
        return 'chip chip-warning';
      case 'TERMINATED':
        return 'chip chip-error';
      default:
        return 'chip chip-neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktiv';
      case 'INACTIVE':
        return 'Inaktiv';
      case 'PENDING':
        return 'Ausstehend';
      case 'TERMINATED':
        return 'Beendet';
      default:
        return status;
    }
  };

  if (loading) return <div className="text-center py-8 text-secondary-500">Lädt...</div>;

  const childContracts = contracts.filter(c => c.childId === selectedChildId);
  const activeCount = childContracts.filter(c => c.status === 'ACTIVE').length;
  const expiringCount = childContracts.filter(c => c.endDate && c.status === 'ACTIVE').length;
  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">📄 Verträge</h1>
          <p className="page-subtitle">Betreuungsverträge je Kind verwalten</p>
        </div>
        {children.length > 0 && !showForm && (
          <Button className="btn btn-primary shrink-0" onClick={() => setShowForm(true)}>
            + Neuer Vertrag
          </Button>
        )}
      </div>

      {children.length > 0 ? (
        <>
          <div>
            <label className="eyebrow mb-2 block">Kind auswählen</label>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="select w-full sm:w-72"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="stat-card">
              <p className="stat-value">{childContracts.length}</p>
              <p className="stat-label">Verträge gesamt</p>
            </div>
            <div className="stat-card">
              <p className="stat-value text-green-600">{activeCount}</p>
              <p className="stat-label">Aktiv</p>
            </div>
            <div className="stat-card col-span-2 lg:col-span-1">
              <p className="stat-value text-yellow-600">{expiringCount}</p>
              <p className="stat-label">Auslaufend</p>
            </div>
          </div>

          {showForm && (
            <Card title="Neuer Vertrag">
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <FormField label="Startdatum" required>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </FormField>

                  <FormField label="Enddatum">
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="input"
                    />
                  </FormField>

                  <FormField label="Monatliche Rate" required>
                    <input
                      type="number"
                      name="monthlyRate"
                      value={formData.monthlyRate}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      step="0.01"
                      required
                    />
                  </FormField>

                  <FormField label="Stunden pro Woche" required>
                    <input
                      type="number"
                      name="hoursPerWeek"
                      value={formData.hoursPerWeek}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="Besondere Bedingungen">
                  <textarea
                    name="specialTerms"
                    value={formData.specialTerms}
                    onChange={handleChange}
                    className="textarea"
                    rows={3}
                  />
                </FormField>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" loading={submitting} className="btn btn-primary px-6">
                    Vertrag erstellen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {childContracts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <p className="font-medium text-secondary-900">Keine Verträge vorhanden</p>
              <p className="page-subtitle">Lege den ersten Vertrag für dieses Kind an.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {childContracts.map(contract => (
                <div key={contract.id} className="card p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    {selectedChild && (
                      <div className="avatar avatar-md">
                        {selectedChild.firstName.charAt(0)}{selectedChild.lastName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-secondary-900 truncate">
                        {selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : 'Vertrag'}
                      </p>
                      <p className="text-sm text-secondary-500">
                        {new Date(contract.startDate).toLocaleDateString('de-DE')}
                        {contract.endDate && ` – ${new Date(contract.endDate).toLocaleDateString('de-DE')}`}
                      </p>
                    </div>
                    <span className={getStatusColor(contract.status)}>
                      {getStatusLabel(contract.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="surface px-4 py-3">
                      <p className="eyebrow">Monatliche Rate</p>
                      <p className="font-semibold text-secondary-900 mt-1">CHF {contract.monthlyRate.toFixed(2)}</p>
                    </div>
                    <div className="surface px-4 py-3">
                      <p className="eyebrow">Betreuung</p>
                      <p className="font-semibold text-secondary-900 mt-1">{contract.hoursPerWeek} h/Woche</p>
                    </div>
                  </div>

                  {contract.specialTerms && (
                    <div className="pt-1">
                      <p className="eyebrow">Besondere Bedingungen</p>
                      <p className="text-sm text-secondary-600 mt-1">{contract.specialTerms}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <p className="font-medium text-secondary-900">Keine Kinder zugeordnet</p>
          <p className="page-subtitle">Lege zuerst ein Kind an, um Verträge zu verwalten.</p>
        </div>
      )}
    </div>
  );
}
