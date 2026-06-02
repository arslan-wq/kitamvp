import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ParentLandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/parent/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-kita-400 via-primary-500 to-kita-600">
      {/* Header */}
      <header className="bg-white bg-opacity-10 backdrop-blur-sm border-b border-white border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center">
                <span className="text-kita-600 text-lg font-bold">K</span>
              </div>
              <h1 className="text-white text-2xl font-bold">KiTA Luna</h1>
            </div>
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition font-semibold"
            >
              Anmelden
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            👨‍👩‍👧 Eltern Portal
          </h2>
          <p className="text-xl text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
            Bleiben Sie mit den täglichen Aktivitäten Ihres Kindes in der KiTA verbunden.
            Erhalten Sie Echtzeit-Benachrichtigungen und schauen Sie Fotos an.
          </p>
          <Link
            href="/auth/login?role=parent"
            className="inline-block px-8 py-4 bg-white text-primary-600 rounded-xl hover:bg-gray-100 transition font-bold text-lg"
          >
            👤 Als Elternteil anmelden
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-white mb-3">Live-Updates</h3>
            <p className="text-white text-opacity-80">
              Erhalten Sie sofort Benachrichtigungen, wenn Ihr Kind etwas isst, trinkt, schläft oder
              spielt.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <div className="text-5xl mb-4">🖼️</div>
            <h3 className="text-xl font-bold text-white mb-3">Fotos & Erinnerungen</h3>
            <p className="text-white text-opacity-80">
              Schauen Sie Fotos von den Aktivitäten und Erlebnissen Ihres Kindes an.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <div className="text-5xl mb-4">🗓️</div>
            <h3 className="text-xl font-bold text-white mb-3">Planung</h3>
            <p className="text-white text-opacity-80">
              Verwalten Sie Ferien, melden Sie Krankheiten und schauen Sie den Dienstplan an.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold text-white mb-3">Speiseplan</h3>
            <p className="text-white text-opacity-80">
              Sehen Sie, was Ihr Kind in dieser Woche isst und bemerken Sie Allergie-Hinweise.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-3">Kommunikation</h3>
            <p className="text-white text-opacity-80">
              Kommunizieren Sie direkt mit den Betreuern über die App.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <div className="text-5xl mb-4">🏥</div>
            <h3 className="text-xl font-bold text-white mb-3">Gesundheit</h3>
            <p className="text-white text-opacity-80">
              Erhalten Sie sofort Benachrichtigungen bei Gesundheitsproblemen oder Verletzungen.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black bg-opacity-20 border-t border-white border-opacity-20 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white text-opacity-80">
          <p>© 2025 KiTA Luna. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
