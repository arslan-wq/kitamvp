'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    CredentialsSignin: 'Email oder Passwort ist falsch',
    Default: 'Es gab ein Problem bei der Anmeldung',
  };

  const displayError = errorMessages[error as string] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        <div className="card p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-xl mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-secondary-900 tracking-tight">
            Authentifizierungsfehler
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            {displayError}
          </p>
          {error && (
            <div className="mt-4">
              <span className="chip chip-error font-mono">Code: {error}</span>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/auth/login"
              className="btn btn-primary btn-block btn-lg"
            >
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
