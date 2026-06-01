'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only allow ADMIN role
    const user = session?.user as any;
    if (!session || user?.role !== 'ADMIN') {
      router.push('/auth/login');
    }
  }, [session, router]);

  const user = session?.user as any;
  if (user?.role !== 'ADMIN') {
    return <div className="text-center py-8">Lädt...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-2">🔐 Admin-Bereich</h1>
        <p className="text-lg opacity-90">Verwaltung der KiTA Management Software</p>
      </div>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KiTA Management */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
          <div className="text-5xl mb-4">🏢</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">KiTA-Verwaltung</h3>
          <p className="text-gray-600 mb-4">Erstellen und verwalten Sie KiTA-Einrichtungen</p>
          <Link
            href="/admin/kitas"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Öffnen →
          </Link>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Benutzer-Verwaltung</h3>
          <p className="text-gray-600 mb-4">Verwalten Sie alle Benutzer und Rollen</p>
          <Link
            href="/admin/users"
            className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Öffnen →
          </Link>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
          <div className="text-5xl mb-4">⚙️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Systemeinstellungen</h3>
          <p className="text-gray-600 mb-4">Konfigurieren Sie System-Parameter</p>
          <Link
            href="/admin/settings"
            className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Öffnen →
          </Link>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aktivitätsprotokoll</h3>
          <p className="text-gray-600 mb-4">Überwachen Sie Systemaktivitäten</p>
          <Link
            href="/admin/audit-log"
            className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Öffnen →
          </Link>
        </div>

        {/* Database */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-indigo-500">
          <div className="text-5xl mb-4">🗄️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Datenbank</h3>
          <p className="text-gray-600 mb-4">Datenbank-Management und Backups</p>
          <Link
            href="/admin/database"
            className="inline-block px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            Öffnen →
          </Link>
        </div>

        {/* Reports */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-pink-500">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Reports</h3>
          <p className="text-gray-600 mb-4">Erstellen Sie detaillierte Reports</p>
          <Link
            href="/admin/reports"
            className="inline-block px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Öffnen →
          </Link>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">System-Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Aktuelle Version</p>
            <p className="text-xl font-bold text-gray-900">1.0.0</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Admin Benutzer</p>
            <p className="text-xl font-bold text-gray-900">{user?.email}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Letztes Update</p>
            <p className="text-xl font-bold text-gray-900">{new Date().toLocaleDateString('de-DE')}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-xl font-bold text-green-600">🟢 Online</p>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="text-center">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Zurück zum Dashboard
        </Link>
      </div>
    </div>
  );
}
