'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setDone(true);
      else setError('Etwas ist schiefgelaufen. Bitte erneut versuchen.');
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-secondary-900">KitaLuna</h1>
        </div>
        <div className="card p-6 sm:p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <h2 className="text-xl font-semibold text-secondary-900">E-Mail unterwegs</h2>
              <p className="text-secondary-500">
                Falls ein Konto mit dieser Adresse existiert, haben wir eine E-Mail mit einem Link zum Zurücksetzen gesendet. Der Link ist 1 Stunde gültig.
              </p>
              <Link href="/auth/login" className="btn btn-primary btn-block">Zurück zur Anmeldung</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-secondary-900 mb-1">Passwort vergessen?</h2>
              <p className="text-secondary-500 mb-6">Geben Sie Ihre E-Mail ein — wir senden Ihnen einen Link zum Zurücksetzen.</p>
              {error && <div className="alert alert-error mb-4">{error}</div>}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre@email.ch"
                    className="input"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
                  {loading ? 'Wird gesendet…' : 'Link senden'}
                </button>
              </form>
              <div className="text-center mt-4">
                <Link href="/auth/login" className="text-sm text-primary-600 hover:text-primary-700">← Zurück zur Anmeldung</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
