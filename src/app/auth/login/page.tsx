'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams?.get('error') || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const userType = (session.user as any).type;
      if (userType === 'parent') {
        router.push('/daily-reports');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        // Session will be updated and useEffect will handle redirect
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kitaluna-wordmark.svg" alt="KitaLuna" className="h-12 w-auto mx-auto mb-3" />
          <p className="text-secondary-500 mt-1 text-sm">Eltern-Portal &amp; Verwaltung</p>
        </div>

        {/* Main Card */}
        <div className="card p-6 sm:p-8 mb-4">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-5">
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="label">
                Email-Adresse
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kita.ch"
                className="input"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label">
                  Passwort
                </label>
                <Link href="/auth/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                  Passwort vergessen?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block btn-lg"
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>
        </div>

        {/* Test Credentials Card */}
        <div className="surface p-4 mb-4 border border-gray-100">
          <p className="eyebrow mb-2">Test-Zugänge</p>
          <div className="space-y-1 text-xs text-secondary-600">
            <p><span className="font-semibold text-secondary-900">Admin</span> · admin@test.ch / Test123456</p>
            <p><span className="font-semibold text-secondary-900">Leitung</span> · leiter@test.ch / Test123456</p>
            <p><span className="font-semibold text-secondary-900">Betreuer</span> · betreuer@test.ch / Test123456</p>
            <p><span className="font-semibold text-secondary-900">Eltern</span> · parent@example.com / Test123456</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-secondary-400">
          © 2026 KiTA Management Software
        </p>
      </div>
    </div>
  );
}
