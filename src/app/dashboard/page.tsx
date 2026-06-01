'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface StatsData {
  totalChildren: number;
  presentToday: number;
  absentToday: number;
  staffCount: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalChildren: 0,
    presentToday: 0,
    absentToday: 0,
    staffCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  const modules = [
    {
      emoji: '📋',
      title: 'Tagesbericht',
      description: 'Tägliche Aktivitäten und Berichte dokumentieren',
      href: '/dashboard/daily-reports',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      emoji: '👶',
      title: 'Kinderverwaltung',
      description: 'Vollständige Verwaltung aller Kinder und deren Daten',
      href: '/dashboard/children',
      color: 'from-pink-500 to-red-500',
    },
    {
      emoji: '🏥',
      title: 'Medizinische Informationen',
      description: 'Allergien, Impfungen und Medizinische Daten',
      href: '/dashboard/medical-records',
      color: 'from-green-500 to-emerald-500',
    },
    {
      emoji: '📅',
      title: 'Belegungsplanung',
      description: 'Anwesenheit, Zeitpläne und Kapazitätsverwaltung',
      href: '/dashboard/schedule',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      emoji: '💬',
      title: 'Nachrichten & Ankündigungen',
      description: 'Nachrichten und Mitteilungen an Eltern',
      href: '/dashboard/messaging',
      color: 'from-purple-500 to-pink-500',
    },
    {
      emoji: '📄',
      title: 'Verträge',
      description: 'Verwaltung von Verträgen und Vereinbarungen',
      href: '/dashboard/contracts',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      emoji: '📍',
      title: 'Standorte & Gruppen',
      description: 'Verwaltung von Standorten, Kindern und Personal',
      href: '/dashboard/locations',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      emoji: '💰',
      title: 'Abrechnung & Rechnungen',
      description: 'Rechnungsstellung und Zahlungsverwaltung',
      href: '/dashboard/billing',
      color: 'from-green-500 to-teal-500',
    },
    {
      emoji: '🖼️',
      title: 'Fotos & Dokumente',
      description: 'Speicherung und Verwaltung von Bildern und Dokumenten',
      href: '/dashboard/documents',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow">Übersicht</p>
          <h1 className="page-title mt-1">
            Willkommen, {session?.user?.name || 'Benutzer'}
          </h1>
          <p className="page-subtitle">
            Verwalten Sie Ihre KiTA mit professionellen Tools
          </p>
        </div>
        {loading && <span className="chip chip-neutral self-start sm:self-auto">Lädt …</span>}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-value text-primary-600">{stats.totalChildren}</p>
          <p className="stat-label">Kinder insgesamt</p>
        </div>
        <div className="stat-card">
          <p className="stat-value text-green-600">{stats.presentToday}</p>
          <p className="stat-label">Anwesend heute</p>
        </div>
        <div className="stat-card">
          <p className="stat-value text-red-600">{stats.absentToday}</p>
          <p className="stat-label">Abwesend heute</p>
        </div>
        <div className="stat-card">
          <p className="stat-value text-accent-600">{stats.staffCount}</p>
          <p className="stat-label">Betreuer</p>
        </div>
      </div>

      {/* Module Grid */}
      <div>
        <p className="eyebrow mb-3">Module</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group card p-5 flex items-start gap-4 transition-all hover:-translate-y-0.5"
            >
              <div className="avatar avatar-lg bg-primary-50 text-primary-600 text-2xl">
                {module.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-secondary-900">{module.title}</h3>
                <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{module.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                  Öffnen
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
