'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ChildDossier from '@/components/ChildDossier';
import ChildPhotoEditor from '@/components/ChildPhotoEditor';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  photoUrl?: string | null;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export default function ChildDetailPage() {
  const { childId } = useParams();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!childId) return;

    const fetchChild = async () => {
      try {
        const response = await fetch(`/api/children/${childId}`);
        if (!response.ok) {
          throw new Error('Kind nicht gefunden');
        }
        const data = await response.json();
        setChild(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };

    fetchChild();
  }, [childId]);

  if (loading) return <div className="text-center py-8">Lädt...</div>;
  if (error) return <div className="text-red-600 text-center py-8">{error}</div>;
  if (!child) return <div className="text-center py-8">Kind nicht gefunden</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/children" className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center gap-1 mb-4">
          ← Zurück
        </Link>
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
            <p className="page-subtitle">Geb. {new Date(child.birthDate).toLocaleDateString('de-CH')}</p>
          </div>
        </div>
      </div>

      {/* Profilfoto verwalten (Eltern) */}
      <div className="card p-6 sm:p-8">
        <p className="eyebrow mb-4">Profilfoto</p>
        <ChildPhotoEditor
          childId={child.id}
          initialPhotoUrl={child.photoUrl || null}
          initials={`${child.firstName.charAt(0)}${child.lastName.charAt(0)}`.toUpperCase()}
        />
      </div>

      {/* Komplettes Dossier des Kindes */}
      <ChildDossier child={child} activitiesBase="/api/parent/activities" />
    </div>
  );
}
