'use client';

import { useEffect, useState } from 'react';
import { signIn, getSession } from 'next-auth/react';

export default function TestPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const sess = await getSession();
    setSession(sess);
  };

  const handleTestLogin = async () => {
    setLoading(true);
    setMessage('Testing login...');

    try {
      console.log('Attempting sign in with test credentials...');
      const result = await signIn('credentials', {
        email: 'admin@kita.ch',
        password: 'Admin123456',
        redirect: false,
      });

      console.log('Sign in result:', result);

      if (result?.error) {
        setMessage(`Login failed: ${result.error}`);
      } else if (result?.ok) {
        setMessage('Login successful! Checking session...');
        await checkSession();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Auth Test Page</h1>
          <p className="text-sm text-gray-600 mt-2">Use this to debug authentication</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <button
            onClick={handleTestLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login (admin@kita.ch / Admin123456)'}
          </button>

          {message && (
            <div className="p-4 bg-gray-100 rounded text-sm font-mono">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-bold mb-4">Current Session</h2>
          {session ? (
            <div className="text-sm space-y-2">
              <p><strong>Logged in:</strong> {session.user?.email}</p>
              <p><strong>Name:</strong> {session.user?.name}</p>
              <p><strong>Role:</strong> {session.user?.role || 'Not set'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No active session</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow text-sm space-y-2">
          <h2 className="font-bold mb-2">Debug Info</h2>
          <p>Check browser console (F12) for detailed logs</p>
          <p>Check server terminal for [NextAuth] logs</p>
          <p>
            Visit{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              /api/debug/database
            </code>{' '}
            to verify database contents
          </p>
        </div>
      </div>
    </div>
  );
}
