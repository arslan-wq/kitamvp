'use client';

import { useState } from 'react';
import DailyReportsTimeline from './DailyReportsTimeline';
import ExtraDayExport from './ExtraDayExport';

interface ChildLite { id: string; firstName: string; lastName: string; photoUrl?: string | null; locationId?: string | null; }
interface LocationLite { id: string; name: string; }

export default function ReportsTabs({ childrenList, locations, canExport }: { childrenList: ChildLite[]; locations: LocationLite[]; canExport: boolean }) {
  const [tab, setTab] = useState<'daily' | 'extra'>('daily');
  const tabs: { id: 'daily' | 'extra'; label: string }[] = [
    { id: 'daily', label: '📋 Tagesberichte' },
    ...(canExport ? [{ id: 'extra' as const, label: '⭐ Zusatztag-Berichte' }] : []),
  ];

  return (
    <div>
      {/* Dossier-Tabs */}
      <div className="flex gap-1 border-b border-secondary-200 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 -mb-px transition ${
              tab === t.id
                ? 'bg-white border-secondary-200 text-secondary-900'
                : 'bg-transparent border-transparent text-secondary-500 hover:text-secondary-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' ? (
        <DailyReportsTimeline childrenList={childrenList} locations={locations} />
      ) : (
        <ExtraDayExport />
      )}
    </div>
  );
}
