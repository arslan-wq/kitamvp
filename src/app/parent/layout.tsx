import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = {
  title: 'Eltern Portal - KiTA Luna',
  description: 'Überwachen Sie die täglichen Aktivitäten Ihres Kindes',
};

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href={session ? '/parent/dashboard' : '/parent'} className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-kita-400 to-kita-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">K</span>
              </div>
              <h1 className="text-gray-900 text-2xl font-bold">KiTA Luna</h1>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>© 2025 KiTA Luna. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
