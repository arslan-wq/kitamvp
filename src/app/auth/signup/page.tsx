'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen');
        return;
      }

      router.push('/auth/login?message=Registrierung erfolgreich. Bitte melden Sie sich an.');
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">K</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">KitaLuna</h1>
          <p className="text-secondary-500 mt-1 text-sm">Erstellen Sie Ihren kostenlosen Account</p>
        </div>

        {/* Form Card */}
        <div className="card p-6 sm:p-8 mb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert alert-error">
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email-Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="deine@email.com"
              />
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="label">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Wiederholen
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <p className="text-xs text-secondary-500 -mt-1">Mindestens 6 Zeichen</p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block btn-lg"
            >
              {isLoading ? 'Wird registriert...' : 'Kostenlos registrieren'}
            </button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-secondary-600">
                Haben Sie bereits einen Account?{' '}
                <Link href="/auth/login" className="font-semibold text-primary-600 hover:text-primary-700">
                  Melden Sie sich an
                </Link>
              </p>
            </div>
          </form>

          {/* Benefits */}
          <div className="surface p-4 mt-6 space-y-3">
            <p className="eyebrow">Mit KitaLuna erhalten Sie</p>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-secondary-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Kostenlose Testphase
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Pro-Features
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> 24/7 Support
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-secondary-400">
          Durch die Registrierung stimmen Sie unseren{' '}
          <a href="#" className="text-primary-600 hover:underline">
            Nutzungsbedingungen
          </a>{' '}
          zu
        </p>
      </div>
    </div>
  );
}
