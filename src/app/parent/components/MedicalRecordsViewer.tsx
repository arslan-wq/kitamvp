'use client';

import { useEffect, useState } from 'react';

interface MedicalRecord {
  id: string;
  primaryDoctor?: string;
  primaryDoctorPhone?: string;
  primaryDoctorEmail?: string;
  primaryDoctorSpecialty?: string;
  pediatricianName?: string;
  pediatricianPhone?: string;
  pediatricianEmail?: string;
  emergencyDoctor?: string;
  emergencyDoctorPhone?: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  vaccinations: Vaccination[];
  healthHistory: HealthEntry[];
}

interface Vaccination {
  id: string;
  vaccineName: string;
  vaccineType?: string;
  vaccinationDate: string;
  nextDueDate?: string;
  givenBy?: string;
  location?: string;
  batchNumber?: string;
  notes?: string;
}

interface HealthEntry {
  id: string;
  eventType: string;
  condition: string;
  date: string;
  resolvedDate?: string;
  treatment?: string;
  doctorName?: string;
  doctorNotes?: string;
  parentNotes?: string;
  severity?: string;
  hospitalAdmitted: boolean;
  followUpNeeded: boolean;
  followUpDate?: string;
}

interface MedicalRecordsViewerProps {
  childId: string;
  childName: string;
  kitaId: string;
}

export default function MedicalRecordsViewer({ childId, childName, kitaId }: MedicalRecordsViewerProps) {
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedicalRecord = async () => {
      try {
        const response = await fetch(
          `/api/medical-records?childId=${childId}&kitaId=${kitaId}`
        );

        if (!response.ok) {
          if (response.status === 403) {
            setError('Sie haben keinen Zugriff auf diese medizinischen Informationen');
          } else {
            setError('Fehler beim Laden der medizinischen Informationen');
          }
          return;
        }

        const data = await response.json();
        setMedicalRecord(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching medical record:', err);
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };

    if (childId && kitaId) {
      fetchMedicalRecord();
    }
  }, [childId, kitaId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 h-24 rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
        ❌ {error}
      </div>
    );
  }

  if (!medicalRecord) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
        ℹ️ Noch keine medizinischen Informationen verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Doctor Information */}
      {(medicalRecord.primaryDoctor || medicalRecord.pediatricianName || medicalRecord.emergencyDoctor) && (
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">👨‍⚕️ Ärztliche Kontakte</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medicalRecord.primaryDoctor && (
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold text-gray-700">Hausarzt</p>
                <p className="text-gray-600">{medicalRecord.primaryDoctor}</p>
                {medicalRecord.primaryDoctorSpecialty && (
                  <p className="text-sm text-gray-500">{medicalRecord.primaryDoctorSpecialty}</p>
                )}
                {medicalRecord.primaryDoctorPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    📞 {medicalRecord.primaryDoctorPhone}
                  </p>
                )}
                {medicalRecord.primaryDoctorEmail && (
                  <p className="text-sm text-gray-600">
                    ✉️ {medicalRecord.primaryDoctorEmail}
                  </p>
                )}
              </div>
            )}

            {medicalRecord.pediatricianName && (
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-semibold text-gray-700">Kinderarzt</p>
                <p className="text-gray-600">{medicalRecord.pediatricianName}</p>
                {medicalRecord.pediatricianPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    📞 {medicalRecord.pediatricianPhone}
                  </p>
                )}
                {medicalRecord.pediatricianEmail && (
                  <p className="text-sm text-gray-600">
                    ✉️ {medicalRecord.pediatricianEmail}
                  </p>
                )}
              </div>
            )}

            {medicalRecord.emergencyDoctor && (
              <div className="border-l-4 border-red-500 pl-4">
                <p className="font-semibold text-gray-700">Notfallarzt</p>
                <p className="text-gray-600">{medicalRecord.emergencyDoctor}</p>
                {medicalRecord.emergencyDoctorPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    📞 {medicalRecord.emergencyDoctorPhone}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Information */}
      {(medicalRecord.bloodType || medicalRecord.height || medicalRecord.weight) && (
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">🏥 Gesundheitliche Informationen</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {medicalRecord.bloodType && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Blutgruppe</p>
                <p className="text-2xl font-bold text-gray-900">{medicalRecord.bloodType}</p>
              </div>
            )}
            {medicalRecord.height && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Größe</p>
                <p className="text-2xl font-bold text-gray-900">{medicalRecord.height} cm</p>
              </div>
            )}
            {medicalRecord.weight && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Gewicht</p>
                <p className="text-2xl font-bold text-gray-900">{medicalRecord.weight} kg</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vaccinations */}
      {medicalRecord.vaccinations && medicalRecord.vaccinations.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">💉 Impfungen</h4>

          <div className="space-y-3">
            {medicalRecord.vaccinations.map(vac => (
              <div key={vac.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{vac.vaccineName}</p>
                    {vac.vaccineType && (
                      <p className="text-sm text-gray-600">{vac.vaccineType}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(vac.vaccinationDate).toLocaleDateString('de-DE')}
                  </p>
                </div>

                {vac.nextDueDate && (
                  <p className="text-sm text-gray-600 mb-2">
                    📅 Nächste Impfung fällig: {new Date(vac.nextDueDate).toLocaleDateString('de-DE')}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {vac.givenBy && <p>Verabreicht durch: {vac.givenBy}</p>}
                  {vac.location && <p>Ort: {vac.location}</p>}
                  {vac.batchNumber && <p>Chargennummer: {vac.batchNumber}</p>}
                </div>

                {vac.notes && (
                  <p className="mt-2 p-2 bg-blue-50 text-blue-700 rounded text-sm">
                    📝 {vac.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health History */}
      {medicalRecord.healthHistory && medicalRecord.healthHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Gesundheitsverlauf</h4>

          <div className="space-y-4">
            {medicalRecord.healthHistory.map(entry => (
              <div key={entry.id} className="border-l-4 border-yellow-500 pl-4 py-2">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{entry.condition}</p>
                    <p className="text-sm text-gray-600">{entry.eventType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(entry.date).toLocaleDateString('de-DE')}
                    </p>
                    {entry.severity && (
                      <p className="text-xs text-gray-500">{entry.severity}</p>
                    )}
                  </div>
                </div>

                {entry.resolvedDate && (
                  <p className="text-sm text-green-700">
                    ✓ Gelöst am {new Date(entry.resolvedDate).toLocaleDateString('de-DE')}
                  </p>
                )}

                {entry.treatment && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Behandlung:</strong> {entry.treatment}
                  </p>
                )}

                {entry.doctorName && (
                  <p className="text-sm text-gray-700">
                    <strong>Arzt:</strong> {entry.doctorName}
                  </p>
                )}

                {entry.doctorNotes && (
                  <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                    <strong>Ärztliche Notizen:</strong> {entry.doctorNotes}
                  </p>
                )}

                {entry.parentNotes && (
                  <p className="text-sm text-gray-700 mt-2 p-2 bg-blue-50 rounded">
                    <strong>Notizen:</strong> {entry.parentNotes}
                  </p>
                )}

                {entry.hospitalAdmitted && (
                  <p className="text-sm font-medium text-red-700 mt-2">
                    🏥 Krankenhausaufenthalt erforderlich
                  </p>
                )}

                {entry.followUpNeeded && (
                  <p className="text-sm font-medium text-orange-700 mt-2">
                    ⚠️ Nachuntersuchung erforderlich
                    {entry.followUpDate && ` (${new Date(entry.followUpDate).toLocaleDateString('de-DE')})`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!medicalRecord.primaryDoctor &&
        !medicalRecord.vaccinations?.length &&
        !medicalRecord.healthHistory?.length && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
            ℹ️ Die KiTA hat noch keine detaillierten medizinischen Informationen hinzugefügt
          </div>
        )}
    </div>
  );
}
