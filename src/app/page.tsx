'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-gradient-to-br from-kita-50 via-white to-secondary-100">
      {/* Header */}
      <header className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/kitaluna-wordmark.svg" alt="KitaLuna" className="h-9 sm:h-10 w-auto" />
          </Link>
          <nav className="flex gap-4 items-center">
            {session?.user ? (
              <>
                <span className="text-sm text-gray-600">
                  👤 {session.user.email}
                </span>
                <Link
                  href="/dashboard/daily-reports"
                  className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-6 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Anmelden
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition shadow-soft"
                >
                  Registrieren
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Moderne Verwaltung für
            <span className="block bg-gradient-to-r from-primary-500 to-kita-500 bg-clip-text text-transparent">
              Ihre Kindertagesstätte
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Verwalten Sie Kinder, Belegungen, Kommunikation und Abrechnung in einer intuitiven und modernen Plattform. Speziell für Schweizer KiTAs entwickelt.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition shadow-elevated text-lg"
            >
              Kostenlos Starten
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl border-2 border-primary-600 hover:bg-gray-50 transition text-lg"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-elevated transition">
            <div className="text-3xl mb-3">👶</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kinderverwaltung</h3>
            <p className="text-gray-600 text-sm">Vollständige Verwaltung aller Kinderdaten, medizinische Informationen und Notfallkontakte.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-elevated transition">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belegungsplanung</h3>
            <p className="text-gray-600 text-sm">Tagesplanung, Anwesenheitstracking und Kapazitätsverwaltung in Echtzeit.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-elevated transition">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Elternkommunikation</h3>
            <p className="text-gray-600 text-sm">Direkter Austausch mit Eltern, Tagesberichte und wichtige Mitteilungen.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-elevated transition">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Abrechnung</h3>
            <p className="text-gray-600 text-sm">Einfache Rechnungsstellung, Zahlungsverfolgung und finanzielle Berichte.</p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">Warum KitaLuna?</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700"><strong>Speziell für Schweiz:</strong> Erfüllt alle lokalen Anforderungen und Standards</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700"><strong>Benutzerfreundlich:</strong> Intuitive Bedienung für Betreuer und Eltern</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700"><strong>Sicher:</strong> Verschlüsselte Daten und strikte Datenschutzrichtlinien</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700"><strong>Zeit sparen:</strong> Automatisierte Prozesse und schnelle Verwaltung</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700"><strong>Überblick:</strong> Echtzeit-Dashboards und detaillierte Berichte</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700"><strong>Support:</strong> Professioneller Support auf Deutsch</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-primary-500/10 to-kita-100 rounded-2xl p-8 border border-primary-600/20">
            <div className="bg-white rounded-xl p-8 shadow-soft">
              <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Schneller Einstieg</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary-600 rounded-full text-white flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <p className="font-semibold text-gray-900">Registrieren</p>
                    <p className="text-sm text-gray-600">Erstellen Sie kostenlos einen Account</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary-600 rounded-full text-white flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <p className="font-semibold text-gray-900">Setup</p>
                    <p className="text-sm text-gray-600">Konfigurieren Sie Ihre KiTA-Daten</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary-600 rounded-full text-white flex items-center justify-center font-bold text-sm">3</div>
                  <div>
                    <p className="font-semibold text-gray-900">Verwenden</p>
                    <p className="text-sm text-gray-600">Starten Sie mit der Verwaltung</p>
                  </div>
                </div>
              </div>
              <Link
                href="/auth/signup"
                className="w-full mt-8 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition text-center"
              >
                Jetzt Registrieren
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-2xl shadow-soft p-8 mb-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary-600 mb-2">100%</p>
              <p className="text-gray-600">Verfügbarkeit</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-600 mb-2">24/7</p>
              <p className="text-gray-600">Support verfügbar</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-600 mb-2">DSGVO</p>
              <p className="text-gray-600">Konform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">KitaLuna</h4>
              <p className="text-sm">Moderne Verwaltungssoftware für Kindertagesstätten</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Navigation</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/auth/login" className="hover:text-white transition">Anmelden</Link></li>
                <li><Link href="/auth/signup" className="hover:text-white transition">Registrieren</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Kontakt</h4>
              <p className="text-sm">support@kita-pro.ch</p>
              <p className="text-sm">+41 XXXX XX XX</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2026 KitaLuna. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
