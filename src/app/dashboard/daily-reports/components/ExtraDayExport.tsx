'use client';

import { useEffect, useState, useCallback } from 'react';

const PART_LABELS: Record<string, string> = { VORMITTAG: 'Vormittag', MITTAGESSEN: 'Mittagessen', NACHMITTAG: 'Nachmittag' };
const STATUS_LABELS: Record<string, string> = { REQUESTED: 'Angefragt', APPROVED: 'Bestätigt', REJECTED: 'Abgelehnt', CANCELLED: 'Storniert' };
const monthStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function ExtraDayExport() {
  const [month, setMonth] = useState(monthStr());
  const [rows, setRows] = useState<any[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [edRes, locRes, logRes] = await Promise.all([
      fetch(`/api/extra-days?month=${month}`),
      fetch('/api/locations'),
      fetch(`/api/export-logs?type=extra-days&month=${month}`),
    ]);
    const ed = edRes.ok ? await edRes.json() : [];
    const locs = locRes.ok ? await locRes.json() : [];
    setLocations(Object.fromEntries(locs.map((l: any) => [l.id, l.name])));
    setRows(Array.isArray(ed) ? ed : []);
    setLogs(logRes.ok ? await logRes.json() : []);
    setLoading(false);
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const locName = (id: string | null | undefined) => (id && locations[id]) || 'Ohne Standort';

  const download = async () => {
    setBusy(true);
    try {
      // nach Standort, dann Datum sortieren
      const sorted = [...rows].sort((a, b) =>
        locName(a.child?.locationId).localeCompare(locName(b.child?.locationId)) ||
        new Date(a.date).getTime() - new Date(b.date).getTime());
      const header = ['Standort', 'Kind', 'Datum', 'Tagesteile', 'Status', 'Notiz'];
      const lines = sorted.map(e => [
        locName(e.child?.locationId),
        `${e.child?.firstName || ''} ${e.child?.lastName || ''}`.trim(),
        new Date(e.date).toLocaleDateString('de-CH'),
        (Array.isArray(e.parts) ? e.parts.map((p: string) => PART_LABELS[p] || p).join(' + ') : ''),
        STATUS_LABELS[e.status] || e.status,
        (e.notes || '').replace(/[\r\n;]/g, ' '),
      ]);
      const csv = [header, ...lines].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `zusatztage-${month}.csv`; a.click();
      URL.revokeObjectURL(url);
      // Download protokollieren
      await fetch('/api/export-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'extra-days', month }) });
      await load();
    } finally { setBusy(false); }
  };

  const approvedCount = rows.filter(r => r.status === 'APPROVED').length;

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <p className="eyebrow">Abrechnung</p>
          <h2 className="text-lg font-bold text-secondary-900">⭐ Zusatztage exportieren</h2>
          <p className="text-sm text-secondary-500">Alle Zusatztage des Monats (nach Standort) als Excel/CSV.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="label">Monat</label>
            <input type="month" className="input max-w-[12rem]" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <button onClick={download} disabled={busy || rows.length === 0} className="btn btn-primary whitespace-nowrap">
            {busy ? 'Erstellt…' : '⬇️ Excel (CSV)'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-secondary-400">Laden…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="chip chip-neutral">{rows.length} Zusatztag(e) im Monat</span>
            <span className="chip chip-success">{approvedCount} bestätigt</span>
          </div>
          {rows.length === 0 && <p className="text-sm text-secondary-400">Keine Zusatztage in diesem Monat.</p>}

          {/* T14: Download-Protokoll (Abrechnungs-Kontrolle) */}
          <div className="mt-2 border-t border-secondary-100 pt-3">
            <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1.5">Heruntergeladen</p>
            {logs.length === 0 ? (
              <p className="text-sm text-secondary-400">Noch nicht heruntergeladen.</p>
            ) : (
              <ul className="space-y-1">
                {logs.map((l, i) => (
                  <li key={l.id} className="text-sm text-secondary-600">
                    {i === 0 ? '🟢' : '•'} {new Date(l.downloadedAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {i === 0 ? ' (zuletzt)' : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
