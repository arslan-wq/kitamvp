'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={null}>
      <CompleteProfileInner />
    </Suspense>
  );
}

function CompleteProfileInner() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleaned = name === 'phone' ? value.replace(/[^0-9+\s()-]/g, '') : value;
    setFormData((prev) => ({ ...prev, [name]: cleaned }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      setLoading(false);
      return;
    }

    try {
      // Update parent profile
      const response = await fetch('/api/parent/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Profil konnte nicht aktualisiert werden');
      }

      setSuccess('Profil erfolgreich erstellt! Sie werden angemeldet...');

      // Auto-login
      setTimeout(() => {
        signIn('credentials', {
          email,
          password: formData.password,
          redirect: true,
          callbackUrl: '/daily-reports',
        });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="avatar avatar-lg mx-auto mb-4 bg-accent-100 text-accent-700">
            <span className="text-2xl">👤</span>
          </div>
          <p className="eyebrow text-accent-600">Willkommen</p>
          <h1 className="page-title mt-1">Profil vervollständigen</h1>
          <p className="page-subtitle">Nur ein paar Angaben, dann kann es losgehen.</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-6">
              <p>{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success mb-6">
              <p>{success}</p>
            </div>
          )}

          {/* Konto */}
          <p className="eyebrow mb-3">Konto</p>
          <div className="mb-6">
            <label className="label">Email-Adresse</label>
            <input
              type="email"
              value={email ?? ''}
              disabled
              className="input bg-gray-100"
            />
            <p className="help-text">Diese Adresse ist bereits hinterlegt.</p>
          </div>

          {/* Persönliche Daten */}
          <p className="eyebrow mb-3">Persönliche Daten</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label label-required">Vorname</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="z.B. Anna"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label label-required">Nachname</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="z.B. Müller"
                className="input"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Telefon</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+41 44 123 45 67"
                className="input"
                pattern="\+?[0-9\s()-]{6,20}"
                title="Nur Ziffern, Leerzeichen, +, - und Klammern erlaubt (mind. 6 Ziffern)"
              />
            </div>
          </div>

          {/* Passwort */}
          <p className="eyebrow mb-3 mt-2">Passwort</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label label-required">Passwort</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 Zeichen"
                className="input"
                required
                minLength={8}
              />
              <p className="help-text">Mindestens 8 Zeichen.</p>
            </div>
            <div>
              <label className="label label-required">Passwort wiederholen</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Passwort bestätigen"
                className={`input ${
                  formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'input-error'
                    : ''
                }`}
                required
                minLength={8}
              />
              {formData.password &&
                formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="help-text-error">Passwörter stimmen nicht überein</p>
                )}
            </div>
          </div>

          {/* Footer / Aktion */}
          <div className="flex justify-end pt-4 border-t border-secondary-100">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6"
            >
              {loading ? 'Wird gespeichert...' : 'Profil erstellen & anmelden'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-secondary-500 mt-6">
          © 2026 KiTA Management Software
        </p>
      </div>
    </div>
  );
}
