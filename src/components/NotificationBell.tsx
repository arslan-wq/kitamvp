'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  createdAt: string;
  isRead: boolean;
}

const ICONS: Record<string, string> = {
  NEW_ACTIVITY: '📊', NEW_REPORT: '📋', NEW_MESSAGE: '💬', REPLY: '💬',
  ANNOUNCEMENT: '📣', BOOKING_REQUEST: '📅', BOOKING_DECISION: '✅',
  CANCELLATION_REQUEST: '🚫', STAFF_ASSIGNMENT: '📍',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setUnread(data.unreadCount || 0);
      }
    } catch {
      /* still */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // alle 30s aktualisieren
    return () => clearInterval(t);
  }, [load]);

  // Klick ausserhalb schliesst das Dropdown
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const onClickItem = async (n: Notif) => {
    if (!n.isRead) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const unreadItems = items.filter((n) => !n.isRead);
  const readItems = items.filter((n) => n.isRead);

  const Row = ({ n }: { n: Notif }) => (
    <button
      onClick={() => onClickItem(n)}
      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary-50 transition ${n.isRead ? 'opacity-70' : ''}`}
    >
      <span className="text-lg shrink-0">{ICONS[n.type] || '🔔'}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${n.isRead ? 'text-secondary-600' : 'font-semibold text-secondary-900'}`}>{n.title}</p>
        <p className="text-xs text-secondary-500 line-clamp-2">{n.message}</p>
        <p className="text-[11px] text-secondary-400 mt-0.5">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Benachrichtigungen"
        className="relative btn-icon w-10 h-10 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-900 rounded-xl"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-[22rem] bg-white rounded-2xl shadow-elevated border border-secondary-100 z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100">
            <p className="font-semibold text-secondary-900">Benachrichtigungen</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Alle gelesen
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-secondary-400 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                Keine Benachrichtigungen
              </div>
            ) : (
              <>
                {unreadItems.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-400">Neu</p>
                    <div className="divide-y divide-secondary-50">
                      {unreadItems.map((n) => <Row key={n.id} n={n} />)}
                    </div>
                  </div>
                )}
                {readItems.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-400">Gelesen</p>
                    <div className="divide-y divide-secondary-50">
                      {readItems.map((n) => <Row key={n.id} n={n} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
