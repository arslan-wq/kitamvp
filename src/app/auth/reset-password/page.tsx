'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push('/auth/login?message=Passwort geändert. Bitte anmelden.'), 1800);
      } else {
        setError(data.error || 'Zurücksetzen fehlgeschlagen.');
      }
    } catch {
      setError('Zurücksetzen fehlgeschlagen.');
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
          {!token ? (
            <div className="text-center space-y-3">
              <div className="text-5xl">⚠️</div>
              <p className="text-secondary-600">Kein gültiger Reset-Link. Bitte fordern Sie einen neuen an.</p>
              <Link href="/auth/forgot-password" className="btn btn-primary btn-block">Neuen Link anfordern</Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-3">
              <div className="text-5xl">✅</div>
              <h2 className="text-xl font-semibold text-secondary-900">Passwort geändert</h2>
              <p className="text-secondary-500">Sie werden zur Anmeldung weitergeleitet…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-secondary-900 mb-1">Neues Passwort wählen</h2>
              <p className="text-secondary-500 mb-6">Geben Sie Ihr neues Passwort zweimal ein.</p>
              {error && <div className="alert alert-error mb-4">{error}</div>}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Neues Passwort</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Mind. 6 Zeichen" required />
                </div>
                <div>
                  <label className="label">Passwort bestätigen</label>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" required />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
                  {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
