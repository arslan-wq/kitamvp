'use client';

import { useState, useEffect } from 'react';
import ChildForm from '../../components/ChildForm';

export default function EditChildPage({ params }: { params: { id: string } }) {
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="text-center py-8">⏳ Lädt...</div>;
  }

  if (error) {
    return <div className="alert alert-error">❌ {error}</div>;
  }

  if (!child) {
    return <div className="alert alert-warning">⚠️ Kind nicht gefunden</div>;
  }

  return (
    <div className="space-y-6">
      <ChildForm
        childId={params.id}
        initialData={{
          firstName: child.firstName,
          lastName: child.lastName,
          birthDate: new Date(child.birthDate).toISOString().split('T')[0],
          locationId: child.locationId || '',
        }}
        isEditing={true}
      />
    </div>
  );
}
