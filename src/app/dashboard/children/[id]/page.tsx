'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ChildDossier from '@/components/ChildDossier';

export default function ChildDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchChild = async () => {
      try {
        const response = await fetch(`/api/children/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch child');
        }
        const data = await response.json();
        setChild(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchChild();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('Möchtest du dieses Kind wirklich löschen?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/children/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete child');
      }

      router.push('/dashboard/children');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <p className="text-secondary-500">Lädt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert alert-error">{error}</div>
        <Link href="/dashboard/children" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium transition">
          ← Zurück zur Liste
        </Link>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="space-y-4">
        <div className="alert alert-warning">Kind nicht gefunden</div>
        <Link href="/dashboard/children" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium transition">
          ← Zurück zur Liste
        </Link>
      </div>
    );
  }

  const header = (
    <>
      <Link href="/dashboard/children" className="inline-flex items-center gap-1 text-sm text-secondary-500 hover:text-secondary-900 font-medium transition">
        ← Zurück zur Liste
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="avatar avatar-lg overflow-hidden">
            {child.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={child.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <>{child.firstName.charAt(0)}{child.lastName.charAt(0)}</>
            )}
          </div>
          <div>
            <h1 className="page-title">
              {child.firstName} {child.lastName}
            </h1>
            <p className="page-subtitle">
              Geboren am {new Date(child.birthDate).toLocaleDateString('de-CH')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/children/${child.id}/edit`}
            className="btn btn-primary"
          >
            Bearbeiten
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-secondary"
          >
            {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Komplettes Dossier des Kindes */}
      <ChildDossier child={child} activitiesBase="/api/activities" editable={isAdmin} isStaff header={header} />
    </div>
  );
}
