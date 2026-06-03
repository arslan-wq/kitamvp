import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Aktivitäten – KitaLuna' };

const LABELS: Record<string, { name: string; icon: string }> = {
  EATING: { name: 'Essen', icon: '🍽️' }, DRINKING: { name: 'Trinken', icon: '🥤' },
  CHANGING_DIAPER: { name: 'Wickeln', icon: '🧷' }, SLEEPING: { name: 'Schlafen', icon: '😴' },
  ACTIVITY: { name: 'Beschäftigung', icon: '🎨' }, DISCUSSION: { name: 'Besprechung', icon: '💬' },
  NOTE: { name: 'Bemerkung', icon: '📝' }, HEALTH_ISSUE: { name: 'Autsch', icon: '🏥' },
  TRIP: { name: 'Ausflug', icon: '🚌' }, ABSENT: { name: 'Abwesend', icon: '❌' },
  HOLIDAY: { name: 'Ferien', icon: '🎉' }, DRAWING: { name: 'Zeichnen', icon: '🖍️' },
};

export default async function ParentActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'parent') redirect('/auth/login');

  const children = await prisma.child.findMany({
    where: { parents: { some: { id: (session.user as any).id } } },
    select: { id: true, firstName: true, lastName: true },
  });
  const childIds = children.map((c) => c.id);

  const activities = childIds.length
    ? await prisma.activity.findMany({
        where: { childId: { in: childIds } },
        orderBy: { timestamp: 'desc' },
        take: 200,
        include: { child: { select: { firstName: true, lastName: true } } },
      })
    : [];

  // nach Tag gruppieren
  const groups = new Map<string, typeof activities>();
  for (const a of activities) {
    const key = new Date(a.timestamp).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, [] as any);
    (groups.get(key) as any).push(a);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Aktivitäten</h1>
        <p className="page-subtitle">Was {children.map((c) => c.firstName).join(', ') || 'Ihr Kind'} erlebt hat</p>
      </div>

      {activities.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📊</div><p className="text-secondary-500">Noch keine Aktivitäten erfasst</p></div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, items]) => (
            <div key={day}>
              <p className="eyebrow mb-3">{day}</p>
              <div className="relative border-l-2 border-secondary-200 ml-3 pl-6 space-y-2">
                {items.map((a) => {
                  const m = LABELS[a.type] || { name: a.type, icon: '•' };
                  return (
                    <div key={a.id} className="relative">
                      <span className="absolute -left-[1.92rem] top-4 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-secondary-50" />
                      <div className="card p-3 flex items-start gap-3">
                        <span className="text-xl shrink-0">{m.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-secondary-900">{m.name} · {a.child.firstName} {a.child.lastName}</p>
                          {a.details && <p className="text-sm text-secondary-700 whitespace-pre-wrap break-words mt-0.5">{a.details}</p>}
                          {a.notes && <p className="text-xs text-secondary-500 whitespace-pre-wrap break-words mt-0.5">{a.notes}</p>}
                        </div>
                        <span className="text-xs text-secondary-400 shrink-0">{new Date(a.timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
