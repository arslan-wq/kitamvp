'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/parent/children');
        if (!response.ok) {
          throw new Error('Failed to fetch children');
        }
        const data = await response.json();
        setChildren(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-300 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-secondary-600">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Meine Kinder</h1>
        <p className="page-subtitle">Übersicht aller registrierten Kinder</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}

      {/* KPI-Zeile */}
      {children.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="stat-value">{children.length}</p>
            <p className="stat-label">Kinder</p>
          </div>
        </div>
      )}

      {/* Children Grid */}
      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <h3 className="text-xl font-semibold text-secondary-900 mb-2">Keine Kinder verknüpft</h3>
          <p className="text-secondary-500">Sie werden benachrichtigt, wenn Ihr Kind registriert wurde</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {children.map((child) => (
            <Link key={child.id} href={`/children/${child.id}`}>
              <div className="card p-5 hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                {/* Kopf: Avatar + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="avatar avatar-md">
                    {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-secondary-900 truncate group-hover:text-primary-600 transition-colors">
                      {child.firstName} {child.lastName}
                    </h3>
                    <p className="text-sm text-secondary-500 truncate">
                      Geb. {new Date(child.birthDate).toLocaleDateString('de-CH')}
                    </p>
                  </div>
                </div>

                {/* CTA Link */}
                <div className="text-primary-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Details ansehen
                  <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
