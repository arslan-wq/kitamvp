'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { weekOccupancyPercent, monthlyAmount, fullMonthRate } from '@/lib/occupancy';

interface BillingRecord {
  id: string;
  childId: string;
  child?: { firstName: string; lastName: string };
  month: string;
  baseAmount: number;
  extraDays: number;
  extraDaysCost: number;
  deductions: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate?: string | null;
}

interface ChildLite {
  id: string; firstName: string; lastName: string; birthDate: string;
  location?: { name: string } | null; desiredCareDays?: any;
}

const STATUS_LABEL: Record<string, string> = { PAID: 'Bezahlt', PENDING: 'Ausstehend', OVERDUE: 'Fällig', CANCELLED: 'Storniert' };
const STATUS_CHIP: Record<string, string> = { PAID: 'chip chip-success', PENDING: 'chip chip-primary', OVERDUE: 'chip chip-error', CANCELLED: 'chip chip-neutral' };
const fmtChf = (n: number) => `CHF ${(n || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMonth = (m: string) => new Date(m).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function BillingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [children, setChildren] = useState<ChildLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ childId: '', month: thisMonth(), baseAmount: '', extraDaysCost: '', deductions: '' });

  const load = async () => {
    try {
      const [iRes, cRes] = await Promise.all([fetch('/api/billing/invoices'), fetch('/api/children')]);
      setRecords(iRes.ok ? await iRes.json() : []);
      setChildren(cRes.ok ? await cRes.json() : []);
    } catch { /* still */ } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'authenticated') load();
  }, [status, router]);

  const selectedChild = useMemo(() => children.find(c => c.id === form.childId), [children, form.childId]);
  const occPct = selectedChild ? weekOccupancyPercent(selectedChild.desiredCareDays) : 0;
  const tariff = selectedChild ? fullMonthRate(selectedChild.location?.name, selectedChild.birthDate) : null;
  const suggested = selectedChild ? monthlyAmount(occPct, selectedChild.location?.name, selectedChild.birthDate) : null;

  // Kind wählen → Basisbetrag automatisch vorschlagen (überschreibbar)
  const pickChild = (id: string) => {
    const c = children.find(x => x.id === id);
    const sug = c ? monthlyAmount(weekOccupancyPercent(c.desiredCareDays), c.location?.name, c.birthDate) : null;
    setForm(f => ({ ...f, childId: id, baseAmount: sug != null ? String(sug) : '' }));
  };

  const total = (Number(form.baseAmount) || 0) + (Number(form.extraDaysCost) || 0) - (Number(form.deductions) || 0);

  const create = async () => {
    setError('');
    if (!form.childId || !form.month || form.baseAmount === '') { setError('Bitte Kind, Monat und Basisbetrag angeben.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/billing/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: form.childId,
          month: `${form.month}-01`,
          baseAmount: Number(form.baseAmount),
          extraDaysCost: Number(form.extraDaysCost) || 0,
          deductions: Number(form.deductions) || 0,
        }),
      });
      if (res.ok) { setShowCreate(false); setForm({ childId: '', month: thisMonth(), baseAmount: '', extraDaysCost: '', deductions: '' }); await load(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || 'Rechnung konnte nicht erstellt werden.'); }
    } catch { setError('Rechnung konnte nicht erstellt werden.'); }
    finally { setCreating(false); }
  };

  const childName = (r: BillingRecord) => r.child ? `${r.child.firstName} ${r.child.lastName}` : (children.find(c => c.id === r.childId) ? `${children.find(c => c.id === r.childId)!.firstName}` : 'Kind');
  const filtered = filterStatus ? records.filter(r => r.status === filterStatus) : records;
  const sum = (st: string) => records.filter(r => r.status === st).reduce((s, r) => s + (r.totalAmount || 0), 0);

  if (loading) return <div className="text-center text-secondary-500 py-16">Lädt…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">💳 Abrechnung</h1>
          <p className="page-subtitle">Rechnungen und Zahlungen im Überblick</p>
        </div>
        <button onClick={() => { setError(''); setShowCreate(true); }} className="btn btn-primary">+ Rechnung erstellen</button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card"><p className="stat-value text-primary-600">{fmtChf(sum('PENDING'))}</p><p className="stat-label">Ausstehend · {records.filter(r => r.status === 'PENDING').length} Rechnungen</p></div>
        <div className="stat-card"><p className="stat-value text-red-600">{fmtChf(sum('OVERDUE'))}</p><p className="stat-label">Überfällig · {records.filter(r => r.status === 'OVERDUE').length} Rechnungen</p></div>
        <div className="stat-card"><p className="stat-value text-green-600">{fmtChf(sum('PAID'))}</p><p className="stat-label">Bezahlt · {records.filter(r => r.status === 'PAID').length} Rechnungen</p></div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('')} className={filterStatus === '' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>Alle</button>
        {['PENDING', 'OVERDUE', 'PAID', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={filterStatus === s ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>{STATUS_LABEL[s]}</button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🧾</div><p className="text-secondary-500">Keine Rechnungen gefunden.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 eyebrow">Kind</th>
                <th className="text-left py-3 px-4 eyebrow">Monat</th>
                <th className="text-right py-3 px-4 eyebrow">Basis</th>
                <th className="text-right py-3 px-4 eyebrow">Total</th>
                <th className="text-left py-3 px-4 eyebrow">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4"><div className="flex items-center gap-2.5">
                      <div className="avatar avatar-sm">{childName(r).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <span className="text-secondary-700">{childName(r)}</span></div></td>
                    <td className="py-3 px-4 text-secondary-500">{fmtMonth(r.month)}</td>
                    <td className="py-3 px-4 text-right text-secondary-500 tabular-nums">{fmtChf(r.baseAmount)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-secondary-900 tabular-nums">{fmtChf(r.totalAmount)}</td>
                    <td className="py-3 px-4"><span className={STATUS_CHIP[r.status]}>{STATUS_LABEL[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="divide-y divide-gray-100 lg:hidden">
            {filtered.map(r => (
              <div key={r.id} className="p-4 flex items-start gap-3">
                <div className="avatar avatar-md">{childName(r).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-secondary-900 truncate">{childName(r)}</p>
                    <span className={STATUS_CHIP[r.status]}>{STATUS_LABEL[r.status]}</span>
                  </div>
                  <p className="text-sm text-secondary-500">{fmtMonth(r.month)}</p>
                  <p className="font-semibold text-secondary-900 tabular-nums mt-1">{fmtChf(r.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rechnung erstellen */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-elevated">
            <div>
              <p className="eyebrow">Abrechnung</p>
              <h2 className="text-xl font-bold text-secondary-900">Rechnung erstellen</h2>
              <p className="page-subtitle">Basisbetrag wird aus Belegung × Tarif vorgeschlagen.</p>
            </div>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label label-required">Kind</label>
                <select className="input" value={form.childId} onChange={e => pickChild(e.target.value)}>
                  <option value="">— wählen —</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="label label-required">Monat</label>
                <input type="month" className="input" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
              </div>
            </div>

            {selectedChild && (
              <div className="surface rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-secondary-500">Belegung</p><p className="font-bold text-secondary-900">{occPct} %</p></div>
                <div><p className="text-xs text-secondary-500">Tarif 100 %</p><p className="font-bold text-secondary-900">{tariff != null ? fmtChf(tariff) : '—'}</p></div>
                <div><p className="text-xs text-secondary-500">Vorschlag</p><p className="font-bold text-primary-700">{suggested != null ? fmtChf(suggested) : '—'}</p></div>
              </div>
            )}
            {selectedChild && tariff == null && (
              <p className="text-xs text-amber-600">⚠️ Standort nicht erkannt — Tarif kann nicht berechnet werden. Bitte Standort beim Kind setzen.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label label-required">Basisbetrag (CHF)</label>
                <input type="number" step="0.05" className="input" value={form.baseAmount} onChange={e => setForm(f => ({ ...f, baseAmount: e.target.value }))} />
                {suggested != null && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, baseAmount: String(suggested) }))} className="text-xs text-primary-600 hover:underline mt-1">↻ Vorschlag übernehmen</button>
                )}
              </div>
              <div><label className="label">Zusatztage (CHF)</label><input type="number" step="0.05" className="input" value={form.extraDaysCost} onChange={e => setForm(f => ({ ...f, extraDaysCost: e.target.value }))} placeholder="0" /></div>
              <div><label className="label">Abzüge (CHF)</label><input type="number" step="0.05" className="input" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} placeholder="0" /></div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-primary-50 p-3">
              <span className="font-medium text-secondary-700">Total</span>
              <span className="text-lg font-bold text-primary-700">{fmtChf(total)}</span>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Abbrechen</button>
              <button type="button" onClick={create} disabled={creating} className="btn btn-primary px-6">{creating ? 'Erstellt…' : '🧾 Rechnung erstellen'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
