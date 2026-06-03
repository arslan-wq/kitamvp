import { prisma } from '@/lib/db';
import ContactLink from '@/components/ContactLink';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
// Montag der aktuellen Woche (Server-seitig)
function currentMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Server-Komponente: zeigt Kontakt- & Notfalldaten der KiTA, Standorte und den Menüplan.
// Für ALLE Rollen sichtbar (Personal + Eltern). Mandantengescoped über kitaId.
export default async function KitaContactView({ kitaId }: { kitaId: string }) {
  const monday = currentMonday();
  const nextMonday = new Date(monday); nextMonday.setDate(nextMonday.getDate() + 7);

  const [kita, locations, mealPlan] = await Promise.all([
    prisma.kiTA.findUnique({
      where: { id: kitaId },
      select: { name: true, address: true, phone: true, email: true },
    }),
    prisma.location.findMany({
      where: { kitaId },
      select: { id: true, name: true, address: true, phone: true, email: true, emergencyPhone: true },
      orderBy: { name: 'asc' },
    }),
    prisma.mealPlan.findFirst({
      where: { kitaId, weekStart: { gte: monday, lt: nextMonday } },
      orderBy: { weekStart: 'desc' },
    }),
  ]);

  let menu: Array<{ day: string; breakfast: string; lunch: string; snack: string }> = [];
  if (mealPlan) {
    try {
      const parsed = JSON.parse(mealPlan.meals);
      menu = DAYS.map((day) => {
        const f = (Array.isArray(parsed) ? parsed.find((x: any) => x.day === day) : null) || {};
        return { day, breakfast: f.breakfast || '', lunch: f.lunch || '', snack: f.snack || '' };
      });
    } catch { menu = []; }
  }
  const hasMenu = menu.some((m) => m.breakfast || m.lunch || m.snack);

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
            {kita.address && <p><ContactLink kind="address" value={kita.address} /></p>}
            {kita.phone && <p><ContactLink kind="phone" value={kita.phone} /></p>}
            {kita.email && <p><ContactLink kind="email" value={kita.email} /></p>}
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
                {l.address && <p><ContactLink kind="address" value={l.address} /></p>}
                {l.phone && <p><ContactLink kind="phone" value={l.phone} /></p>}
                {l.email && <p><ContactLink kind="email" value={l.email} /></p>}
                {l.emergencyPhone && <p className="mt-2"><ContactLink kind="emergency" value={l.emergencyPhone} /></p>}
                {!l.address && !l.phone && !l.email && !l.emergencyPhone && (
                  <p className="text-secondary-400">Keine Kontaktdaten hinterlegt</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Menüplan – aktuelle Woche */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="eyebrow">Verpflegung</p>
            <h2 className="text-xl font-semibold text-secondary-900">🍽️ Menüplan</h2>
          </div>
          <span className="chip chip-neutral">Woche vom {monday.toLocaleDateString('de-CH')}</span>
        </div>
        {!hasMenu ? (
          <p className="text-secondary-500 text-sm">Für diese Woche ist noch kein Menüplan hinterlegt.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-secondary-400">
                  <th className="py-2 pr-3 font-semibold">Tag</th>
                  <th className="py-2 px-3 font-semibold">Frühstück</th>
                  <th className="py-2 px-3 font-semibold">Mittagessen</th>
                  <th className="py-2 px-3 font-semibold">Zvieri</th>
                </tr>
              </thead>
              <tbody>
                {menu.map((m) => (
                  <tr key={m.day} className="border-t border-secondary-100 align-top">
                    <td className="py-2 pr-3 font-semibold text-secondary-900 whitespace-nowrap">{m.day}</td>
                    <td className="py-2 px-3 text-secondary-700">{m.breakfast || '–'}</td>
                    <td className="py-2 px-3 text-secondary-700">{m.lunch || '–'}</td>
                    <td className="py-2 px-3 text-secondary-700">{m.snack || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weitere Links */}
      <div className="card p-6">
        <p className="eyebrow mb-3">Mehr über Kita Luna</p>
        <div className="flex flex-wrap gap-2">
          <a href="https://www.kitaluna.ch/#konzept" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">📖 Konzept</a>
          <a href="https://www.instagram.com/kitaluna_/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">📷 Instagram</a>
          <a href="https://www.kitaluna.ch/datenschutz/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">🔒 Datenschutz</a>
        </div>
      </div>
    </div>
  );
}
