import { prisma } from '@/lib/db';

// Server-Komponente: zeigt Kontakt- & Notfalldaten der KiTA und ihrer Standorte.
// Für ALLE Rollen sichtbar (Personal + Eltern). Mandantengescoped über kitaId.
export default async function KitaContactView({ kitaId }: { kitaId: string }) {
  const [kita, locations] = await Promise.all([
    prisma.kiTA.findUnique({
      where: { id: kitaId },
      select: { name: true, address: true, phone: true, email: true },
    }),
    prisma.location.findMany({
      where: { kitaId },
      select: { id: true, name: true, address: true, phone: true, email: true, emergencyPhone: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Kontakt</p>
        <h1 className="page-title">📞 Kita Kontakt</h1>
        <p className="page-subtitle">Adressen, Telefonnummern und Notfallkontakte</p>
      </div>

      {/* Träger / KiTA */}
      {kita && (
        <div className="card p-6">
          <p className="eyebrow mb-2">Einrichtung</p>
          <h2 className="text-xl font-semibold text-secondary-900 mb-3">{kita.name}</h2>
          <div className="space-y-1.5 text-sm">
            {kita.address && <p className="text-secondary-600">📍 {kita.address}</p>}
            {kita.phone && <p className="text-secondary-600">📞 <a href={`tel:${kita.phone}`} className="hover:text-primary-700">{kita.phone}</a></p>}
            {kita.email && <p className="text-secondary-600">✉️ <a href={`mailto:${kita.email}`} className="hover:text-primary-700">{kita.email}</a></p>}
          </div>
        </div>
      )}

      {/* Standorte */}
      {locations.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📍</div><p className="text-secondary-500">Keine Standorte hinterlegt</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((l) => (
            <div key={l.id} className="card p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-3 flex items-center gap-2">📍 {l.name}</h3>
              <div className="space-y-1.5 text-sm">
                {l.address && <p className="text-secondary-600">📍 {l.address}</p>}
                {l.phone && <p className="text-secondary-600">📞 <a href={`tel:${l.phone}`} className="hover:text-primary-700">{l.phone}</a></p>}
                {l.email && <p className="text-secondary-600 break-all">✉️ <a href={`mailto:${l.email}`} className="hover:text-primary-700">{l.email}</a></p>}
                {l.emergencyPhone && (
                  <p className="mt-2">
                    <a href={`tel:${l.emergencyPhone}`}
                      className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 font-semibold rounded-xl px-3 py-1.5 hover:bg-red-100 transition">
                      🚨 Notfall: {l.emergencyPhone}
                    </a>
                  </p>
                )}
                {!l.address && !l.phone && !l.email && !l.emergencyPhone && (
                  <p className="text-secondary-400">Keine Kontaktdaten hinterlegt</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
