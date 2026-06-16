import Link from 'next/link';

// Selbst-Registrierung ist deaktiviert: Konten müssen mandantensauber einer
// Einrichtung + Rolle zugeordnet werden. Team-Mitglieder werden von der
// Leitung/Admin in der Benutzerverwaltung angelegt und erhalten eine
// „Passwort setzen"-E-Mail. (Siehe CLAUDE.md §3 Mandantenfähigkeit/RBAC.)
export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">K</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">KitaLuna</h1>
        </div>

        <div className="card p-6 sm:p-8 text-center space-y-4">
          <div className="text-4xl">✉️</div>
          <h2 className="text-lg font-bold text-secondary-900">Registrierung über Ihre Kita</h2>
          <p className="text-sm text-secondary-600">
            Konten werden von der Leitung Ihrer Einrichtung angelegt. Sie erhalten
            anschliessend eine E-Mail mit einem Link, um Ihr Passwort zu setzen.
          </p>
          <p className="text-sm text-secondary-600">
            Bitten Sie Ihre Kita-Leitung, Sie in der Benutzerverwaltung hinzuzufügen.
          </p>
          <div className="pt-2">
            <Link href="/auth/login" className="btn btn-primary btn-block btn-lg">
              Zur Anmeldung
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-secondary-400 mt-4">
          Passwort vergessen?{' '}
          <Link href="/auth/forgot-password" className="text-primary-600 hover:underline">
            Hier zurücksetzen
          </Link>
        </p>
      </div>
    </div>
  );
}
