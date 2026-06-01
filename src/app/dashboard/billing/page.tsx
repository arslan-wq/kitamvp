'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface BillingRecord {
  id: string;
  childId: string;
  childName: string;
  invoiceNumber: string;
  amount: number;
  period: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  description?: string;
}

export default function BillingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchBillingRecords = async () => {
      try {
        const res = await fetch('/api/billing/invoices');
        const data = await res.json();
        setBillingRecords(data || []);
      } catch (error) {
        console.error('Error fetching billing records:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchBillingRecords();
    }
  }, [status, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'chip chip-success';
      case 'PENDING':
        return 'chip chip-primary';
      case 'OVERDUE':
        return 'chip chip-error';
      case 'CANCELLED':
        return 'chip chip-neutral';
      default:
        return 'chip chip-neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Bezahlt';
      case 'PENDING':
        return 'Ausstehend';
      case 'OVERDUE':
        return 'Fällig';
      case 'CANCELLED':
        return 'Storniert';
      default:
        return status;
    }
  };

  const filteredRecords = filterStatus
    ? billingRecords.filter(r => r.status === filterStatus)
    : billingRecords;

  const summaryStats = {
    pending: billingRecords.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.amount, 0),
    overdue: billingRecords.filter(r => r.status === 'OVERDUE').reduce((sum, r) => sum + r.amount, 0),
    paid: billingRecords.filter(r => r.status === 'PAID').reduce((sum, r) => sum + r.amount, 0),
  };

  if (loading) return <div className="text-center text-secondary-500 py-16">Lädt…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">💳 Abrechnung</h1>
          <p className="page-subtitle">Rechnungen und Zahlungen im Überblick</p>
        </div>
      </div>

      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value text-primary-600">CHF {summaryStats.pending.toFixed(2)}</p>
          <p className="stat-label">Ausstehend · {billingRecords.filter(r => r.status === 'PENDING').length} Rechnungen</p>
        </div>
        <div className="stat-card">
          <p className="stat-value text-red-600">CHF {summaryStats.overdue.toFixed(2)}</p>
          <p className="stat-label">Überfällig · {billingRecords.filter(r => r.status === 'OVERDUE').length} Rechnungen</p>
        </div>
        <div className="stat-card">
          <p className="stat-value text-green-600">CHF {summaryStats.paid.toFixed(2)}</p>
          <p className="stat-label">Bezahlt · {billingRecords.filter(r => r.status === 'PAID').length} Rechnungen</p>
        </div>
      </div>

      {/* Filter */}
      <div>
        <p className="eyebrow mb-3">Nach Status filtern</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('')}
            className={
              filterStatus === ''
                ? 'btn btn-primary btn-sm'
                : 'btn btn-secondary btn-sm'
            }
          >
            Alle
          </button>
          {['PENDING', 'OVERDUE', 'PAID', 'CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={
                filterStatus === s
                  ? 'btn btn-primary btn-sm'
                  : 'btn btn-secondary btn-sm'
              }
            >
              {getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Rechnungen */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <p className="text-secondary-500">Keine Rechnungen gefunden.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Mobile: Karten */}
          <div className="divide-y divide-gray-100 lg:hidden">
            {filteredRecords.map(record => (
              <div key={record.id} className="p-4 flex items-start gap-3">
                <div className="avatar avatar-md">
                  {record.childName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-secondary-900 truncate">{record.invoiceNumber}</p>
                    <span className={getStatusColor(record.status)}>{getStatusLabel(record.status)}</span>
                  </div>
                  <p className="text-sm text-secondary-500 truncate">{record.childName} · {record.period}</p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-xs text-secondary-500">
                      Fällig: {new Date(record.dueDate).toLocaleDateString('de-DE')}
                    </span>
                    <span className="font-semibold text-secondary-900 tabular-nums">CHF {record.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Tabelle */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 eyebrow">Rechnungsnummer</th>
                  <th className="text-left py-3 px-4 eyebrow">Kind</th>
                  <th className="text-left py-3 px-4 eyebrow">Periode</th>
                  <th className="text-right py-3 px-4 eyebrow">Betrag</th>
                  <th className="text-left py-3 px-4 eyebrow">Fälligkeit</th>
                  <th className="text-left py-3 px-4 eyebrow">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-secondary-900 font-medium">{record.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="avatar avatar-sm">
                          {record.childName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-secondary-700">{record.childName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-secondary-500">{record.period}</td>
                    <td className="py-3 px-4 text-right font-semibold text-secondary-900 tabular-nums">CHF {record.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-secondary-500">
                      {new Date(record.dueDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={getStatusColor(record.status)}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
